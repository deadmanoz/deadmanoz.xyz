import Link from "next/link";

interface HeaderProps {
  showTitle?: boolean;
  activePage?: "home" | "research" | "blog";
}

export function Header({ showTitle = true, activePage }: HeaderProps) {
  const navLinkStyle = (page: string): React.CSSProperties => {
    const isActive = activePage === page;
    return isActive
      ? {
          color: 'var(--theme-neon-green)',
          textShadow: '0 0 8px rgba(32, 229, 22, 0.3)',
          borderBottom: '2px solid var(--theme-neon-green)',
          paddingBottom: '4px',
        }
      : {};
  };

  const navLinkClass = (page: string) => {
    const isActive = activePage === page;
    return `text-lg font-medium transition-colors duration-300 ${
      isActive ? "" : "text-synthwave-neon-cyan hover:text-synthwave-neon-orange"
    }`;
  };

  return (
    <header className={`py-10 text-center w-full ${showTitle ? 'mb-16' : 'mb-10'}`}>
      {showTitle && (
        <>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight neon-text" style={{fontFamily: 'var(--font-inter)'}}>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              deadmanoz.xyz
            </Link>
          </h1>
          <p className="text-lg md:text-xl text-synthwave-peach/80 mt-6">
            Mostly Bitcoin, occasionally AI, infrequently other stuff
          </p>
        </>
      )}
      <nav className={`${showTitle ? 'mt-6' : 'mt-0'} flex justify-center gap-8 pb-8`}>
        <Link href="/" className={navLinkClass("home")} style={navLinkStyle("home")}>
          Home
        </Link>
        <Link href="/research" className={navLinkClass("research")} style={navLinkStyle("research")}>
          Research
        </Link>
        <Link href="/blog" className={navLinkClass("blog")} style={navLinkStyle("blog")}>
          Blog
        </Link>
      </nav>
    </header>
  );
}
