import type { Demo } from "@useairfoil/connector-kit";

import type {
  Article,
  ArticleTranslation,
  Category,
  CommunityComment,
  CommunityPost,
  CommunityTopic,
  Section,
} from "../schemas/help-center";

import { agentCount, agentId, articleTitles, categories, day, helpCenter, slug } from "./shared";

/** The Help Center and community, written once with the account. */
export const helpCenterTables = ({ faker }: Demo.DemoContext, setup: Date) => {
  const stamp = { version: setup, created_at: setup, updated_at: setup };

  const categoryRows: Array<Category> = categories.map((name, c) => ({
    id: 360_001_000_000n + BigInt(c),
    ...stamp,
    html_url: `${helpCenter}/categories/${360_001_000_000 + c}-${slug(name)}`,
    name,
    description: null,
    locale: "en-us",
    position: BigInt(c),
  }));

  const sections: Array<Section> = categories.map((name, c) => ({
    id: 360_001_100_000n + BigInt(c),
    ...stamp,
    html_url: `${helpCenter}/sections/${360_001_100_000 + c}-${slug(name)}`,
    name,
    description: null,
    locale: "en-us",
    category_id: 360_001_000_000n + BigInt(c),
    parent_section_id: null,
    position: 0n,
  }));

  const articles: Array<Article> = articleTitles.flatMap((titles, c) =>
    titles.map((title, a) => {
      const id = 360_001_200_000n + BigInt(c * 10 + a);

      const edited = new Date(
        setup.getTime() + faker.number.int({ min: 10 * day, max: 800 * day }),
      );

      const votes = faker.number.int({ max: 60 });

      return {
        id,
        version: edited,
        created_at: setup,
        updated_at: edited,
        html_url: `${helpCenter}/articles/${id}-${slug(title)}`,
        title,
        body: `<p>This article explains how to ${title.toLowerCase()}.</p><ol><li>Open Settings.</li><li>Follow the steps on screen.</li></ol>`,
        locale: "en-us",
        source_locale: "en-us",
        section_id: 360_001_100_000n + BigInt(c),
        author_id: agentId(a % agentCount),
        draft: false,
        promoted: a === 0,
        position: BigInt(a),
        vote_sum: BigInt(votes - faker.number.int({ max: Math.floor(votes / 4) })),
        vote_count: BigInt(votes),
        label_names: [slug(categories[c] ?? "")],
        edited_at: edited,
      };
    }),
  );

  const topics: Array<CommunityTopic> = ["Feature requests", "Tips and tricks"].map((name, t) => ({
    id: 360_001_300_000n + BigInt(t),
    ...stamp,
    html_url: `${helpCenter}/community/topics/${360_001_300_000 + t}-${slug(name)}`,
    name,
    description: null,
    position: BigInt(t),
    follower_count: BigInt(faker.number.int({ min: 20, max: 300 })),
  }));

  const posts: Array<CommunityPost> = [
    "Dark mode for the dashboard",
    "Bulk edit tickets",
    "Export reports to Google Sheets",
    "Keyboard shortcuts cheat sheet",
    "How we use tags to route tickets",
    "Custom fields in reports",
  ].map((title, p) => {
    const created = new Date(setup.getTime() + faker.number.int({ min: 30 * day, max: 800 * day }));
    const votes = faker.number.int({ min: 2, max: 120 });

    return {
      id: 360_001_400_000n + BigInt(p),
      version: created,
      created_at: created,
      updated_at: created,
      html_url: `${helpCenter}/community/posts/${360_001_400_000 + p}-${slug(title)}`,
      title,
      details: `<p>${title}. Would love to see this.</p>`,
      author_id: agentId(p % agentCount),
      topic_id: 360_001_300_000n + BigInt(p < 3 ? 0 : 1),
      status: p < 3 ? faker.helpers.arrayElement(["planned", "none", "not_planned"]) : "none",
      featured: p === 3,
      pinned: false,
      closed: false,
      vote_sum: BigInt(votes),
      vote_count: BigInt(votes),
      comment_count: BigInt(faker.number.int({ max: 20 })),
      follower_count: BigInt(faker.number.int({ min: 1, max: 50 })),
    };
  });

  const translations: Array<ArticleTranslation> = articles
    .filter((article) => article.position === 0n)
    .map((article) => ({
      id: article.id + 1_000_000n,
      version: article.updated_at,
      created_at: article.created_at,
      updated_at: article.updated_at,
      html_url: article.html_url.replace("/en-us/", "/fr/"),
      source_id: article.id,
      locale: "fr",
      title: `${article.title} (FR)`,
      body: "<p>Cet article explique comment faire.</p>",
      draft: false,
      outdated: false,
    }));

  const comments: Array<CommunityComment> = posts.flatMap((post) =>
    Array.from({ length: faker.number.int({ max: 3 }) }, (_, c) => {
      const created = new Date(
        post.created_at.getTime() + faker.number.int({ min: day, max: 30 * day }),
      );

      return {
        id: post.id * 10n + BigInt(c),
        version: created,
        created_at: created,
        updated_at: created,
        html_url: `${post.html_url}#comment-${post.id * 10n + BigInt(c)}`,
        post_id: post.id,
        author_id: agentId((Number(post.id) + c + 1) % agentCount),
        body: c === 0 ? "<p>Thanks, we're looking into this.</p>" : "<p>+1, we need this too.</p>",
        official: c === 0,
        vote_sum: BigInt(faker.number.int({ max: 10 })),
        vote_count: BigInt(faker.number.int({ min: 10, max: 15 })),
      };
    }),
  );

  return {
    categories: categoryRows,
    sections,
    articles,
    article_translations: translations,
    community_topics: topics,
    community_posts: posts,
    community_comments: comments,
  };
};
