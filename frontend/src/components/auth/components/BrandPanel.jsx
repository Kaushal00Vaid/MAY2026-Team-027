import { CheckCircle2 } from "lucide-react";

const CONTENT = {
  signup: {
    headline: "Why join",
    headlineAccent: "SocietySync?",
    subtitle: "The all-in-one platform for modern residential societies.",
    features: [
      {
        title: "Streamlined Management",
        description:
          "Manage your entire property portfolio from a single, intuitive dashboard.",
      },
      {
        title: "Secure Financials",
        description:
          "Bank-grade security for tracking dues, expenses, and comprehensive reporting.",
      },
      {
        title: "Real-time Connectivity",
        description:
          "Keep residents engaged with instant updates, polls, and seamless communication.",
      },
    ],
    caption: "Community Management Platform",
  },

  signin: {
    headline: "Your society,",
    headlineAccent: "managed smarter.",
    subtitle:
      "The complete residential management platform — built for committees, residents, and staff alike.",
    features: [
      {
        title: "Committee-led Governance",
        description:
          "Empower your core committee to manage notices, approvals, meetings, and society decisions — all in one place.",
      },
      {
        title: "Resident Self-service",
        description:
          "Residents can raise complaints, track maintenance dues, book amenities, and stay updated in real time.",
      },
      {
        title: "Staff & Security Control",
        description:
          "Manage visitor logs, gate access, housekeeping, and security staff shifts with full audit trails.",
      },
    ],
    caption: "Residential Management Platform",
  },
};

export default function BrandPanel({ variant = "signup" }) {
  const { headline, headlineAccent, subtitle, features, caption } =
    CONTENT[variant] ?? CONTENT.signup;

  return (
    <div className="relative hidden lg:flex flex-col justify-between h-full bg-[#0f1a2b] text-white p-10 overflow-hidden">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2e45]/80 via-[#0f1a2b] to-[#0a1220] pointer-events-none" />

      {/* Decorative glow circles */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 -right-20 w-60 h-60 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top: Logo & headline */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SocietySync</span>
        </div>

        <h1 className="text-3xl font-bold leading-tight text-white mb-3">
          {headline}{" "}
          <span className="text-primary">{headlineAccent}</span>
        </h1>
        <p className="text-white/50 text-sm mb-10 leading-relaxed">{subtitle}</p>

        <ul className="space-y-6">
          {features.map((f) => (
            <li key={f.title} className="flex gap-4">
              <div className="mt-0.5 shrink-0">
                <CheckCircle2 size={18} className="text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90 mb-0.5">{f.title}</p>
                <p className="text-xs text-white/45 leading-relaxed">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom: Society image */}
      <div className="relative z-10 mt-8">
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#f5ede0]">
          <img
            src="/society.png"
            alt="SocietySync – Community Buildings"
            className="w-full h-56 object-cover object-top"
            draggable={false}
          />
          <div className="px-5 py-3 flex items-center gap-3 bg-[#1a0e02]">
            <img src="/society.png" alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-primary/40" />
            <div>
              <p className="text-[11px] font-bold text-white/90 tracking-widest uppercase">Society Sync</p>
              <p className="text-[10px] text-white/40">{caption}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
