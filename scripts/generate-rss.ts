/**
 * Generate RSS and Atom feeds for the blog.
 *
 * This script generates both RSS 2.0 (feed.xml) and Atom (atom.xml) feeds
 * containing all published blog posts with full HTML content.
 *
 * Runs automatically before `npm run build` and `npm run dev` (the prebuild and
 * predev scripts), or by hand with `just generate-rss`. The generated files in
 * public/ are build artefacts and are not tracked in git.
 */

import { Feed } from "feed";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAllPosts } from "../src/lib/api";
import {
  AUTHOR_EMAIL,
  AUTHOR_LINK,
  AUTHOR_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "../src/lib/constants";
import { markdownToFeedHtml, prependCoverImageForFeed } from "../src/lib/rss-markdown";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const FEED_ITEM_LIMIT = 10;

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

/**
 * Generate RSS and Atom feeds.
 */
async function generateFeeds(): Promise<void> {
  console.log("Generating RSS and Atom feeds...");

  const publishedPosts = getAllPosts([
    "title",
    "date",
    "slug",
    "excerpt",
    "content",
    "coverImage",
    "status",
    "tags",
  ]);
  const posts = publishedPosts.slice(0, FEED_ITEM_LIMIT);
  console.log(
    `Found ${publishedPosts.length} published posts; writing latest ${posts.length} to feeds`
  );

  const feed = new Feed({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: SITE_URL,
    link: SITE_URL,
    language: "en",
    image: `${SITE_URL}/favicon/apple-touch-icon.png`,
    favicon: `${SITE_URL}/favicon/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} ${AUTHOR_NAME}`,
    updated: posts.length > 0 ? new Date(posts[0].date) : new Date(),
    feedLinks: {
      rss2: `${SITE_URL}/feed.xml`,
      atom: `${SITE_URL}/atom.xml`,
    },
    author: {
      name: AUTHOR_NAME,
      email: AUTHOR_EMAIL || undefined,
      link: AUTHOR_LINK,
    },
  });

  // Add posts to feed
  for (const post of posts) {
    const postUrl = `${SITE_URL}/posts/${post.slug}`;
    const postDate = new Date(post.date);
    const tags = normalizeTags(post.tags);

    // Convert markdown content to HTML
    const bodyHtml = await markdownToFeedHtml(post.content || "", SITE_URL);
    const htmlContent = prependCoverImageForFeed(
      bodyHtml,
      post.coverImage,
      post.title,
      SITE_URL,
    );

    feed.addItem({
      title: post.title,
      id: postUrl,
      link: postUrl,
      description: post.excerpt,
      content: htmlContent,
      author: [
        {
          name: AUTHOR_NAME,
          email: AUTHOR_EMAIL || undefined,
          link: AUTHOR_LINK,
        },
      ],
      date: postDate,
      published: postDate,
      category: tags.map((name) => ({ name })),
    });
  }

  // Write feeds to public directory
  const publicDir = path.join(projectRoot, "public");

  const rss2 = feed.rss2();
  const atom = feed.atom1();

  fs.writeFileSync(path.join(publicDir, "feed.xml"), rss2);
  console.log(`Written: public/feed.xml (${rss2.length} bytes)`);

  fs.writeFileSync(path.join(publicDir, "atom.xml"), atom);
  console.log(`Written: public/atom.xml (${atom.length} bytes)`);

  console.log("Feed generation complete!");
}

// Run the generator
generateFeeds().catch((error) => {
  console.error("Error generating feeds:", error);
  process.exit(1);
});
