const footerCols = [
  { t: "Platform", l: ["Billing Ledger", "Complaints", "Gate Security", "Amenities", "Notices"] },
  { t: "Company", l: ["About", "Careers", "Customers", "Press", "Contact"] },
  { t: "Resources", l: ["Docs", "API", "Changelog", "Security", "Status"] },
  { t: "Legal", l: ["Privacy", "Terms", "DPA", "Cookies"] },
];

export default function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M3 21V9l9-6 9 6v12" strokeLinejoin="round" />
                  <path d="M9 21v-8h6v8" />
                </svg>
              </div>
              <div className="text-sm font-extrabold">SocietySync</div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
              The operating system for residential societies. Built in Bengaluru, deployed in 42 cities.
            </p>
            <div className="mt-6 flex items-center gap-2 text-muted-foreground">
              {["twitter", "linkedin", "github"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="w-10 h-10 grid place-items-center rounded-md border border-border hover:text-foreground hover:border-foreground active:scale-95 transition touch-manipulation"
                >
                  <span className="text-[10px] font-bold uppercase">{s[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerCols.map((c) => (
            <div key={c.t}>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-4">{c.t}</div>
              <ul className="space-y-2.5">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="text-sm text-foreground/80 hover:text-primary transition">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <div>© 2026 SocietySync Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex items-center gap-4 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
            <span>v3.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
