import { useState } from "react";
import { Link } from "react-router-dom";
import SectionLabel from "./SectionLabel";
import Chip from "./Chip";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { motion } from "framer-motion";

/* ── Screen previews ─────────────────────────────────────────── */
function AdminScreenPreview() {
  const rows = [
    ["#1284", "Lift stuck · B-Wing", "Electrical", "2h 14m", "critical"],
    ["#1281", "Water pressure low", "Plumbing", "6h 02m", "warn"],
    ["#1279", "Intercom dead · A-207", "Networking", "12h", "info"],
    ["#1275", "Parking dispute", "Governance", "Resolved", "success"],
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Complaint Ledger
          </div>
          <div className="text-lg font-extrabold">14 open · 3 breach risk</div>
        </div>
        <Chip tone="primary">Auto-routed</Chip>
      </div>
      <div className="text-[10px] font-mono uppercase text-muted-foreground grid grid-cols-12 gap-2 pb-2 border-b border-border">
        <div className="col-span-1">ID</div>
        <div className="col-span-5">Ticket</div>
        <div className="col-span-3">Category</div>
        <div className="col-span-3 text-right">SLA</div>
      </div>
      {rows.map((r) => (
        <div key={r[0]} className="grid grid-cols-12 gap-2 py-2.5 border-b border-border/60 last:border-0 text-[12px]">
          <div className="col-span-1 font-mono text-muted-foreground">{r[0]}</div>
          <div className="col-span-5 font-medium truncate">{r[1]}</div>
          <div className="col-span-3 text-muted-foreground">{r[2]}</div>
          <div className="col-span-3 text-right">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                r[4] === "critical"
                  ? "bg-red-50 text-red-700"
                  : r[4] === "warn"
                  ? "bg-amber-50 text-amber-700"
                  : r[4] === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {r[3]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResidentScreenPreview() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 text-white p-5">
        <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
          Maintenance · November 2026
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-3xl font-extrabold">₹8,420</div>
          <div className="text-xs text-emerald-400 font-mono">Due in 6 days</div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold">Pay now</button>
          <button className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold">
            View breakdown
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Ticket · #1281
          </div>
          <div className="mt-1 text-sm font-semibold">Water pressure low</div>
          <div className="mt-1 text-[11px] text-primary">Owner: R. Sinha · ETA today</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Amenity · Sat 6 PM
          </div>
          <div className="mt-1 text-sm font-semibold">Clubhouse · Booked</div>
          <div className="mt-1 text-[11px] text-emerald-600">Signed QR token issued</div>
        </div>
      </div>
    </div>
  );
}

function SecurityScreenPreview() {
  return (
    <div className="space-y-3">
      {[
        { name: "Rakesh · Zomato", flat: "B-402", ttl: 240 },
        { name: "Maria D'Silva", flat: "A-1204", ttl: 128 },
        { name: "Blue Dart", flat: "C-706", ttl: 42 },
      ].map((v) => (
        <div key={v.name} className="rounded-lg border border-border p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-sm">
            {v.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{v.name}</div>
            <div className="text-[11px] text-muted-foreground">
              Flat {v.flat} · TTL {v.ttl}s · OTP verified
            </div>
            <div className="mt-1.5 h-1 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, (v.ttl / 240) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <button className="w-8 h-8 rounded-md bg-emerald-500 text-white grid place-items-center">✓</button>
            <button className="w-8 h-8 rounded-md border border-border grid place-items-center text-muted-foreground">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
const roles = [
  {
    k: "admin",
    title: "For the Managing Committee",
    subtitle: "Command center for accountability",
    screens: ["Ledger", "SLA Board", "Facility", "Residents"],
    points: [
      "Real-time cash position and outstanding-by-tower",
      "SLA breach banners with one-click escalation",
      "Segmented broadcasts (owners / tenants / defaulters)",
    ],
  },
  {
    k: "resident",
    title: "For Residents",
    subtitle: "One app for everything",
    screens: ["Home", "Pay", "Complaint", "Book", "Notices"],
    points: [
      "See exactly where your maintenance money goes",
      "Complaint tracker with owner + ETA + SLA clock",
      "Signed-QR amenity booking with quota control",
    ],
  },
  {
    k: "security",
    title: "For Gate Security",
    subtitle: "Zero-friction access control",
    screens: ["Gate", "Helpers", "Log"],
    points: [
      "Visitor approvals in 4 seconds via push",
      "Helper biometric check-in and attendance",
      "Immutable entry/exit log for audits",
    ],
  },
];

export default function Modules() {
  const [active, setActive] = useState("admin");
  const current = roles.find((r) => r.k === active);

  return (
    <section id="modules" className="border-b border-border/70 bg-stone-50/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8 py-16 sm:py-20 md:py-28">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionLabel 
            eyebrow="Built for three audiences" 
            title={
              <>
                One system. Three purpose-built{" "}
                <span className="relative inline-block px-1">
                  cockpits.
                  <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] text-[#789048]" viewBox="0 0 100 40" fill="none" preserveAspectRatio="none">
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      d="M 50 5 C 20 5, 5 15, 5 20 C 5 25, 20 35, 50 35 C 80 35, 95 25, 95 20 C 95 12, 80 2, 45 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </>
            } 
          />
          <div
            role="tablist"
            className="flex gap-1 bg-card border border-border rounded-lg p-1 w-full md:w-auto overflow-x-auto no-scrollbar"
          >
            {roles.map((r) => (
              <button
                key={r.k}
                role="tab"
                aria-selected={active === r.k}
                onClick={() => setActive(r.k)}
                className={`relative flex-1 md:flex-none min-h-[40px] px-4 py-2 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition active:scale-[0.97] touch-manipulation flex items-center justify-center ${
                  active === r.k ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active === r.k && (
                  <motion.div
                    layoutId="modules-tab-indicator"
                    className="absolute inset-0 rounded-md bg-foreground"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{r.k}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-12 gap-8 items-start">
          {/* Info */}
          <div className="lg:col-span-5">
            <div className="text-xs font-mono uppercase tracking-widest text-primary">{current.subtitle}</div>
            <h3 className="mt-2 text-3xl font-extrabold tracking-tight">{current.title}</h3>
            <ul className="mt-6 space-y-4">
              {current.points.map((p) => (
                <li key={p} className="flex gap-3">
                  <div className="mt-1 w-5 h-5 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
            >
              Try this cockpit in the demo →
            </Link>
          </div>

          {/* Screen preview */}
          <div className="lg:col-span-7">
            <CardContainer className="inter-var w-full py-0">
              <CardBody className="relative w-full h-auto">
            <CardItem translateZ="30" className="relative w-full rounded-2xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
              <div className="h-8 border-b border-border flex items-center px-3 gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <div className="ml-3 text-[10px] font-mono text-muted-foreground capitalize">
                  {current.k}.societysync.app
                </div>
              </div>
              <div className="grid grid-cols-4 border-b border-border">
                {current.screens.map((s, i) => (
                  <div
                    key={s}
                    className={`text-center py-2.5 text-[11px] font-semibold border-r border-border last:border-0 ${
                      i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </div>
                ))}
              </div>
              <div className="p-5 min-h-[320px]">
                {current.k === "admin" && <AdminScreenPreview />}
                {current.k === "resident" && <ResidentScreenPreview />}
                {current.k === "security" && <SecurityScreenPreview />}
              </div>
            </CardItem>
            </CardBody>
            </CardContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
