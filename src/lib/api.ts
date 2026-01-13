import fs from "fs";
import { join, relative } from "path";
import matter from "gray-matter";
import { getGitMetadata, shouldFetchGitMetadata, GitMetadata } from "./git-metadata";
import { type PostType } from "@/interfaces/post";

const postsDirectory = join(process.cwd(), "_posts");

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
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

export function getPostSlugs() {
  const files = findMarkdownFiles(postsDirectory);
  // Return paths relative to postsDirectory (e.g., "2026/2026-01.md" or "hello-world.md")
  return files.map((file) => relative(postsDirectory, file));
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.md$/, "");
  const fullPath = join(postsDirectory, `${realSlug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  type Items = {
    [key: string]: string;
  } & {
    gitMetadata?: GitMetadata;
  };

  const items: Items = {};

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

export async function getPostBySlugWithGitData(slug: string, fields: string[] = []) {
  const post = getPostBySlug(slug, fields);

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

export function getAllPosts(fields: string[] = []) {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
    .filter((post) => !post.hidden)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
  return posts;
}

export async function getAllPostsWithGitData(fields: string[] = []) {
  const slugs = getPostSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPostBySlugWithGitData(slug, fields);
      return post;
    })
  );

  return posts
    .filter((post) => !post.hidden)
    .sort((post1, post2) => (post1.date > post2.date ? -1 : 1));
}

export function getPostsByType(type: PostType, fields: string[] = []) {
  const allPosts = getAllPosts([...fields, 'type']);
  return allPosts.filter((post) => post.type === type);
}

export async function getPostsByTypeWithGitData(type: PostType, fields: string[] = []) {
  const allPosts = await getAllPostsWithGitData([...fields, 'type']);
  return allPosts.filter((post) => post.type === type);
}