import Chip from "./Chip";
import SectionLabel from "./SectionLabel";

const pillars = [
  {
    tag: "Epic 1",
    title: "Financial system of record",
    body: "Double-entry ledger, dynamic billing rules, penalty engine, and a Society Transparency Report residents can actually read.",
    bullets: ["Auto-reconciliation", "GST-ready exports", "Payment gateway agnostic"],
    icon: <path d="M3 3v18h18M7 15l4-4 4 4 5-6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    tag: "Epic 2",
    title: "SLA-tracked complaints",
    body: "Every ticket has a clock, an owner, and an escalation path. Root-cause tagging turns tickets into preventive maintenance.",
    bullets: ["Auto-routing by category", "Escalation matrix", "Root-cause analytics"],
    icon: <path d="M12 8v4l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" strokeLinecap="round" />,
  },
  {
    tag: "Epic 3",
    title: "Signed-token gate security",
    body: "OTP + signed-QR visitor tokens with TTL, face-check verification, and helper attendance backed by biometric logs.",
    bullets: ["Realtime WebSocket alerts", "Panic button routing", "Helper biometric register"],
    icon: <path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z" strokeLinejoin="round" />,
  },
  {
    tag: "Epic 4",
    title: "Governance & analytics",
    body: "Notice boards, polls with quorum, amenity heatmaps, and pre-aggregated utilization tables that scale past a million rows.",
    bullets: ["Segmented broadcasts", "Signed booking tokens", "Daily cron aggregations"],
    icon: <path d="M3 12h4l3-8 4 16 3-8h4" strokeLinecap="round" strokeLinejoin="round" />,
  },
];

export default function Pillars() {
  return (
    <section id="platform" className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 md:py-28">
        <SectionLabel
          eyebrow="The Platform"
          title="Four epics. One integrated backbone."
          sub="SocietySync isn't a folder of loose features — every module writes to the same audited ledger, so numbers reconcile at the end of the month without a call to the accountant."
        />
        <div className="mt-14 grid md:grid-cols-2 gap-5">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="group relative rounded-2xl border border-border bg-card p-7 hover:border-primary/40 hover:shadow-[0_20px_60px_-30px_hsl(24_95%_53%/0.5)] transition"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    {p.icon}
                  </svg>
                </div>
                <Chip tone="primary">{p.tag}</Chip>
              </div>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              <ul className="mt-5 space-y-2">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
