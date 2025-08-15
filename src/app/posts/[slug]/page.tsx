import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getPostBySlugWithGitData } from "@/lib/api";
import markdownToHtml from "@/lib/markdownToHtml";
import { EnhancedPostBody } from "@/app/_components/enhanced-post-body";
import { Footer } from "@/app/_components/footer";
import { TableOfContents } from "@/app/_components/table-of-contents";
import Link from "next/link";

export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlugWithGitData(slug, [
    "title",
    "date",
    "slug",
    "author",
    "content",
    "ogImage",
    "coverImage",
  ]);

  if (!post.slug) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <header className="py-10 w-full max-w-6xl">
          <Link href="/" className="inline-flex items-center text-synthwave-neon-cyan hover:text-synthwave-neon-orange text-lg transition-all duration-300">
            <span className="mr-2">←</span> Back to home
          </Link>
        </header>

        <main className="flex-1 w-full flex flex-col items-center">
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
                        Published: {new Date(post.gitMetadata.publishedAt).toLocaleDateString()}
                      </time>
                    </div>
                    {post.gitMetadata.updateCount > 0 && (
                      <div className="text-sm text-synthwave-neon-cyan space-y-1">
                        <div>
                          <time dateTime={post.gitMetadata.updatedAt}>
                            Last updated: {new Date(post.gitMetadata.updatedAt).toLocaleDateString()}
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
                      {new Date(post.date).toLocaleDateString()}
                    </time>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content with TOC Layout */}
          <div className="max-w-7xl w-full flex gap-12 items-start mb-32">
            {/* TOC - Desktop only, inline */}
            <div className="hidden xl:block">
              <TableOfContents inline={true} />
            </div>
            
            {/* Main Content */}
            <div className="flex-1 prose-synthwave min-w-0">
              <EnhancedPostBody content={content} />
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug, ["title", "excerpt", "ogImage", "slug"]);

  if (!post.slug) {
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
  const posts = getAllPosts(["slug"]);

  return posts.map((post) => ({
    slug: post.slug,
  }));
}