import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";

/** The remark/rehype chain shared by the site renderer and the feed converter. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown);
  return result.toString();
}

/**
 * The lighter chain for a Markdown fragment such as an annotation tooltip:
 * no heading ids and no code highlighting, which would be noise in a tooltip.
 */
export async function renderMarkdownFragment(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return result.toString();
}
