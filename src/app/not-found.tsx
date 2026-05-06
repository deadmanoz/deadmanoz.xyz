import Link from "next/link";
import { Header } from "@/app/_components/header";
import { Footer } from "@/app/_components/footer";
import { NotFoundPath } from "@/app/_components/not-found-readout";

export default function NotFound() {
  return (
    <div className="not-found-page min-h-screen flex flex-col relative">
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <Header />

        <main className="not-found-main flex-1 w-full max-w-2xl flex flex-col items-center text-center px-4">
          <h1
            className="not-found-code text-8xl md:text-9xl font-bold tracking-tighter leading-none neon-text"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            404
          </h1>

          <h2
            className="not-found-title text-2xl md:text-3xl font-medium"
            style={{ color: 'var(--theme-neon-cyan)' }}
          >
            Page not found
          </h2>

          <p
            className="not-found-copy max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: 'var(--theme-text-primary)', opacity: 0.85 }}
          >
            The page at <NotFoundPath /> couldn&apos;t be found.
            It may have been moved, renamed, or never existed.
          </p>

          <div className="not-found-actions flex justify-center">
            <Link href="/" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </div>

      <Footer />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(255, 108, 17, 0.10)' }}
        ></div>
        <div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(0, 160, 208, 0.10)' }}
        ></div>
      </div>

      <style>{`
        .not-found-page header {
          padding-top: 2.5rem;
          padding-bottom: 1.5rem;
          margin-bottom: 3rem;
        }

        .not-found-page header p {
          margin-top: 1rem;
        }

        .not-found-page header nav {
          margin-top: 1rem;
          padding-bottom: 1.25rem;
        }

        .not-found-main {
          padding: 0 1rem 5rem;
        }

        .not-found-title {
          margin-top: 3rem;
        }

        .not-found-copy {
          margin-top: 2rem;
          max-width: 36rem;
        }

        .not-found-actions {
          margin-top: 3rem;
        }

        @media (min-width: 768px) {
          .not-found-page header {
            margin-bottom: 4rem;
          }

          .not-found-page header p {
            margin-top: 1.25rem;
          }

          .not-found-page header nav {
            margin-top: 1.25rem;
            padding-bottom: 1.5rem;
          }

          .not-found-main {
            padding: 0 1rem 6rem;
          }

          .not-found-title {
            margin-top: 3.5rem;
          }

          .not-found-copy {
            margin-top: 2.25rem;
          }

          .not-found-actions {
            margin-top: 3.25rem;
          }
        }

        @media (max-width: 640px) {
          .not-found-page header {
            padding-top: 2rem;
            padding-bottom: 1rem;
            margin-bottom: 2.25rem;
          }

          .not-found-title {
            margin-top: 2.5rem;
          }

          .not-found-copy {
            margin-top: 1.75rem;
          }

          .not-found-actions {
            margin-top: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
