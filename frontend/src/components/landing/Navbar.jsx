import { useState } from "react";
import { Link } from "react-router-dom";

const navItems = [
  { href: "#platform", label: "Platform" },
  { href: "#modules", label: "Modules" },
  { href: "#workflow", label: "Workflow" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-primary grid place-items-center shadow-[0_6px_20px_-6px_hsl(24_95%_53%/0.6)]">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 21V9l9-6 9 6v12" strokeLinejoin="round" />
              <path d="M9 21v-8h6v8" />
            </svg>
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm font-extrabold tracking-tight truncate">SocietySync</div>
            <div className="hidden sm:block text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              OS for Communities
            </div>
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          {navItems.map((i) => (
            <a key={i.href} href={i.href} className="hover:text-foreground transition-colors py-2">
              {i.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/signin"
            className="hidden lg:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2"
          >
            Sign in
          </Link>

          <Link
            to="/signup"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-3.5 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-95 transition touch-manipulation"
          >
            Get started
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden w-11 h-11 grid place-items-center rounded-lg border border-border active:scale-95 transition touch-manipulation"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? (
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background animate-in">
          <div className="px-4 py-3 flex flex-col">
            {navItems.map((i) => (
              <a
                key={i.href}
                href={i.href}
                className="text-sm font-semibold py-3.5 px-2 rounded-md active:bg-accent touch-manipulation border-b border-border/60 last:border-0"
                onClick={() => setOpen(false)}
              >
                {i.label}
              </a>
            ))}
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-4 py-3.5 text-sm font-semibold active:scale-[0.98] transition touch-manipulation"
            >
              Get started
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
