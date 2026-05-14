import { getAllPosts } from "@/lib/api";
import { formatPostDate } from "@/lib/format-date";
import { formatReadingTime } from "@/lib/reading-time";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/app/_components/footer";
import { Header } from "@/app/_components/header";

const TAG_COLORS: Record<string, string> = {
  addrman: "#14B8A6",
  auxpow: "#A78BFA",
  bip32: "#FDE047",
  bitcoin: "#F7931A",
  "data-carry": "#F472B6",
  explainer: "#FF8664",
  guide: "#84CC16",
  "merge-mining": "#FACC15",
  messages: "#38BDF8",
  "mining-pools": "#FB923C",
  monitoring: "#34D399",
  "network-properties": "#22C55E",
  "network-topology": "#20E516",
  nixos: "#60A5FA",
  p2ms: "#C084FC",
  p2p: "#00A0D0",
  "peer-observer": "#2DD4BF",
  research: "#D946EF",
  site: "#F43F5E",
  "stale-blocks": "#FB7185",
  "test-post": "#94A3B8",
  "utxo-set": "#22D3EE",
  wallets: "#A3E635",
};

const FALLBACK_TAG_COLORS = [
  "#00A0D0",
  "#FF6C11",
  "#20E516",
  "#F472B6",
  "#FACC15",
  "#A78BFA",
  "#2DD4BF",
  "#FB7185",
];

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function getTagColor(tag: string) {
  if (TAG_COLORS[tag]) {
    return TAG_COLORS[tag];
  }

  const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_TAG_COLORS[hash % FALLBACK_TAG_COLORS.length];
}

function getTagStyle(tag: string): React.CSSProperties {
  const color = getTagColor(tag);

  return {
    color,
    borderColor: `${color}80`,
    backgroundColor: `${color}1A`,
    boxShadow: `0 0 14px ${color}1F`,
  };
}

export default function Home() {
  const posts = getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "coverImage",
    "excerpt",
    "tags",
    "content",
  ]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <Header />

        <main className="flex-1 w-full flex flex-col items-center">
          <section className="mb-16 w-full max-w-6xl">
            <div className="flex flex-col gap-8 w-full">
              {posts.length === 0 ? (
                <p className="text-synthwave-peach/60 text-center">No posts yet.</p>
              ) : (
                posts.map((post) => {
                  const tags = normalizeTags(post.tags);

                  return (
                    <article key={post.slug} className="card group w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border"
                            style={getTagStyle(tag)}
                          >
                            #{tag}
                          </span>
                        ))}
                        <span className="text-sm text-synthwave-peach/60">
                          <time dateTime={post.date}>
                            {formatPostDate(post.date)}
                          </time>
                        </span>
                        {typeof post.content === "string" && (
                          <span className="text-sm text-synthwave-peach/60">
                            · {formatReadingTime(post.content)}
                          </span>
                        )}
                      </div>
                      {post.coverImage && (
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
                  );
                })
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
