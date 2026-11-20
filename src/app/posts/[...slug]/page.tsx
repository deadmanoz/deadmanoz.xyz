import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostBySlugWithGitData, getPostSlugs, getPostStatus, isRoutablePost } from "@/lib/api";
import { formatPostDate } from "@/lib/format-date";
import { formatReadingTime } from "@/lib/reading-time";
import markdownToHtml from "@/lib/markdownToHtml";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { CitationBlock } from "@/app/_components/citation-block";
import { ComingSoonContent } from "@/app/_components/coming-soon-content";
import { EnhancedPostBody } from "@/app/_components/enhanced-post-body";
import { Footer } from "@/app/_components/footer";

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
  ]);

  if (!post.slug || !isRoutablePost(post)) {
    return notFound();
  }

  const status = getPostStatus(post);

  if (status === "placeholder") {
    return <ComingSoonContent title={post.title} />;
  }

  const isPublished = status === "published";
  // A draft's date is optional and may be unfinished; show it only when it parses.
  const date = typeof post.date === "string" && !Number.isNaN(Date.parse(post.date)) ? post.date : undefined;
  const lastUpdate = isPublished ? (post.gitMetadata?.lastUpdate ?? null) : null;
  const content = await markdownToHtml(post.content || "");

  const citationProps = (() => {
    if (!isPublished || !date) return null;
    const year = new Date(date).getUTCFullYear().toString();
    const authorName =
      (post.author as { name?: string } | undefined)?.name ?? "deadmanoz";
    const lastUpdated = lastUpdate
      ? new Date(lastUpdate.date).toISOString().slice(0, 10)
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
      <div className="w-full px-5 md:px-8 lg:px-12 relative z-10 flex-1 flex flex-col items-center">
        <main className="flex-1 w-full flex flex-col items-center">
          {/* Back link aligned with content */}
          <div className="max-w-6xl w-full flex gap-12 items-start pt-10 mb-8">
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
          <div className="max-w-6xl w-full flex gap-12 items-start mb-12">
            {/* TOC space - Desktop only, to match content layout */}
            <div className="hidden xl:block w-64 shrink-0" />

            {/* Title content - aligned with body text */}
            <div className="flex-1 min-w-0 text-center">
              {!isPublished && (
                <p
                  role="note"
                  className="draft-banner inline-block mb-8 px-4 py-2 rounded border border-synthwave-neon-orange/60 bg-synthwave-neon-orange/10 text-synthwave-neon-orange text-base"
                >
                  <strong>Draft:</strong> this post isn&apos;t published yet and may change.
                </p>
              )}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-tight md:leading-none mb-8 neon-text" style={{fontFamily: 'var(--font-inter)'}}>
                {post.title}
              </h1>

              <div className="text-center space-y-2">
                {/* Drafts show their working date without a Published label or git history. */}
                {date && (
                  <div className="text-lg text-synthwave-peach">
                    <time dateTime={date}>
                      {isPublished ? "Published: " : ""}{formatPostDate(date)}
                    </time>
                    {typeof post.content === "string" && (
                      <span className="text-synthwave-peach/70">
                        {" · "}{formatReadingTime(post.content)}
                      </span>
                    )}
                  </div>
                )}
                {lastUpdate && post.gitMetadata && (
                  <div className="text-sm text-synthwave-neon-cyan space-y-1">
                    <div>
                      <time dateTime={lastUpdate.date}>
                        Last updated: {formatPostDate(lastUpdate.date)}
                      </time>
                    </div>
                    <div className="text-xs text-synthwave-peach/70">
                      {post.gitMetadata.updateCount} revision{post.gitMetadata.updateCount !== 1 ? 's' : ''}
                      {' • '}
                      <span className="font-mono">{lastUpdate.sha}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="max-w-6xl w-full flex gap-12 items-start mb-12">
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
          <div className="max-w-6xl w-full flex gap-12 items-start mb-32">
            <div className="hidden xl:block w-64 shrink-0" />

            {/* Main Content */}
            <div className="flex-1 prose-synthwave min-w-0">
              <EnhancedPostBody content={content} />
              {citationProps && <CitationBlock {...citationProps} />}
            </div>
          </div>
        </main>
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
  const post = getPostBySlug(slugPath, ["title", "date", "excerpt", "ogImage", "slug", "status"]);

  if (!post.slug || !isRoutablePost(post)) {
    return notFound();
  }

  const title = post.title;

  return {
    title,
    // Only published posts are indexable; drafts and placeholders are reachable
    // by URL but should not surface in search results.
    ...(getPostStatus(post) !== "published" && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      images: post.ogImage ? [post.ogImage] : [],
    },
  };
}

export async function generateStaticParams() {
  const routablePosts = getPostSlugs()
    .map((slug) => getPostBySlug(slug, ["slug", "title", "date", "status"]))
    .filter(isRoutablePost);

  const params: { slug: string[] }[] = [];
  const seen = new Set<string>();

  for (const post of routablePosts) {
    const fullParts = post.slug.split("/");
    const fullKey = fullParts.join("/");
    if (!seen.has(fullKey)) {
      seen.add(fullKey);
      params.push({ slug: fullParts });
    }

    if (fullParts.length > 1) {
      const flatSlug = fullParts[fullParts.length - 1];
      if (!seen.has(flatSlug)) {
        seen.add(flatSlug);
        params.push({ slug: [flatSlug] });
      }
    }
  }

  return params;
}

