import Link from "next/link";
import { Footer } from "@/app/_components/footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclosures - deadmanoz.xyz",
  description: "Disclosures and transparency information",
};

export default function Disclosures() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="w-full px-5 md:px-8 lg:px-12 relative z-10 flex-1 flex flex-col items-center">
        <header className="py-10 w-full max-w-4xl">
          <Link href="/" className="inline-flex items-center text-synthwave-neon-cyan hover:text-synthwave-neon-orange text-lg transition-all duration-300">
            <span className="mr-2">←</span> Back to home
          </Link>
        </header>

        <main className="flex-1 w-full flex flex-col items-center mb-32">
          <div className="max-w-4xl w-full">
            <header className="border-b border-synthwave-neon-orange/30 pb-8 mb-8">
              <h1
                className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-4 neon-text"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Disclosures
              </h1>
              <p className="text-base md:text-lg leading-relaxed text-synthwave-peach/75">
                Relevant funding, employment, and research relationships.
              </p>
            </header>

            <section aria-label="Funding and employment disclosures" className="space-y-6">
              <article className="card">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-synthwave-neon-green mb-3">
                  April 2026 - March 2027
                </p>
                <h2 className="text-2xl font-bold text-synthwave-neon-cyan mb-3">
                  <a
                    href="https://spiral.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Spiral
                  </a>
                </h2>
                <p className="text-base md:text-lg leading-relaxed text-synthwave-peach/85">
                  One-year grant supporting work on Bitcoin network monitoring. The project contributes to the{" "}
                  <a
                    href="https://bnoc.xyz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Bitcoin Network Operations Collective (BNOC)
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://github.com/peer-observer/peer-observer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    peer-observer
                  </a>, with a focus on monitoring infrastructure,
                  automated anomaly detection and alerting, and ML/AI-assisted investigation of network events.
                </p>
              </article>

              <article className="card">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-synthwave-neon-orange mb-3">
                  April 2025 - October 2025
                </p>
                <h2 className="text-2xl font-bold text-synthwave-neon-cyan mb-3">
                  <a
                    href="https://chaincode.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Chaincode Labs
                  </a>
                </h2>
                <p className="text-base md:text-lg leading-relaxed text-synthwave-peach/85">
                  Six-month fixed-term contract. During this time, I co-authored the{" "}
                  <a
                    href="https://chaincode.com/bitcoin-post-quantum.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Bitcoin and Quantum Computing report
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://pq-bitcoin.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    continued related research and data analysis
                  </a>.
                </p>
              </article>

              <article className="card">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-synthwave-neon-orange mb-3">
                  Earlier career
                </p>
                <h2 className="text-2xl font-bold text-synthwave-neon-cyan mb-3">
                  Before Bitcoin
                </h2>
                <p className="text-base md:text-lg leading-relaxed text-synthwave-peach/85">
                  Before transitioning to Bitcoin research and development, I worked on machine-learning software for
                  anomaly detection in large-scale security-camera networks, as well as ML systems for agricultural
                  satellite imagery.
                </p>
              </article>
            </section>
          </div>
        </main>
      </div>

      <Footer />

      {/* Static background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-synthwave-neon-orange/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-synthwave-neon-cyan/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-synthwave-neon-green/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
