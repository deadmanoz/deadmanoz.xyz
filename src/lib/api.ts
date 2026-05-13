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
  hidden?: boolean;
  coming_soon?: boolean;
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
    } else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.endsWith(".draft.md")) {
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
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDir, `${realSlug}.md`);
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

const VALID_POST_STATUSES: PostStatus[] = ["published", "draft", "placeholder", "canary"];

export function getPostStatus(post: Record<string, unknown>): PostStatus {
  const status = post.status;
  if (typeof status === "string") {
    return VALID_POST_STATUSES.includes(status as PostStatus) ? (status as PostStatus) : "draft";
  }

  if (post.slug === "hello-world") {
    return "canary";
  }

  if (post.coming_soon === true) {
    return "placeholder";
  }

  if (post.hidden === true) {
    return "draft";
  }

  return "published";
}

export function isPublishedPost(post: PostItems): post is PublishedPostItems {
  return Boolean(
    typeof post.title === "string" &&
      typeof post.date === "string" &&
      !Number.isNaN(Date.parse(post.date)) &&
      getPostStatus(post) === "published"
  );
}

export function isRoutablePost(post: PostItems): post is RoutablePostItems {
  const status = getPostStatus(post);
  return Boolean(
    typeof post.slug === "string" &&
      typeof post.title === "string" &&
      (status === "published" || status === "placeholder" || status === "canary")
  );
}

function withListFilterFields(fields: string[]) {
  return Array.from(new Set([...fields, "title", "date", "status", "hidden", "coming_soon"]));
}

export async function getPostBySlugWithGitData(
  slug: string,
  fields: string[] = [],
  postsDir: string = defaultPostsDirectory,
) {
  const post = getPostBySlug(slug, fields, postsDir);

  // Fetch git metadata if we're in production or explicitly enabled
  if (shouldFetchGitMetadata()) {
    const realSlug = slug.replace(/\.md$/, "");
    const filePath = `_posts/${realSlug}.md`;
    const gitMetadata = await getGitMetadata(filePath);
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

export async function getAllPostsWithGitData(
  fields: string[] = [],
  postsDir: string = defaultPostsDirectory,
) {
  const slugs = getPostSlugs(postsDir);
  const postFields = withListFilterFields(fields);
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlugWithGitData(slug, postFields, postsDir);
      return post;
    })
  );

  return posts
    .filter(isPublishedPost)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
}
