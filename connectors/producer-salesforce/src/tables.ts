import type { Schema } from "effect";

import { objects } from "./manifest";
import { FileLinksSchema } from "./objects/file-links";
import { KnowledgeVersionSchema } from "./objects/knowledge";
import { ObjectFieldSchema } from "./schemas/object-fields";
import { CustomObjectSchema, objectSchema } from "./schemas/objects";

export const tableSchemas: Readonly<Record<string, Schema.Top>> = {
  ...Object.fromEntries(objects.map((spec) => [spec.name, objectSchema(spec.object)])),
  custom_objects: CustomObjectSchema,
  object_fields: ObjectFieldSchema,
  content_document_links: FileLinksSchema,
  knowledge_article_versions: KnowledgeVersionSchema,
};
