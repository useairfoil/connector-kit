import { Iceberg } from "@useairfoil/connector-kit";
import { Schema, Struct } from "effect";

import { Long, Timestamp, version } from "./shared";

const common = (object: string) => ({
  id: Long.pipe(Schema.annotateKey({ description: `${object} ID.` })),
  version: version(object.toLowerCase()),
  created_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was created.` }),
  ),
  updated_at: Timestamp.pipe(
    Schema.annotateKey({ description: `Time the ${object.toLowerCase()} was last updated.` }),
  ),
  html_url: Schema.String.pipe(
    Schema.annotateKey({ description: `Web address of the ${object.toLowerCase()}.` }),
  ),
});

export const ArticleSchema = Schema.Struct({
  ...common("Article"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Article title." })),
  body: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Article body, as HTML." }),
  ),
  locale: Schema.String.pipe(
    Schema.annotateKey({ description: "Locale of this version, such as en-us." }),
  ),
  source_locale: Schema.String.pipe(
    Schema.annotateKey({ description: "Locale the article was written in." }),
  ),
  section_id: Long.pipe(Schema.annotateKey({ description: "Section the article is in." })),
  author_id: Long.pipe(Schema.annotateKey({ description: "User who wrote the article." })),
  draft: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the article is a draft." }),
  ),
  promoted: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the article is promoted." }),
  ),
  position: Long.pipe(Schema.annotateKey({ description: "Position in its section." })),
  vote_sum: Long.pipe(Schema.annotateKey({ description: "Up votes minus down votes." })),
  vote_count: Long.pipe(Schema.annotateKey({ description: "Number of votes." })),
  label_names: Schema.Array(Schema.String).pipe(Schema.annotateKey({ description: "Labels." })),
  edited_at: Timestamp.pipe(Schema.annotateKey({ description: "Time the text was last edited." })),
})
  .annotate({ description: "Zendesk Help Center articles." })
  .pipe(Iceberg.identifier("id"));

export const SectionSchema = Schema.Struct({
  ...common("Section"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Section name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Section description." }),
  ),
  locale: Schema.String.pipe(Schema.annotateKey({ description: "Locale, such as en-us." })),
  category_id: Long.pipe(Schema.annotateKey({ description: "Category the section is in." })),
  parent_section_id: Schema.NullOr(Long).pipe(
    Schema.annotateKey({ description: "Parent section, if nested." }),
  ),
  position: Long.pipe(Schema.annotateKey({ description: "Position in its category." })),
})
  .annotate({ description: "Zendesk Help Center sections." })
  .pipe(Iceberg.identifier("id"));

export const CategorySchema = Schema.Struct({
  ...common("Category"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Category name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Category description." }),
  ),
  locale: Schema.String.pipe(Schema.annotateKey({ description: "Locale, such as en-us." })),
  position: Long.pipe(Schema.annotateKey({ description: "Position in the Help Center." })),
})
  .annotate({ description: "Zendesk Help Center categories." })
  .pipe(Iceberg.identifier("id"));

export const CommunityPostSchema = Schema.Struct({
  ...common("Post"),
  title: Schema.String.pipe(Schema.annotateKey({ description: "Post title." })),
  details: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Post text, as HTML." }),
  ),
  author_id: Long.pipe(Schema.annotateKey({ description: "User who wrote the post." })),
  topic_id: Long.pipe(Schema.annotateKey({ description: "Topic the post is in." })),
  status: Schema.String.pipe(
    Schema.annotateKey({ description: "none, planned, not_planned, completed, or answered." }),
  ),
  featured: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the post is featured." }),
  ),
  pinned: Schema.Boolean.pipe(Schema.annotateKey({ description: "Whether the post is pinned." })),
  closed: Schema.Boolean.pipe(
    Schema.annotateKey({ description: "Whether the post is closed for comments." }),
  ),
  vote_sum: Long.pipe(Schema.annotateKey({ description: "Up votes minus down votes." })),
  vote_count: Long.pipe(Schema.annotateKey({ description: "Number of votes." })),
  comment_count: Long.pipe(Schema.annotateKey({ description: "Number of comments." })),
  follower_count: Long.pipe(Schema.annotateKey({ description: "Number of followers." })),
})
  .annotate({ description: "Posts in the Zendesk community." })
  .pipe(Iceberg.identifier("id"));

export const CommunityTopicSchema = Schema.Struct({
  ...common("Topic"),
  name: Schema.String.pipe(Schema.annotateKey({ description: "Topic name." })),
  description: Schema.NullOr(Schema.String).pipe(
    Schema.annotateKey({ description: "Topic description." }),
  ),
  position: Long.pipe(Schema.annotateKey({ description: "Position in the community." })),
  follower_count: Long.pipe(Schema.annotateKey({ description: "Number of followers." })),
})
  .annotate({ description: "Topics in the Zendesk community." })
  .pipe(Iceberg.identifier("id"));

export type Article = Schema.Schema.Type<typeof ArticleSchema>;
export type Section = Schema.Schema.Type<typeof SectionSchema>;
export type Category = Schema.Schema.Type<typeof CategorySchema>;
export type CommunityPost = Schema.Schema.Type<typeof CommunityPostSchema>;
export type CommunityTopic = Schema.Schema.Type<typeof CommunityTopicSchema>;

const objectOf = <F extends Schema.Struct.Fields>(schema: Schema.Struct<F>) =>
  schema.mapFields((fields) => Struct.omit(fields, ["version"]));

export const ArticleObjectSchema = objectOf(ArticleSchema);
export const SectionObjectSchema = objectOf(SectionSchema);
export const CategoryObjectSchema = objectOf(CategorySchema);
export const CommunityPostObjectSchema = objectOf(CommunityPostSchema);
export const CommunityTopicObjectSchema = objectOf(CommunityTopicSchema);
