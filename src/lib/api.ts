import fs from "fs";
import { join, relative } from "path";
import matter from "gray-matter";
import { getGitMetadata, shouldFetchGitMetadata, GitMetadata } from "./git-metadata";
import { type PostStatus, type PostType } from "@/interfaces/post";

const defaultPostsDirectory = join(process.cwd(), "_posts");

type PostFieldValue = string | boolean | string[] | object | undefined;

export type PostItems = Record<string, PostFieldValue> & {
  slug?: string;
  title?: string;
  date?: string;
  content?: string;
  coverImage?: string;
  excerpt?: string;
  type?: PostType;
  status?: PostStatus;
  tags?: string[];
  ogImage?: {
    url: string;
  };
  gitMetadata?: GitMetadata;
};

type PublishedPostItems = PostItems & {
  title: string;
  date: string;
};

type RoutablePostItems = PostItems & {
  slug: string;
  title: string;
};

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md") && !/\.draft\d*\.md$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getPostSlugs(postsDir: string = defaultPostsDirectory) {
  const files = findMarkdownFiles(postsDir);
  // Return paths relative to postsDir (e.g., "2026/2026-01.md" or "hello-world.md")
  return files.map((file) => relative(postsDir, file));
}

export function getPostBySlug(
  slug: string,
  fields: string[] = [],
  postsDir: string = defaultPostsDirectory,
) {
  let realSlug = slug.replace(/\.md$/, "");
  let fullPath = join(postsDir, `${realSlug}.md`);

  if (!fs.existsSync(fullPath)) {
    // Check if the slug was requested without its parent directory prefix (e.g. "merge-mining" for "2026/merge-mining")
    const allSlugs = getPostSlugs(postsDir);
    const match = allSlugs.find(
      (s) => s.replace(/\.md$/, "") === realSlug || s.replace(/\.md$/, "").endsWith(`/${realSlug}`),
    );
    if (match) {
      realSlug = match.replace(/\.md$/, "");
      fullPath = join(postsDir, `${realSlug}.md`);
    } else {
      return {};
    }
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const items: PostItems = {};

  fields.forEach((field) => {
    if (field === "slug") {
      items[field] = realSlug;
    }
    if (field === "content") {
      items[field] = content;
    }

    if (typeof data[field] !== "undefined") {
      items[field] = data[field];
    }
  });

  return items;
}

/**
 * A post's status decides where it appears. Every status gets a route, so a
 * deployed draft is readable by anyone with its URL (`noindex` only keeps it
 * out of search results); only `published` posts are listed on the homepage
 * and in the feeds. A missing or unrecognised status is treated as `draft`, so
 * a post is never listed by accident. Local `*.draft.md` scratch copies are
 * never loaded (see findMarkdownFiles).
 */
export function getPostStatus(post: Record<string, unknown>): PostStatus {
  const status = post.status;
  return status === "published" || status === "placeholder" ? status : "draft";
}

export function isPublishedPost(post: PostItems): post is PublishedPostItems {
  return Boolean(
    typeof post.title === "string" &&
      typeof post.date === "string" &&
      !Number.isNaN(Date.parse(post.date)) &&
      getPostStatus(post) === "published"
  );
}

/**
 * Whether a post gets a page. Drafts and placeholders need only a slug and a
 * title. A published post also needs a valid date, the rule that lists it, so
 * an indexable page never exists without appearing on the homepage and feeds.
 */
export function isRoutablePost(post: PostItems): post is RoutablePostItems {
  if (typeof post.slug !== "string" || typeof post.title !== "string") return false;
  return getPostStatus(post) !== "published" || isPublishedPost(post);
}

function withListFilterFields(fields: string[]) {
  return Array.from(new Set([...fields, "title", "date", "status"]));
}

/**
 * Load a post and, for published posts, its update history since the
 * publication `date`. Drafts and placeholders never carry git history.
 */
export async function getPostBySlugWithGitData(
  slug: string,
  fields: string[] = [],
  postsDir: string = defaultPostsDirectory,
) {
  const post = getPostBySlug(slug, Array.from(new Set([...fields, "slug", "title", "date", "status"])), postsDir);

  if (shouldFetchGitMetadata() && post.slug && isPublishedPost(post)) {
    // post.slug is the resolved path, so a flat alias still finds the file.
    const gitMetadata = await getGitMetadata(`_posts/${post.slug}.md`, post.date);
    if (gitMetadata) {
      post.gitMetadata = gitMetadata;
    }
  }

  return post;
}

export function getAllPosts(
  fields: string[] = [],
  postsDir: string = defaultPostsDirectory,
) {
  const slugs = getPostSlugs(postsDir);
  const postFields = withListFilterFields(fields);
  const posts = slugs
    .map((slug) => getPostBySlug(slug, postFields, postsDir))
    .filter(isPublishedPost)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}
