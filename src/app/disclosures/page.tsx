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
      <div className="w-full px-5 relative z-10 flex-1 flex flex-col items-center">
        <header className="py-10 w-full max-w-4xl">
          <Link href="/" className="inline-flex items-center text-synthwave-neon-cyan hover:text-synthwave-neon-orange text-lg transition-all duration-300">
            <span className="mr-2">←</span> Back to home
          </Link>
        </header>

        <main className="flex-1 w-full flex flex-col items-center mb-32">
          <div className="max-w-4xl w-full">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight mb-24 neon-text text-center" style={{fontFamily: 'var(--font-inter)'}}>
              Disclosures
            </h1>

            {/* <div className="text-synthwave-peach/80 text-lg leading-relaxed">
              <p className="text-center mb-48">
                This page is for transparency disclosures and related information.
              </p>
            </div> */}
            <div className="main-page-content space-y-12 text-lg">
                {/* This is the main page content */}
                <p className="text-synthwave-peach/60">
                  April 2025 - October 2025: 6 month fixed-term contract with{" "}
                  <a
                    href="https://chaincode.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-synthwave-neon-cyan hover:text-synthwave-neon-orange transition-all duration-300"
                  >
                    Chaincode Labs
                  </a>
                  .
                </p>
              </div>
          </div>
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
