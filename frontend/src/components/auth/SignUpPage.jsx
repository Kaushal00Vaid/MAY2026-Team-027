import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Phone, Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandPanel from "./components/BrandPanel";
import FormField from "./components/FormField";
import DividerOr from "./components/DividerOr";
import SocialButton from "./components/SocialButton";
import {
  Sparkle,
  DiamondDot,
  HexRing,
  CircleRing,
  MiniBuilding,
  SkylineWatermark,
  FloatingChip,
  DotGridBg,
} from "./components/AuthDecorations";

const MOCK_SOCIETIES = [
  "Green Valley Residency",
  "Sunrise Heights",
  "The Pinnacle",
  "Harmony Gardens",
  "Sunset Terrace",
  "Blue Horizon Towers",
];

export default function SignUpPage() {
  const [form, setForm] = useState({ fullName: "", phone: "", society: "" });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSocietySelect = (society) => {
    setForm((prev) => ({ ...prev, society }));
    setDropdownOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sign up form submitted:", form);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ─────────────────────────────────────── */}
      <div className="lg:w-[42%] hidden lg:block">
        <BrandPanel />
      </div>

      {/* ── Right decorated panel ─────────────────────────────────── */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #fdf9f4 0%, #faf6ef 45%, #f4ede0 100%)",
        }}
      >
        {/* Dot-grid texture */}
        <DotGridBg />

        {/* ── Ambient gradient blobs ── */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(216,121,67,0.10) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 -left-16 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(82,117,117,0.08) 0%, transparent 70%)",
          }}
        />

        {/* ── Skyline watermark (top-right) ── */}
        <SkylineWatermark
          className="absolute top-0 right-0 text-[#0f1a2b] pointer-events-none"
          style={{ width: 260, opacity: 0.6 }}
        />

        {/* ── Mini buildings ── */}
        <MiniBuilding
          className="absolute bottom-10 left-6 text-primary auth-float-2"
          width={38}
          style={{ opacity: 0.55 }}
        />
        <MiniBuilding
          className="absolute top-16 left-[14%] text-secondary auth-float-3"
          width={28}
          style={{ opacity: 0.40 }}
        />

        {/* ── Sparkles ── */}
        <Sparkle
          size={18}
          className="absolute top-10 left-[30%] text-primary auth-sparkle"
          style={{ opacity: 0.7, animationDelay: "0s" }}
        />
        <Sparkle
          size={13}
          className="absolute top-[22%] right-10 text-secondary auth-sparkle"
          style={{ opacity: 0.6, animationDelay: "1.1s" }}
        />
        <Sparkle
          size={20}
          className="absolute bottom-[18%] right-8 text-primary auth-sparkle"
          style={{ opacity: 0.55, animationDelay: "2.2s" }}
        />
        <Sparkle
          size={11}
          className="absolute bottom-12 right-[28%] text-secondary auth-sparkle"
          style={{ opacity: 0.5, animationDelay: "0.6s" }}
        />

        {/* ── Diamond dots ── */}
        <DiamondDot
          size={9}
          className="absolute top-[38%] left-8 text-primary"
          style={{ opacity: 0.35 }}
        />
        <DiamondDot
          size={7}
          className="absolute bottom-[35%] right-5 text-secondary"
          style={{ opacity: 0.30 }}
        />

        {/* ── Hex / circle rings ── */}
        <HexRing
          size={52}
          className="absolute top-[12%] right-[8%] text-primary auth-spin"
          style={{ opacity: 0.22 }}
        />
        <CircleRing
          size={44}
          className="absolute bottom-[22%] left-[6%] text-secondary auth-spin"
          style={{ opacity: 0.18, animationDirection: "reverse" }}
        />
        <HexRing
          size={34}
          className="absolute bottom-8 right-[20%] text-primary auth-spin"
          style={{ opacity: 0.16, animationDuration: "24s" }}
        />

        {/* ── Floating stat chips ── */}
        <FloatingChip
          chipIndex={0}
          animClass="auth-chip-1"
          className="absolute top-[12%] left-[6%]"
        />
        <FloatingChip
          chipIndex={1}
          animClass="auth-chip-2"
          className="absolute top-[40%] right-[4%]"
        />
        <FloatingChip
          chipIndex={2}
          animClass="auth-chip-3"
          className="absolute bottom-[14%] left-[8%]"
        />

        {/* ── The actual form card ── */}
        <div className="relative z-20 w-full max-w-[430px] mx-4 sm:mx-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-[#0f1a2b]">SocietySync</span>
          </div>

          <div
            className="rounded-3xl border border-[#e6d8c8] p-8 sm:p-9"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 48px rgba(15,26,43,0.10), 0 2px 12px rgba(15,26,43,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
            }}
          >
            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-[22px] font-bold text-[#0f1a2b] tracking-tight leading-tight">
                Join SocietySync
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Create your account to streamline community management.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <FormField
                id="fullName"
                label="Full Name"
                placeholder="Jane Doe"
                value={form.fullName}
                onChange={handleChange("fullName")}
                icon={User}
                required
              />

              {/* Phone Number */}
              <FormField
                id="phone"
                label="Phone Number"
                type="tel"
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange("phone")}
                icon={Phone}
                required
              />

              {/* Society Dropdown */}
              <div className="space-y-1.5 relative">
                <label
                  htmlFor="society-btn"
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Society Name
                </label>
                <button
                  id="society-btn"
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="w-full h-11 px-3 flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 text-sm cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.03] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60"
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 size={15} className="text-muted-foreground/60 shrink-0" />
                    <span className={form.society ? "text-foreground" : "text-muted-foreground/50"}>
                      {form.society || "Select your society..."}
                    </span>
                  </span>
                  <ChevronDown
                    size={15}
                    className={`text-muted-foreground/60 shrink-0 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute z-50 w-full mt-1.5 rounded-xl border border-border/60 bg-white shadow-xl overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
                    {MOCK_SOCIETIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSocietySelect(s)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-100 hover:bg-primary/5 flex items-center gap-2.5
                          ${form.society === s ? "bg-primary/8 text-primary font-semibold" : "text-foreground"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                            form.society === s ? "bg-primary scale-100" : "bg-transparent scale-0"
                          }`}
                        />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2 mt-1"
              >
                Create Account
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </form>

            <div className="mt-5 space-y-4">
              <DividerOr text="Or sign up with" />
              <SocialButton>Sign up with Google</SocialButton>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-primary font-semibold hover:underline underline-offset-2 transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
