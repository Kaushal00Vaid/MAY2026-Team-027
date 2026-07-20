import { useState } from "react";
import SectionLabel from "./SectionLabel";

const items = [
  {
    q: "How is SocietySync different from a WhatsApp group?",
    a: "WhatsApp has no ledger, no SLA, no audit trail, and no accountability. SocietySync is a system of record — every complaint has an owner and a clock, every rupee has a double-entry, every visitor has a signed token.",
  },
  {
    q: "Do we need to move all our accounting?",
    a: "No. Start with just billing. The ledger runs in parallel with your existing books and can export to Tally, Zoho, or plain CSV. Most societies deprecate their old spreadsheets within 60 days.",
  },
  {
    q: "Is the resident data secure?",
    a: "Yes. Data is encrypted at rest and in transit, gated by role-based access. We're SOC 2 Type II in progress and never sell or share resident data with third parties.",
  },
  {
    q: "What happens on a payment gateway outage?",
    a: "The ledger queues transactions and reconciles once the gateway recovers. Residents can also pay via UPI intent — the platform is gateway-agnostic.",
  },
  {
    q: "Can property managers run multiple societies?",
    a: "Yes. The Enterprise plan includes a multi-society console with consolidated dashboards, cross-society reports, and delegated admin roles.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="border-b border-border/70">
      <div className="mx-auto max-w-4xl px-4 sm:px-5 lg:px-8 py-16 sm:py-20 md:py-28">
        <SectionLabel eyebrow="FAQ" title="Answers before you ask." />
        <div className="mt-8 sm:mt-10 divide-y divide-border border-y border-border">
          {items.map((it, i) => (
            <button
              key={it.q}
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              className="w-full text-left py-5 min-h-[64px] flex items-start gap-4 group active:bg-accent/40 touch-manipulation transition"
            >
              <div className="flex-1">
                <div className="font-semibold text-base group-hover:text-primary transition">{it.q}</div>
                {open === i && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
                )}
              </div>
              <div
                className={`w-7 h-7 rounded-full border border-border grid place-items-center shrink-0 transition ${
                  open === i ? "bg-primary text-primary-foreground border-primary rotate-45" : ""
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
