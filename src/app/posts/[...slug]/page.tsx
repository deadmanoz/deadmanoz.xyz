import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostBySlugWithGitData, getPostSlugs, getPostStatus, isRoutablePost } from "@/lib/api";
import { formatPostDate } from "@/lib/format-date";
import markdownToHtml from "@/lib/markdownToHtml";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { CitationBlock } from "@/app/_components/citation-block";
import { ComingSoonContent } from "@/app/_components/coming-soon-content";
import { EnhancedPostBody } from "@/app/_components/enhanced-post-body";
import { Footer } from "@/app/_components/footer";
import { TableOfContents } from "@/app/_components/table-of-contents";

export const dynamicParams = false;

export default async function Post({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const post = await getPostBySlugWithGitData(slugPath, [
    "title",
    "date",
    "slug",
    "author",
    "content",
    "ogImage",
    "coverImage",
    "status",
    "hidden",
    "coming_soon",
  ]);

  if (!post.slug || !isRoutablePost(post)) {
    return notFound();
  }

  if (getPostStatus(post) === "placeholder") {
    return <ComingSoonContent title={post.title} />;
  }

  if (!post.date) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");

  const citationProps = (() => {
    if (getPostStatus(post) !== "published") return null;
    const publishedSource = post.gitMetadata?.publishedAt ?? post.date;
    const year = new Date(publishedSource).getUTCFullYear().toString();
    const authorName =
      (post.author as { name?: string } | undefined)?.name ?? "deadmanoz";
    const lastUpdated =
      post.gitMetadata && post.gitMetadata.updateCount > 0
        ? new Date(post.gitMetadata.updatedAt).toISOString().slice(0, 10)
        : undefined;
    return {
      author: authorName,
      title: post.title as string,
      year,
      url: `${SITE_URL}/posts/${post.slug}`,
      siteName: SITE_NAME,
      lastUpdated,
    };
  })();

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <main className="flex-1 w-full flex flex-col items-center">
          {/* Back link aligned with content */}
          <div className="max-w-7xl w-full flex gap-12 items-start pt-10 mb-8">
            {/* TOC space - Desktop only, to match content layout */}
            <div className="hidden xl:block w-64 shrink-0" />

            <div className="flex-1 min-w-0">
              <Link
                href="/"
                className="inline-flex items-center text-synthwave-neon-cyan hover:text-synthwave-neon-orange text-lg transition-all duration-300"
              >
                <span className="mr-2">←</span> Back to all posts
              </Link>
            </div>
          </div>

          {/* Title area with same layout as content */}
          <div className="max-w-7xl w-full flex gap-12 items-start mb-12">
            {/* TOC space - Desktop only, to match content layout */}
            <div className="hidden xl:block">
              <TableOfContents inline={true} />
            </div>

            {/* Title content - aligned with body text */}
            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-tight md:leading-none mb-8 neon-text" style={{fontFamily: 'var(--font-inter)'}}>
                {post.title}
              </h1>

              <div className="text-center space-y-2">
                {/* Git metadata if available, otherwise fallback to frontmatter date */}
                {post.gitMetadata ? (
                  <div className="space-y-1">
                    <div className="text-lg text-synthwave-peach">
                      <time dateTime={post.gitMetadata.publishedAt}>
                        Published: {formatPostDate(post.gitMetadata.publishedAt)}
                      </time>
                    </div>
                    {post.gitMetadata.updateCount > 0 && (
                      <div className="text-sm text-synthwave-neon-cyan space-y-1">
                        <div>
                          <time dateTime={post.gitMetadata.updatedAt}>
                            Last updated: {formatPostDate(post.gitMetadata.updatedAt)}
                          </time>
                        </div>
                        <div className="text-xs text-synthwave-peach/70">
                          {post.gitMetadata.updateCount} revision{post.gitMetadata.updateCount !== 1 ? 's' : ''}
                          {' • '}
                          <span className="font-mono">{post.gitMetadata.lastCommitSha}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-lg text-synthwave-peach">
                    <time dateTime={post.date}>
                      {formatPostDate(post.date)}
                    </time>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="max-w-7xl w-full flex gap-12 items-start mb-12">
              {/* TOC space - Desktop only, to match content layout */}
              <div className="hidden xl:block w-64 shrink-0" />

              {/* Cover image centered with content */}
              <div className="flex-1 min-w-0">
                <Image
                  src={post.coverImage}
                  alt={`Cover image for ${post.title}`}
                  width={1200}
                  height={630}
                  className="w-full h-auto rounded-lg shadow-lg shadow-synthwave-neon-cyan/20"
                />
              </div>
            </div>
          )}

          {/* Content with TOC Layout */}
          <div className="max-w-7xl w-full flex gap-12 items-start mb-32">
            {/* TOC - Desktop only, inline */}
            <div className="hidden xl:block">
              <TableOfContents inline={true} />
            </div>

            {/* Main Content */}
            <div className="flex-1 prose-synthwave min-w-0">
              <EnhancedPostBody content={content} />
              {citationProps && <CitationBlock {...citationProps} />}
            </div>
          </div>
        </main>
      </div>

      {/* Table of Contents - Mobile only, floating */}
      <div className="xl:hidden">
        <TableOfContents />
      </div>

      <Footer />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-synthwave-neon-orange/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-synthwave-neon-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const post = getPostBySlug(slugPath, ["title", "excerpt", "ogImage", "slug", "status", "hidden", "coming_soon"]);

  if (!post.slug || !isRoutablePost(post)) {
    return notFound();
  }

  const title = post.title;

  return {
    title,
    openGraph: {
      title,
      images: post.ogImage ? [post.ogImage] : [],
    },
  };
}

export async function generateStaticParams() {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug, ["slug", "title", "status", "hidden", "coming_soon"]))
    .filter(isRoutablePost)
    .map((post) => ({ slug: post.slug.split("/") }));
}
