const stats = [
  { k: "63%", v: "Faster complaint resolution", d: "Avg. from 96h → 35h across pilot societies." },
  { k: "94%", v: "On-time maintenance collection", d: "Reminders + penalty automation kill defaults." },
  { k: "12x", v: "Fewer gate disputes", d: "OTP + signed tokens beat paper visitor books." },
  { k: "₹9.2L", v: "Annual admin savings", d: "For an average 480-flat society." },
];

export default function Metrics() {
  return (
    <section className="border-b border-border/70 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 md:py-20 grid md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.v}>
            <div className="text-5xl font-extrabold tracking-tight text-primary">{s.k}</div>
            <div className="mt-3 text-sm font-semibold">{s.v}</div>
            <div className="mt-1 text-xs text-background/60 leading-relaxed">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
