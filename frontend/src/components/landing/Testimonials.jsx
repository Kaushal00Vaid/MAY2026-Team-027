import SectionLabel from "./SectionLabel";

const testimonials = [
  {
    q: "We closed our first audit with zero adjusting entries in the ledger. That's never happened in 14 years.",
    n: "Vikram Aiyar",
    r: "President · Prestige Falcon City",
  },
  {
    q: "Complaints used to die in WhatsApp. Now every ticket has an owner and a clock. Residents can see it.",
    n: "Suchitra Menon",
    r: "Treasurer · Brigade Cornerstone",
  },
  {
    q: "The gate app cut visitor entry from a 90-second phone call to a 4-second approval. Guards love it.",
    n: "Rohit Bansal",
    r: "Facility Head · Godrej Emerald",
  },
];

export default function Testimonials() {
  return (
    <section className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 md:py-28">
        <SectionLabel
          eyebrow="From the committee"
          title="Committees run societies. We just give them leverage."
        />
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {testimonials.map((x) => (
            <figure key={x.n} className="rounded-2xl border border-border bg-card p-7 flex flex-col">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary/40 mb-4" fill="currentColor">
                <path d="M9 7H5a2 2 0 00-2 2v4a2 2 0 002 2h2v2a2 2 0 01-2 2H4v2h1a4 4 0 004-4V7zm10 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h2v2a2 2 0 01-2 2h-1v2h1a4 4 0 004-4V7z" />
              </svg>
              <blockquote className="text-[15px] leading-relaxed font-medium flex-1">
                &ldquo;{x.q}&rdquo;
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-border">
                <div className="text-sm font-bold">{x.n}</div>
                <div className="text-xs text-muted-foreground">{x.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
