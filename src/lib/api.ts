import fs from "fs";
import { join } from "path";
import matter from "gray-matter";
import { getGitMetadata, shouldFetchGitMetadata, GitMetadata } from "./git-metadata";

const postsDirectory = join(process.cwd(), "_posts");

export function getPostSlugs() {
  return fs.readdirSync(postsDirectory);
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
    const filePath = `_posts/${slug.replace(/\.md$/, "")}.md`;
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