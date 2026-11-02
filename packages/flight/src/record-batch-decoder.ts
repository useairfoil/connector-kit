/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

// Licensed to the Apache Software Foundation (ASF) under one or mor e
// contributor license agreements. See the NOTICE file distributed with this
// work for additional information regarding copyright ownership. The ASF
// licenses this file to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

// Originally from the arrow-js repository.
// https://github.com/apache/arrow-js/blob/e656bcc0423f8c315ec3a66743aa96375eed1e82/src/ipc/reader.ts
//
// Changes:
//
// - Add `RecordBatchStreamReaderFromFlightData` to decode `RecordBatch` from a
// stream of `FlightData` messages.
import {
  type Codec,
  compressionRegistry,
  type Data,
  type DataType,
  type Field,
  Message,
  MessageHeader,
  makeData,
  RecordBatch,
  type Schema,
  Struct,
  type TypeMap,
  Vector,
} from "apache-arrow";
import { ITERATOR_DONE } from "apache-arrow/io/interfaces";
import {
  COMPRESS_LENGTH_PREFIX,
  LENGTH_NO_COMPRESSED_DATA,
} from "apache-arrow/ipc/compression/constants";
import * as metadata from "apache-arrow/ipc/metadata/message";
import { _InternalEmptyPlaceholderRecordBatch } from "apache-arrow/recordbatch";
import { bigIntToNumber } from "apache-arrow/util/bigint";
import { CompressedVectorLoader, VectorLoader } from "apache-arrow/visitor/vectorloader";
import * as flatbuffers from "flatbuffers";

import type { FlightData } from "./proto/Flight";
import type { RecordBatchWithMetadata } from "./record-batch-with-metadata";

const invalidMessageType = (type: MessageHeader) =>
  `Expected ${MessageHeader[type]} Message in stream, but was null or length 0.`;
// const nullMessage = (type: MessageHeader) =>
//   `Header pointer of flatbuffer-encoded ${MessageHeader[type]} Message is null or length 0.`;
// const invalidMessageMetadata = (expected: number, actual: number) =>
//   `Expected to read ${expected} metadata bytes, but only read ${actual}.`;
// const invalidMessageBodyLength = (expected: number, actual: number) =>
//   `Expected to read ${expected} bytes for message body, but only read ${actual}.`;

abstract class RecordBatchReaderImpl<T extends TypeMap = any> implements RecordBatchReaderImpl<T> {
  declare public schema: Schema<T>;
  public closed = false;
  public autoDestroy = true;
  public dictionaries: Map<number, Vector>;

  protected _dictionaryIndex = 0;
  protected _recordBatchIndex = 0;
  public get numDictionaries() {
    return this._dictionaryIndex;
  }
  public get numRecordBatches() {
    return this._recordBatchIndex;
  }

  constructor(dictionaries = new Map<number, Vector>()) {
    this.dictionaries = dictionaries;
  }

  /*
  public isSync(): this is RecordBatchReaders<T> {
    return false;
  }
  public isAsync(): this is AsyncRecordBatchReaders<T> {
    return false;
  }
  public isFile(): this is RecordBatchFileReaders<T> {
    return false;
  }
  public isStream(): this is RecordBatchStreamReaders<T> {
    return false;
  }
  */

  public reset(schema?: Schema<T> | null) {
    this._dictionaryIndex = 0;
    this._recordBatchIndex = 0;
    this.schema = <any>schema;
    this.dictionaries = new Map();
    return this;
  }

  protected _loadRecordBatch(header: metadata.RecordBatch, body: Uint8Array): RecordBatch<T> {
    // Ensure the body buffer is properly aligned for Apache Arrow
    // Apache Arrow requires 8-byte aligned buffers for typed arrays
    const alignedBody = this._ensureAlignedBuffer(body);

    let children: Data<any>[];
    if (header.compression != null) {
      const codec = compressionRegistry.get(header.compression.type);
      if (codec?.decode && typeof codec.decode === "function") {
        const { decommpressedBody, buffers } = this._decompressBuffers(header, alignedBody, codec);
        children = this._loadCompressedVectors(header, decommpressedBody, this.schema.fields);
        header = new metadata.RecordBatch(header.length, header.nodes, buffers, null);
      } else {
        throw new Error("Record batch is compressed but codec not found");
      }
    } else {
      children = this._loadVectors(header, alignedBody, this.schema.fields);
    }

    const data = makeData({
      type: new Struct(this.schema.fields),
      length: header.length,
      children,
    });
    return new RecordBatch(this.schema, data);
  }

  /**
   * Ensures that a buffer is properly aligned for Apache Arrow's requirements.
   * Apache Arrow needs 8-byte aligned buffers for typed array views.
   */
  private _ensureAlignedBuffer(buffer: Uint8Array): Uint8Array {
    // If the buffer's byteOffset is already properly aligned (multiple of 8), return as is
    if (buffer.byteOffset % 8 === 0) {
      return buffer;
    }

    // Otherwise, create a new properly aligned buffer
    const alignedBuffer = new Uint8Array(buffer.length);
    alignedBuffer.set(buffer);
    return alignedBuffer;
  }

  protected _loadDictionaryBatch(header: metadata.DictionaryBatch, body: Uint8Array) {
    const { id, isDelta } = header;
    const { dictionaries, schema } = this;
    const dictionary = dictionaries.get(id);
    const type = schema.dictionaries.get(id)!;
    let data: Data<any>[];
    if (header.data.compression != null) {
      const codec = compressionRegistry.get(header.data.compression.type);
      if (codec?.decode && typeof codec.decode === "function") {
        const { decommpressedBody, buffers } = this._decompressBuffers(header.data, body, codec);
        data = this._loadCompressedVectors(header.data, decommpressedBody, [type]);
        header = new metadata.DictionaryBatch(
          new metadata.RecordBatch(header.data.length, header.data.nodes, buffers, null),
          id,
          isDelta,
        );
      } else {
        throw new Error("Dictionary batch is compressed but codec not found");
      }
    } else {
      data = this._loadVectors(header.data, body, [type]);
    }
    // const data = this._loadVectors(header.data, body, [type]);
    return (
      dictionary && isDelta ? dictionary.concat(new Vector(data)) : new Vector(data)
    ).memoize() as Vector;
  }

  protected _loadVectors(
    header: metadata.RecordBatch,
    body: Uint8Array,
    types: (Field | DataType)[],
  ) {
    return new VectorLoader(
      body,
      header.nodes,
      header.buffers,
      this.dictionaries,
      this.schema.metadataVersion,
    ).visitMany(types);
  }

  protected _loadCompressedVectors(
    header: metadata.RecordBatch,
    body: Uint8Array[],
    types: (Field | DataType)[],
  ) {
    return new CompressedVectorLoader(
      body,
      header.nodes,
      header.buffers,
      this.dictionaries,
      this.schema.metadataVersion,
    ).visitMany(types);
  }

  private _decompressBuffers(
    header: metadata.RecordBatch,
    body: Uint8Array,
    codec: Codec,
  ): { decommpressedBody: Uint8Array[]; buffers: metadata.BufferRegion[] } {
    const decompressedBuffers: Uint8Array[] = [];
    const newBufferRegions: metadata.BufferRegion[] = [];

    let currentOffset = 0;
    for (const { offset, length } of header.buffers) {
      if (length === 0) {
        decompressedBuffers.push(new Uint8Array(0));
        newBufferRegions.push(new metadata.BufferRegion(currentOffset, 0));
        continue;
      }
      const byteBuf = new flatbuffers.ByteBuffer(body.subarray(offset, offset + length));
      const uncompressedLenth = bigIntToNumber(byteBuf.readInt64(0));

      const bytes = byteBuf.bytes().subarray(COMPRESS_LENGTH_PREFIX);

      const decompressed =
        uncompressedLenth === LENGTH_NO_COMPRESSED_DATA ? bytes : codec.decode!(bytes);

      decompressedBuffers.push(decompressed);

      const padding = ((currentOffset + 7) & ~7) - currentOffset;
      currentOffset += padding;
      newBufferRegions.push(new metadata.BufferRegion(currentOffset, decompressed.length));
      currentOffset += decompressed.length;
    }

    return {
      decommpressedBody: decompressedBuffers,
      buffers: newBufferRegions,
    };
  }
}

export class RecordBatchStreamReaderFromFlightData<T extends TypeMap = any>
  extends RecordBatchReaderImpl<T>
  implements AsyncIterableIterator<RecordBatchWithMetadata<T>>
{
  protected _reader: AsyncIterator<FlightData>;

  constructor(
    protected _source: AsyncIterable<FlightData>,
    dictionaries?: Map<number, Vector>,
  ) {
    super(dictionaries);

    this._reader = this._source[Symbol.asyncIterator]();
  }

  // public isAsync(): this is AsyncRecordBatchReaders<T> {
  //   return true;
  // }

  // public isStream(): this is RecordBatchStreamReaders<T> {
  //   return true;
  // }

  public [Symbol.asyncIterator](): AsyncIterableIterator<RecordBatchWithMetadata<T>> {
    return this as AsyncIterableIterator<RecordBatchWithMetadata<T>>;
  }

  public async return(): Promise<IteratorResult<RecordBatchWithMetadata<T>>> {
    if (!this.closed && this.autoDestroy) {
      this.closed = true;
      this.reset();
      await this._reader.return?.();
    }
    return ITERATOR_DONE;
  }

  public async next() {
    if (this.closed) {
      return ITERATOR_DONE;
    }

    while (true) {
      const maybeMessage = await this._readNextMessageAndValidate();
      if (!maybeMessage) {
        break;
      }

      const { message, flight } = maybeMessage;

      if (message.isSchema()) {
        this.reset(message.header());
      } else if (message.isRecordBatch()) {
        this._recordBatchIndex++;
        const header = message.header();
        const recordBatch = this._loadRecordBatch(header, flight.dataBody);
        return {
          done: false,
          value: {
            batch: recordBatch,
            appMetadata: flight.appMetadata,
          },
        };
      } else if (message.isDictionaryBatch()) {
        this._dictionaryIndex++;
        const header = message.header();
        const vector = this._loadDictionaryBatch(header, flight.dataBody);
        this.dictionaries.set(header.id, vector);
      }
    }

    if (this.schema && this._recordBatchIndex === 0) {
      this._recordBatchIndex++;
      return {
        done: false,
        value: {
          batch: new _InternalEmptyPlaceholderRecordBatch<T>(this.schema),
          appMetadata: new Uint8Array(0),
        },
      };
    }

    return this.return();
  }

  protected async _readNextMessageAndValidate<T extends MessageHeader>(type?: T | null) {
    const { done, value } = await this._reader.next();
    if (done) {
      return null;
    }

    const message = Message.decode(value.dataHeader);
    if (type != null && message.headerType !== type) {
      throw new Error(invalidMessageType(type));
    }

    return { message, flight: value };
  }
}
