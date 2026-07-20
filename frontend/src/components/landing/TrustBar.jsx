const logos = [
  "Prestige Falcon",
  "Lodha Belmondo",
  "Godrej Emerald",
  "Brigade Cornerstone",
  "DLF Camellias",
  "Sobha Dream",
  "Oberoi Sky",
  "Mahindra Vivante",
];

export default function TrustBar() {
  return (
    <section className="border-b border-border/70 bg-stone-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 py-8 sm:py-10">
        <div className="text-center text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-6">
          Trusted by managing committees across 42 cities
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 sm:gap-x-6 gap-y-3">
          {logos.map((l) => (
            <div
              key={l}
              className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition"
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
