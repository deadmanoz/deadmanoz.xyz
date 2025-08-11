import { getAllPosts } from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/app/_components/footer";

export default function Home() {
  const allPosts = getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "coverImage",
    "excerpt",
    "hidden",
  ]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center justify-center">
        <header className="py-10 text-center w-full">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight neon-text" style={{fontFamily: 'var(--font-inter)'}}>
            deadmanoz.xyz
          </h1>
        </header>

        <main className="flex-1 w-full flex flex-col items-center">
          <section className="mb-16 w-full max-w-6xl text-center">
            <h2 className="mb-8 text-3xl md:text-4xl font-bold tracking-tighter leading-tight text-synthwave-neon-orange text-center">
              Recent Posts
            </h2>
            <div className="flex flex-col gap-8 mb-32 w-full">
              {allPosts.map((post) => (
                <article key={post.slug} className="card group w-full">
                  {post.coverImage && (
                    <div className="mb-4">
                      <Link href={`/posts/${post.slug}`}>
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          width={1200}
                          height={300}
                          className="w-full h-48 object-cover rounded-lg border border-synthwave-neon-cyan/30 group-hover:border-synthwave-neon-orange/50 transition-all duration-300"
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
                  <div className="text-sm mb-4 text-synthwave-peach">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="text-base leading-relaxed mb-4 text-synthwave-peach/80">{post.excerpt}</p>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="inline-flex items-components text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Read more →
                  </Link>
                </article>
              ))}
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