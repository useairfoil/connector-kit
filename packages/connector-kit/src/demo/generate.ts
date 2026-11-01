import type { Faker } from "@faker-js/faker";

import { Duration, Effect, Schema, type SchemaRepresentation } from "effect";

import { ConnectorError } from "../errors";
import { checkHasRepresentation } from "../iceberg/table";

/** What one run shares: the Faker and the time the run started. */
export type DemoContext = {
  readonly faker: Faker;
  readonly now: Date;
};

/** Completes a row: keeps what it has, and fills the required fields it lacks. */
export type RowFiller = (context: DemoContext, row: object) => Record<string, unknown>;

type Representation = SchemaRepresentation.Representation;
type Value = (context: DemoContext) => unknown;

const twoYears = Duration.toMillis(Duration.days(730));

class Unsupported extends Error {}

const unsupported = (path: string, what: string): never => {
  throw new Unsupported(`${path}: ${what} is not supported in demo data`);
};

/**
 * Compiles a row schema into a filler for demo rows. It reads the same
 * representation as `compileTable`, so values fit the Iceberg types. It fills
 * only required fields the row lacks, so optional ones such as `_deleted` stay
 * out.
 */
export const compileRow = (schema: Schema.Top): Effect.Effect<RowFiller, ConnectorError> =>
  Effect.try({
    try: () => {
      const { representation, references } = Schema.toRepresentation(Schema.toType(schema));

      const resolve = (node: Representation, path: string): Representation => {
        if (node._tag !== "Reference") return node;
        const target = references[node.$ref];

        return target === undefined ? unsupported(path, `reference ${node.$ref}`) : target;
      };

      const requiredFields = (node: Representation, path: string) => {
        const resolved = resolve(node, path);

        if (resolved._tag !== "Objects" || resolved.indexSignatures.length > 0) {
          return unsupported(path, resolved._tag);
        }

        return resolved.propertySignatures
          .filter((property) => !property.isOptional)
          .map((property) => {
            const name = String(property.name);
            return [name, value(property.type, `${path}.${name}`)] as const;
          });
      };

      const object = (node: Representation, path: string): Value => {
        const fields = requiredFields(node, path);
        return (context) => Object.fromEntries(fields.map(([name, make]) => [name, make(context)]));
      };

      const value = (node: Representation, path: string): Value => {
        const resolved = resolve(node, path);

        switch (resolved._tag) {
          case "String":
            return ({ faker }) => faker.word.words({ count: { min: 1, max: 3 } });
          case "Boolean":
            return ({ faker }) => faker.datatype.boolean();
          case "BigInt":
            return ({ faker }) => BigInt(faker.number.int({ max: 100_000 }));
          case "Number":
            return checkHasRepresentation(resolved.checks, "effect/schema/isInt")
              ? ({ faker }) => faker.number.int({ max: 1000 })
              : ({ faker }) => faker.number.float({ max: 1000, fractionDigits: 2 });
          case "Literal": {
            const literal = resolved.literal;
            return () => literal;
          }
          case "Union": {
            // Fill every field, so nullable unions get their value type.
            const members = resolved.types.filter(
              (member) => member._tag !== "Null" && member._tag !== "Undefined",
            );

            const literals = members.flatMap((member) =>
              member._tag === "Literal" ? [member.literal] : [],
            );

            if (literals.length > 0 && literals.length === members.length) {
              return ({ faker }) => faker.helpers.arrayElement(literals);
            }

            const [only] = members;

            return only !== undefined && members.length === 1
              ? value(only, path)
              : unsupported(path, "a union of several types");
          }
          case "Objects":
            return object(resolved, path);
          case "Arrays": {
            const [element] = resolved.rest;

            if (resolved.elements.length > 0 || resolved.rest.length !== 1 || !element) {
              return unsupported(path, "a tuple");
            }

            const item = value(element, `${path}[]`);

            return (context) =>
              Array.from({ length: context.faker.number.int({ max: 3 }) }, () => item(context));
          }
          case "Declaration":
            return declaration(resolved, path);
          case "Suspend":
            return value(resolved.thunk, path);
          default:
            return unsupported(path, resolved._tag);
        }
      };

      const declaration = (node: SchemaRepresentation.Declaration, path: string): Value => {
        switch (node.representation?.id) {
          case "effect/schema/Date":
            return ({ faker, now }) =>
              faker.date.between({ from: now.getTime() - twoYears, to: now });
          case "effect/schema/Uint8Array":
            return ({ faker }) => Uint8Array.from({ length: 8 }, () => faker.number.int(255));
          case "effect/schema/ReadonlyMap": {
            const [keyNode, valueNode] = node.typeParameters;
            if (!keyNode || !valueNode) return unsupported(path, "a map without key or value");
            const key = value(keyNode, `${path}.key`);
            const item = value(valueNode, `${path}.value`);

            return (context) =>
              new Map(
                Array.from({ length: context.faker.number.int({ max: 3 }) }, () => [
                  key(context),
                  item(context),
                ]),
              );
          }
          default:
            return unsupported(path, node.representation?.id ?? "an unnamed declaration");
        }
      };

      const fields = requiredFields(representation, "$");

      return (context, row) => ({
        ...Object.fromEntries(
          fields.filter(([name]) => !(name in row)).map(([name, make]) => [name, make(context)]),
        ),
        ...row,
      });
    },
    catch: (cause) =>
      new ConnectorError({
        message: cause instanceof Unsupported ? cause.message : "Failed to compile demo rows",
        cause,
      }),
  });
