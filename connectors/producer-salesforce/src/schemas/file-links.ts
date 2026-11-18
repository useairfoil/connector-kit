import * as Iceberg from "@useairfoil/connector-kit/iceberg";
import { Schema } from "effect";

import { version } from "./shared";

const text = (description: string) => Schema.String.pipe(Schema.annotateKey({ description }));
const optionalText = (description: string) =>
  Schema.NullOr(Schema.String).pipe(Schema.annotateKey({ description }));

export const FileLinkSchema = Schema.Struct({
  Id: text("Salesforce file link ID."),
  ContentDocumentId: text("File ID."),
  LinkedEntityId: text("Record, user, group, or library sharing the file."),
  ShareType: optionalText("Access granted by this link."),
  Visibility: optionalText("Visibility of this link."),
  SystemModstamp: text("Time Salesforce last changed the link."),
});

export const FileLinksSchema = Schema.Struct({
  id: text("Salesforce file ID."),
  version,
  links: Schema.Array(FileLinkSchema).pipe(
    Schema.annotateKey({ description: "All visible links for this file." }),
  ),
})
  .annotate({ description: "Record links for each Salesforce file." })
  .pipe(Iceberg.identifier("id"));
