import Link from "next/link";

export function SiteNav() {
  return (
    <nav className="border-b border-border-soft bg-surface/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-5 px-4 py-3 text-sm sm:px-6">
        <Link href="/" className="font-semibold tracking-tight hover:text-accent">
          LX708 <span className="text-accent">Tone Library</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 text-muted">
          <Link href="/gids" className="hover:text-accent">
            📖 Opnamegids
          </Link>
          <Link href="/studio" className="hover:text-accent">
            🎛 Studio-routing
          </Link>
        </div>
      </div>
    </nav>
  );
}
