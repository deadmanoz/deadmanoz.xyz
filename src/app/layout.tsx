import type { Metadata } from "next";
import { Orbitron, Audiowide, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const audiowide = Audiowide({
  variable: "--font-audiowide",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://deadmanoz.xyz'),
  title: "deadmanoz.xyz",
  description: "deadmanoz's website",
  icons: {
    icon: [
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.variable} ${audiowide.variable} ${inter.variable} antialiased`}
      >
        <Script
          id="MathJax-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.MathJax = {
                tex: {
                  inlineMath: [['\\\\(', '\\\\)']],
                  displayMath: [['\\\\[', '\\\\]']],
                },
                chtml: {
                  fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2'
                },
                svg: {
                  fontCache: 'global'
                },
                startup: {
                  ready: () => {
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(() => {
                      console.log('MathJax ready for use');
                    });
                  }
                }
              };
            `
          }}
        />
        <Script
          id="MathJax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
