import Link from "next/link";

interface HeaderProps {
  showTitle?: boolean;
}

export function Header({ showTitle = true }: HeaderProps) {
  if (!showTitle) {
    return null;
  }

  return (
    <header className="py-10 text-center w-full mb-16">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight neon-text" style={{fontFamily: 'var(--font-inter)'}}>
        <Link href="/" className="hover:opacity-80 transition-opacity">
          deadmanoz.xyz
        </Link>
      </h1>
      <p className="text-lg md:text-xl text-synthwave-peach/80 mt-6">
        Mostly Bitcoin, occasionally AI, infrequently other stuff
      </p>
    </header>
  );
}
