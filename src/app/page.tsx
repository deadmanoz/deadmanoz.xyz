import { getAllPosts } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/app/_components/footer";
import { Header } from "@/app/_components/header";

export default function Home() {
  const posts = getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "coverImage",
    "excerpt",
    "hidden",
    "type",
  ]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <Header activePage="home" />

        <main className="flex-1 w-full flex flex-col items-center">
          <section className="mb-16 w-full max-w-6xl">
            <div className="flex flex-col gap-8 w-full">
              {posts.length === 0 ? (
                <p className="text-synthwave-peach/60 text-center">No posts yet.</p>
              ) : (
                posts.map((post) => (
                  <article key={post.slug} className="card group w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <Link
                        href={post.type === "research" ? "/research" : "/blog"}
                        className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-opacity duration-300 hover:opacity-80"
                        style={{
                          backgroundColor: post.type === "research" ? "#00A0D0" : "#FF6C11",
                          color: "#000221",
                        }}
                      >
                        {post.type}
                      </Link>
                      <span className="text-sm text-synthwave-peach/60">
                        <time dateTime={post.date}>
                          {new Date(post.date).toLocaleDateString()}
                        </time>
                      </span>
                    </div>
                    {post.coverImage && post.type === "research" && (
                      <div className="mb-4">
                        <Link href={`/posts/${post.slug}`}>
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            width={1200}
                            height={630}
                            className="w-full aspect-[1.91/1] object-contain rounded-lg border border-synthwave-neon-cyan/30 group-hover:border-synthwave-neon-orange/50 transition-all duration-300"
                          />
                        </Link>
                      </div>
                    )}
                    <h3 className="text-2xl mb-3 leading-snug font-bold">
                      <Link
                        href={`/posts/${post.slug}`}
                        className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-base leading-relaxed mb-4 text-synthwave-peach/80">{post.excerpt}</p>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="inline-flex items-center text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                    >
                      Read more →
                    </Link>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      <Footer />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-synthwave-neon-orange/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-synthwave-neon-cyan/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-synthwave-neon-green/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
    </div>
  );
}
