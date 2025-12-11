/**
 * Generate RSS and Atom feeds for the blog.
 *
 * This script generates both RSS 2.0 (feed.xml) and Atom (atom.xml) feeds
 * containing all published blog posts with full HTML content.
 *
 * Run this BEFORE committing when you add/update posts:
 *   just generate-rss
 *
 * The generated feeds are committed to the repo and deployed via CI/CD.
 */

import { Feed } from "feed";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Site configuration
const SITE_URL = "https://deadmanoz.xyz";
const SITE_TITLE = "deadmanoz.xyz";
const SITE_DESCRIPTION = "deadmanoz's website";
const AUTHOR_NAME = "deadmanoz";
const AUTHOR_EMAIL = ""; // Optional
const AUTHOR_LINK = SITE_URL;

interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  hidden?: boolean;
}

/**
 * Convert markdown to HTML (simplified version for RSS).
 * Note: Interactive elements like Plotly plots won't render in feed readers.
 */
async function markdownToHtml(markdown: string): Promise<string> {
  // Remove plot blocks (they won't work in RSS)
  let processed = markdown.replace(/:::plot\{[^}]+\}[\s\S]*?^:::$/gm,
    '<p><em>[Interactive plot - view on website]</em></p>');

  // Remove annotation syntax [[text||tooltip]] -> just text
  processed = processed.replace(/\[\[([^\|]+)\|\|[^\]]+\]\]/g, '$1');

  // Process with remark
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(processed);

  let html = result.toString();

  // Process superscript ^text^
  html = html.replace(/\^([^\^]+)\^/g, '<sup>$1</sup>');

  // Process strikethrough ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Make relative image URLs absolute
  html = html.replace(/src="\/([^"]+)"/g, `src="${SITE_URL}/$1"`);
  html = html.replace(/href="\/([^"]+)"/g, `href="${SITE_URL}/$1"`);

  return html;
}

/**
 * Load all posts from the _posts directory.
 * Uses frontmatter date field for publication dates.
 */
function getAllPosts(): Post[] {
  const postsDir = path.join(projectRoot, "_posts");
  const slugs = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  const posts: Post[] = [];

  for (const filename of slugs) {
    const slug = filename.replace(/\.md$/, "");
    const fullPath = path.join(postsDir, filename);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    // Skip hidden posts
    if (data.hidden) {
      continue;
    }

    posts.push({
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || "",
      content,
      hidden: data.hidden,
    });
  }

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

/**
 * Generate RSS and Atom feeds.
 */
async function generateFeeds(): Promise<void> {
  console.log("Generating RSS and Atom feeds...");

  const posts = getAllPosts();
  console.log(`Found ${posts.length} published posts`);

  const feed = new Feed({
    title: SITE_TITLE,
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

    // Convert markdown content to HTML
    const htmlContent = await markdownToHtml(post.content);

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
