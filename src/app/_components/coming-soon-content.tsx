import Link from "next/link";
import { Header } from "@/app/_components/header";
import { Footer } from "@/app/_components/footer";

interface ComingSoonContentProps {
  title?: string;
}

export function ComingSoonContent({ title }: ComingSoonContentProps) {
  return (
    <div className="post-pending-page min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <Header />

        <main className="post-pending-main flex-1 w-full max-w-2xl flex flex-col items-center text-center">
          <h1
            className="post-pending-code text-7xl md:text-8xl font-bold tracking-tighter leading-none neon-text"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Post Pending
          </h1>

          {title && (
            <h2
              className="post-pending-title text-2xl md:text-3xl font-medium italic"
              style={{ color: 'var(--theme-neon-cyan)' }}
            >
              &ldquo;{title}&rdquo;
            </h2>
          )}

          <p
            className="post-pending-copy max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: 'var(--theme-text-primary)', opacity: 0.85 }}
          >
            Currently in the author&apos;s mempool: content yet to propagate to the page.
          </p>

          <div className="post-pending-actions flex justify-center">
            <Link href="/" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </div>

      <Footer />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(0, 160, 208, 0.10)' }}
        ></div>
        <div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(255, 108, 17, 0.10)' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(32, 229, 22, 0.10)' }}
        ></div>
      </div>

      <style>{`
        .post-pending-page header {
          padding-top: 2.5rem;
          padding-bottom: 1.5rem;
          margin-bottom: 3rem;
        }

        .post-pending-page header p {
          margin-top: 1rem;
        }

        .post-pending-page header nav {
          margin-top: 1rem;
          padding-bottom: 1.25rem;
        }

        .post-pending-main {
          padding: 0 1rem 5rem;
        }

        .post-pending-title {
          margin-top: 3rem;
        }

        .post-pending-copy {
          margin-top: 2rem;
          max-width: 36rem;
        }

        .post-pending-actions {
          margin-top: 3rem;
        }

        @media (min-width: 768px) {
          .post-pending-page header {
            margin-bottom: 4rem;
          }

          .post-pending-page header p {
            margin-top: 1.25rem;
          }

          .post-pending-page header nav {
            margin-top: 1.25rem;
            padding-bottom: 1.5rem;
          }

          .post-pending-main {
            padding: 0 1rem 6rem;
          }

          .post-pending-title {
            margin-top: 3.5rem;
          }

          .post-pending-copy {
            margin-top: 2.25rem;
          }

          .post-pending-actions {
            margin-top: 3.25rem;
          }
        }

        @media (max-width: 640px) {
          .post-pending-page header {
            padding-top: 2rem;
            padding-bottom: 1rem;
            margin-bottom: 2.25rem;
          }

          .post-pending-title {
            margin-top: 2.5rem;
          }

          .post-pending-copy {
            margin-top: 1.75rem;
          }

          .post-pending-actions {
            margin-top: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
