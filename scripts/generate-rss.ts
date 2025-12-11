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
  // First pass: collect figure and table definitions to build numbering maps
  const figureRefs = new Map<string, number>();
  const tableRefs = new Map<string, number>();
  let figureCounter = 0;
  let tableCounter = 0;

  // Find image figures: ![...]{#fig:id}
  const imgFigPattern = /!\[[^\]]*\]\([^)]+\)\s*\{#fig:([^}]+)\}/g;
  let match;
  while ((match = imgFigPattern.exec(markdown)) !== null) {
    const id = match[1];
    if (!figureRefs.has(id)) {
      figureRefs.set(id, ++figureCounter);
    }
  }

  // Find plot figures: :::plot{...}...:::\nCaption {#fig:id}
  const plotFigPattern = /:::plot\{[^}]+\}[\s\S]*?^:::$\s*\n[^\n]*\{#fig:([^}]+)\}/gm;
  while ((match = plotFigPattern.exec(markdown)) !== null) {
    const id = match[1];
    if (!figureRefs.has(id)) {
      figureRefs.set(id, ++figureCounter);
    }
  }

  // Find tables: {#tab:id}
  const tablePattern = /\{#tab:([^}]+)\}/g;
  while ((match = tablePattern.exec(markdown)) !== null) {
    const id = match[1];
    if (!tableRefs.has(id)) {
      tableRefs.set(id, ++tableCounter);
    }
  }

  // Remove plot blocks (they won't work in RSS)
  // Handle both inline JSON and external src= variants
  // Use a text placeholder that will be converted to HTML after remark processing
  let processed = markdown.replace(/:::plot\{[^}]+\}\s*\n[\s\S]*?^:::$/gm,
    '\n\n**[Interactive plot - view on website]**\n\n');

  // Convert alert boxes to blockquotes: :::alert{type} content ::: -> blockquote
  processed = processed.replace(/:::alert\{[^}]+\}\s*([\s\S]*?)\s*:::/g, (_match, content) => {
    return `> ${content.trim().replace(/\n/g, '\n> ')}`;
  });

  // Convert collapsible sections to regular content: :::collapse{Title} content ::: -> heading + content
  processed = processed.replace(/:::collapse\{([^}]+)\}\s*([\s\S]*?)\s*:::/g, (_match, title, content) => {
    return `**${title}**\n\n${content.trim()}`;
  });

  // Strip colored text syntax: {{color:text}} -> text
  processed = processed.replace(/\{\{[^:]+:([^}]+)\}\}/g, '$1');

  // Remove annotation syntax [[text||tooltip]] -> just text
  processed = processed.replace(/\[\[([^\|]+)\|\|[^\]]+\]\]/g, '$1');

  // Convert image figures with captions: ![caption](src){#fig:id} -> ![Figure N: caption](src)
  // Also strip existing "Figure:" prefix from caption to avoid duplication
  processed = processed.replace(
    /!\[([^\]]*)\]\(([^)]+)\)\s*\{#fig:([^}]+)\}/g,
    (_match, caption, src, id) => {
      const num = figureRefs.get(id);
      const prefix = num ? `Figure ${num}: ` : '';
      // Remove existing "Figure:" prefix if present
      const cleanCaption = caption.replace(/^Figure:\s*/i, '');
      return `![${prefix}${cleanCaption}](${src})`;
    }
  );

  // Remove any remaining figure ID syntax: {#fig:id} -> nothing
  processed = processed.replace(/\{#fig:[^}]+\}/g, '');

  // Replace figure references with actual numbers: {@fig:id} -> "Figure N"
  processed = processed.replace(/\{@fig:([^}]+)\}/g, (_match, id) => {
    const num = figureRefs.get(id);
    return num ? `Figure ${num}` : 'figure';
  });

  // Convert table captions: "Caption text {#tab:id}" -> "**Table N:** Caption text"
  processed = processed.replace(
    /^([^\n|{]+?)\s*\{#tab:([^}]+)\}$/gm,
    (_match, caption, id) => {
      const num = tableRefs.get(id);
      const prefix = num ? `**Table ${num}:** ` : '';
      return `${prefix}${caption.trim()}`;
    }
  );

  // Remove any remaining table ID syntax: {#tab:id} -> nothing
  processed = processed.replace(/\{#tab:[^}]+\}/g, '');

  // Replace table references with actual numbers: {@tab:id} -> "Table N"
  processed = processed.replace(/\{@tab:([^}]+)\}/g, (_match, id) => {
    const num = tableRefs.get(id);
    return num ? `Table ${num}` : 'table';
  });

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
