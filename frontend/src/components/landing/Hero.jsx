import { Link } from "react-router-dom";
import Chip from "./Chip";

function HeroDeviceMock() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl"
      />
      <div className="relative rounded-2xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Browser chrome */}
        <div className="h-9 border-b border-border flex items-center px-4 gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-4 text-[11px] font-mono text-muted-foreground">
            societysync.app / admin / overview
          </div>
        </div>

        <div className="grid grid-cols-12 min-h-[420px]">
          {/* Sidebar */}
          <aside className="col-span-3 border-r border-border p-3 space-y-1 bg-stone-50/60">
            {[
              ["Overview", true],
              ["Complaints", false],
              ["Billing Ledger", false],
              ["Facility", false],
              ["Residents", false],
            ].map(([label, active]) => (
              <div
                key={String(label)}
                className={`text-[11px] font-semibold px-2.5 py-2 rounded-md ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </div>
            ))}
          </aside>

          {/* Main content */}
          <div className="col-span-9 p-4 space-y-3">
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { l: "Collected", v: "₹4.82L", t: "+12%" },
                { l: "Outstanding", v: "₹86K", t: "-8%" },
                { l: "Open SLA", v: "14", t: "3 urgent" },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-border p-2.5">
                  <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    {k.l}
                  </div>
                  <div className="text-lg font-extrabold mt-0.5">{k.v}</div>
                  <div className="text-[10px] text-primary font-semibold">{k.t}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Collections · Last 30 days
                </div>
                <Chip tone="success">Live</Chip>
              </div>
              <svg viewBox="0 0 300 80" className="w-full h-20">
                <defs>
                  <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(24 95% 53%)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(24 95% 53%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 L20,52 L40,58 L60,42 L80,48 L100,34 L120,40 L140,28 L160,32 L180,20 L200,26 L220,18 L240,22 L260,12 L280,16 L300,8 L300,80 L0,80 Z"
                  fill="url(#hero-grad)"
                />
                <path
                  d="M0,60 L20,52 L40,58 L60,42 L80,48 L100,34 L120,40 L140,28 L160,32 L180,20 L200,26 L220,18 L240,22 L260,12 L280,16 L300,8"
                  fill="none"
                  stroke="hsl(24 95% 53%)"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Complaint ledger */}
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Complaint Ledger
                </div>
                {[
                  ["#1284 · Lift stuck", "SLA 2h", "critical"],
                  ["#1279 · Water pressure", "SLA 8h", "warn"],
                  ["#1275 · Parking dispute", "Resolved", "success"],
                ].map(([t, s, tone]) => (
                  <div
                    key={t}
                    className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0"
                  >
                    <div className="text-[11px] font-medium truncate pr-2">{t}</div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        tone === "critical"
                          ? "bg-red-50 text-red-700"
                          : tone === "warn"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </div>

              {/* Gate heatmap */}
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                  Gate · Last hour
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const v = Math.round(Math.abs(Math.sin(i * 1.7)) * 100);
                    const opacity = 0.15 + (v / 100) * 0.85;
                    return (
                      <div
                        key={i}
                        className="aspect-square rounded-sm"
                        style={{ background: `hsl(24 95% 53% / ${opacity})` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>00:00</span>
                  <span>Peak 19:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <div className="absolute -bottom-6 -left-6 w-56 rounded-xl border border-border bg-card shadow-2xl p-3 hidden md:block">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 grid place-items-center">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-emerald-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold">Visitor approved</div>
            <div className="text-[10px] text-muted-foreground">B-402 · Zomato · 12s ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border/70">
      {/* Dot grid bg */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--dot-grid) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />
      {/* Gradient blob */}
      <div aria-hidden className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full bg-primary/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 pt-12 sm:pt-16 md:pt-24 pb-16 sm:pb-20 md:pb-28">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Copy */}
          <div className="lg:col-span-6">
            <div className="relative">
              {/* Cute scribble star */}
              <div className="absolute -top-12 -left-14 hidden md:block text-[#789048]">
                <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
                  <path d="M 50 5 L 60 38 L 95 50 L 60 62 L 50 95 L 40 62 L 5 50 L 40 38 Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 50 20 L 55 43 L 80 50 L 55 57 L 50 80 L 45 57 L 20 50 L 45 43 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              
              <h1 className="mt-5 sm:mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-[0.98]">
                The operating system for
                <span className="block text-primary relative inline-block">
                  residential societies.
                  {/* Cute scribble underline */}
                  <svg
                    className="absolute -bottom-5 sm:-bottom-7 left-0 w-[105%] h-6 sm:h-8 text-[#789048]"
                    viewBox="0 0 300 30"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path d="M 10 25 C 80 -10, 150 40, 220 5 C 250 -10, 290 20, 290 20 C 250 -5, 100 40, 20 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
            </div>

            <p className="mt-8 sm:mt-10 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Replace six spreadsheets, three WhatsApp groups, and a wall of paper registers.
              SocietySync unifies billing, complaints, gate security, and governance into a single{" "}
              <span className="relative inline-block text-foreground font-semibold px-1">
                audited
                {/* Cute circled text */}
                <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] text-[#789048]" viewBox="0 0 100 40" fill="none" preserveAspectRatio="none">
                  <path d="M 50 5 C 20 5, 5 15, 5 20 C 5 25, 20 35, 50 35 C 80 35, 95 25, 95 20 C 95 12, 80 2, 45 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{" "}
              system of record.
            </p>

            <div className="relative mt-8 sm:mt-10 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              {/* Cute scribble arrow pointing to CTA */}
              <div className="absolute -top-16 left-32 hidden sm:block text-[#789048]">
                <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                  {/* Loopy arrow path */}
                  <path d="M 80 10 C 120 40, 80 80, 50 50 C 20 20, 10 60, 25 90" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 10 75 L 25 95 L 45 80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3.5 text-sm font-semibold shadow-[0_10px_30px_-10px_hsl(24_95%_53%/0.7)] hover:brightness-110 active:scale-[0.98] transition touch-manipulation"
              >
                Get started free
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#modules"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3.5 text-sm font-semibold hover:bg-accent active:scale-[0.98] transition touch-manipulation"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21" fill="currentColor" />
                </svg>
                Watch product tour
              </a>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-md">
              {[
                { k: "2,400+", v: "Societies" },
                { k: "₹184Cr", v: "Dues collected" },
                { k: "99.98%", v: "Uptime SLA" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-xl sm:text-2xl font-extrabold tracking-tight">{s.k}</div>
                  <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device mock */}
          <div className="lg:col-span-6 -mx-4 sm:mx-0">
            <HeroDeviceMock />
          </div>
        </div>
      </div>
    </section>
  );
}
