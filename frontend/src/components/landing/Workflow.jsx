import SectionLabel from "./SectionLabel";
import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    t: "Onboard your society",
    d: "Import the resident directory from any CSV. We auto-detect owners, tenants, vacant flats, and generate secure invites.",
  },
  {
    n: "02",
    t: "Configure billing rules",
    d: "Set per-sqft or flat-rate maintenance, penalty ladders, and sinking-fund contributions. The ledger writes double-entry automatically.",
  },
  {
    n: "03",
    t: "Route complaints & gate",
    d: "Wire categories to owners, add an escalation matrix, and hand tablets to security. Real-time WebSocket keeps everyone in sync.",
  },
  {
    n: "04",
    t: "Report to the committee",
    d: "Monthly transparency report generates itself — collections, expenses, SLA breaches, amenity utilization, all reconciled.",
  },
];

export default function Workflow() {
  return (
    <section id="workflow" className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 md:py-28">
        <SectionLabel
          eyebrow="How it fits together"
          title={
            <>
              Four weeks from spreadsheet chaos to{" "}
              <span className="relative inline-block">
                audited operations.
                <svg
                  className="absolute -bottom-2 sm:-bottom-3 left-0 w-[105%] h-3 sm:h-4 text-[#789048]"
                  viewBox="0 0 300 30"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d="M 10 25 C 80 -10, 150 40, 220 5 C 250 -10, 290 20, 290 20 C 250 -5, 100 40, 20 15" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </span>
            </>
          }
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative rounded-xl border border-border bg-card p-6">
              <div className="font-mono text-[11px] tracking-widest text-primary">{s.n}</div>
              <h3 className="mt-3 text-lg font-extrabold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-2 text-primary/30">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
