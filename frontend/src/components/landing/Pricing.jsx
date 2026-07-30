import { useState } from "react";
import { Link } from "react-router-dom";
import Chip from "./Chip";
import { motion } from "framer-motion";
import { MiniBuilding } from "@/components/auth/components/AuthDecorations";

const ANNUAL_FACTOR = 0.8;

const tiers = [
  {
    n: "Starter",
    priceM: 19,
    d: "For societies under 100 flats getting started.",
    f: ["Billing & ledger", "Complaint tracking", "Notice board", "Email support"],
    cta: "Start free",
    ctaTo: "/signup",
    accent: false,
  },
  {
    n: "Growth",
    priceM: 34,
    d: "For managed societies of 100–800 flats.",
    f: [
      "Everything in Starter",
      "Gate security app",
      "Amenity booking + heatmap",
      "SLA escalation matrix",
      "Priority WhatsApp support",
    ],
    cta: "Book a demo",
    ctaTo: "/signup",
    accent: true,
  },
  {
    n: "Enterprise",
    priceM: null,
    d: "For property managers running multiple societies.",
    f: [
      "Multi-society console",
      "Custom integrations & SSO",
      "Dedicated CSM",
      "99.99% SLA & audit trail",
    ],
    cta: "Talk to sales",
    ctaTo: "/signup",
    accent: false,
  },
];

function fmtPrice(priceM, billing) {
  if (priceM === null) return { p: "Custom", u: "" };
  const v = billing === "annual" ? Math.round(priceM * ANNUAL_FACTOR) : priceM;
  return { p: `₹${v}`, u: "/flat/month" };
}

export default function Pricing() {
  const [billing, setBilling] = useState("annual");

  return (
    <section id="pricing" className="border-b border-border/70 bg-stone-50/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 py-16 sm:py-20 md:py-28">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2 justify-center font-mono text-[11px] tracking-widest uppercase text-primary">
            <span className="h-px w-6 bg-primary" />
            Pricing
            <span className="h-px w-6 bg-primary" />
          </div>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
            Priced per flat.{" "}
            <span className="relative inline-block">
              No setup fees.
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
            </span>{" "}
            Cancel anytime.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            Every plan includes double-entry ledger, unlimited residents, and free migration from
            your current spreadsheets.
          </p>
          {/* Billing toggle */}
          <div
            role="tablist"
            aria-label="Billing period"
            className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
          >
            {["monthly", "annual"].map((b) => (
              <button
                key={b}
                role="tab"
                aria-selected={billing === b}
                onClick={() => setBilling(b)}
                className={`relative min-h-[40px] px-4 sm:px-5 rounded-full text-xs font-semibold capitalize transition active:scale-[0.97] touch-manipulation flex items-center justify-center ${
                  billing === b ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {billing === b && (
                  <motion.div
                    layoutId="pricing-tab-indicator"
                    className="absolute inset-0 rounded-full bg-foreground"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{b}</span>
                {b === "annual" && (
                  <span className="relative z-10 ml-1.5 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-10 sm:mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {tiers.map((t) => {
            const { p, u } = fmtPrice(t.priceM, billing);
            return (
              <div
                key={t.n}
                className={`relative rounded-2xl border p-6 sm:p-7 flex flex-col transition ${
                  t.accent
                    ? "bg-foreground text-background border-foreground shadow-2xl lg:-translate-y-3 sm:col-span-2 lg:col-span-1"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="text-sm font-bold tracking-widest uppercase">{t.n}</div>
                  {t.accent && <Chip tone="primary">Most popular</Chip>}
                </div>
                {t.n === "Enterprise" && (
                  <MiniBuilding className="absolute -bottom-4 right-0 w-32 h-auto text-primary opacity-5 pointer-events-none" />
                )}
                <div className="mt-5 flex items-baseline gap-1 relative z-10">
                  <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">{p}</div>
                  <div className={`text-sm ${t.accent ? "text-background/60" : "text-muted-foreground"}`}>{u}</div>
                </div>
                {t.priceM !== null && billing === "annual" && (
                  <div className="mt-1 text-[11px] font-mono text-primary">
                    Billed annually · ₹{Math.round(t.priceM * ANNUAL_FACTOR * 12)}/flat/year
                  </div>
                )}
                <p className={`mt-3 text-sm ${t.accent ? "text-background/70" : "text-muted-foreground"}`}>
                  {t.d}
                </p>
                <ul className="mt-6 space-y-3 flex-1 relative z-10">
                  {t.f.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 mt-0.5 shrink-0 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={t.ctaTo}
                  className={`mt-8 min-h-[48px] rounded-lg py-3 text-sm font-semibold transition active:scale-[0.98] touch-manipulation flex items-center justify-center relative z-10 ${
                    t.accent
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          All prices exclude GST. Volume discounts for societies over 1,000 flats —{" "}
          <a href="#faq" className="text-primary font-semibold underline-offset-4 hover:underline">
            talk to us
          </a>
          .
        </div>
      </div>
    </section>
  );
}
