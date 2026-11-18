import { Resource } from "@useairfoil/connector-kit";
import { Duration, Effect, Schema, SchemaTransformation, Struct } from "effect";

import type { ZendeskClientService } from "../client/client";

import {
  ArticleObjectSchema,
  ArticleSchema,
  ArticleTranslationObjectSchema,
  ArticleTranslationSchema,
  CategoryObjectSchema,
  CategorySchema,
  CommunityCommentObjectSchema,
  CommunityCommentSchema,
  CommunityPostObjectSchema,
  CommunityPostSchema,
  CommunityTopicObjectSchema,
  CommunityTopicSchema,
  SectionObjectSchema,
  SectionSchema,
} from "../schemas/help-center";
import { Long } from "../schemas/shared";
import { timeExport } from "./exports";
import { listAll, listSources, readPage } from "./pages";

const ArticlePage = {
  articles: Schema.Array(ArticleObjectSchema),
  end_time: Schema.NullOr(Schema.Number),
};

// This export has no `end_of_stream`, so the last page is the one with no
// `next_page`. An empty page says `end_time` is 1, so we drop it and keep the
// start time.
const ArticlePageSchema = Schema.Struct({
  ...ArticlePage,
  next_page: Schema.NullOr(Schema.String),
}).pipe(
  Schema.decodeTo(
    Schema.toType(Schema.Struct({ ...ArticlePage, end_of_stream: Schema.Boolean })),
    SchemaTransformation.transform({
      decode: ({ next_page, ...page }) => ({
        ...page,
        end_time: page.articles.length === 0 ? null : page.end_time,
        end_of_stream: next_page === null,
      }),
      encode: (page) => ({ ...Struct.omit(page, ["end_of_stream"]), next_page: null }),
    }),
  ),
);

export const makeArticles = (client: ZendeskClientService) =>
  Resource.entity({
    name: "articles",
    rowSchema: ArticleSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/help_center/incremental/articles",
      schema: ArticlePageSchema,
      rows: (page) =>
        Effect.succeed(
          page.articles.map((article) => ({ ...article, version: article.updated_at })),
        ),
    }),
  });

export const makeArticleTranslations = (client: ZendeskClientService) =>
  Resource.entity({
    name: "article_translations",
    rowSchema: ArticleTranslationSchema,
    version: "version",
    ...timeExport({
      client,
      path: "/help_center/incremental/articles",
      schema: ArticlePageSchema,
      rows: (page) =>
        Effect.forEach(page.articles, (article) =>
          listAll(client, {
            path: `/help_center/articles/${article.id}/translations`,
            key: "translations",
            item: ArticleTranslationObjectSchema,
            // Articles deleted since the export have no translations.
            emptyIfMissing: true,
          }),
        ).pipe(
          Effect.map((translations) =>
            translations
              .flat()
              .map((translation) => ({ ...translation, version: translation.updated_at })),
          ),
        ),
    }),
  });

export const makeSections = (client: ZendeskClientService) =>
  Resource.entity({
    name: "sections",
    rowSchema: SectionSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/help_center/sections",
        key: "sections",
        item: SectionObjectSchema,
      }).pipe(
        Effect.map((sections) =>
          sections.map((section) => ({ ...section, version: section.updated_at })),
        ),
      ),
    ),
  });

export const makeCategories = (client: ZendeskClientService) =>
  Resource.entity({
    name: "categories",
    rowSchema: CategorySchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/help_center/categories",
        key: "categories",
        item: CategoryObjectSchema,
      }).pipe(
        Effect.map((categories) =>
          categories.map((category) => ({ ...category, version: category.updated_at })),
        ),
      ),
    ),
  });

export const makeCommunityPosts = (client: ZendeskClientService) =>
  Resource.entity({
    name: "community_posts",
    rowSchema: CommunityPostSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/community/posts",
        key: "posts",
        item: CommunityPostObjectSchema,
      }).pipe(Effect.map((posts) => posts.map((post) => ({ ...post, version: post.updated_at })))),
    ),
  });

export const makeCommunityTopics = (client: ZendeskClientService) =>
  Resource.entity({
    name: "community_topics",
    rowSchema: CommunityTopicSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/community/topics",
        key: "topics",
        item: CommunityTopicObjectSchema,
      }).pipe(
        Effect.map((topics) => topics.map((topic) => ({ ...topic, version: topic.updated_at }))),
      ),
    ),
  });

// Comments have no export, so every post's comments are read each day.
export const makeCommunityComments = (client: ZendeskClientService) =>
  Resource.entity({
    name: "community_comments",
    rowSchema: CommunityCommentSchema,
    version: "version",
    ...listSources(
      listAll(client, {
        path: "/community/posts",
        key: "posts",
        item: Schema.Struct({ id: Long }),
      }).pipe(
        Effect.flatMap((posts) =>
          Effect.forEach(posts, ({ id }) =>
            listAll(client, {
              path: `/community/posts/${id}/comments`,
              key: "comments",
              item: CommunityCommentObjectSchema,
              emptyIfMissing: true,
            }),
          ),
        ),
        Effect.map((comments) =>
          comments.flat().map((comment) => ({ ...comment, version: comment.updated_at })),
        ),
      ),
      Duration.days(1),
    ),
    check: readPage(client, {
      path: "/community/posts",
      key: "posts",
      item: Schema.Struct({ id: Long }),
      params: { "page[size]": "1" },
    }).pipe(
      Effect.flatMap(({ items }) =>
        Effect.forEach(items, ({ id }) =>
          readPage(client, {
            path: `/community/posts/${id}/comments`,
            key: "comments",
            item: CommunityCommentObjectSchema,
            params: { "page[size]": "1" },
            emptyIfMissing: true,
          }),
        ),
      ),
      Effect.asVoid,
    ),
  });
