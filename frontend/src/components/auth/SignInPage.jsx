import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandPanel from "./components/BrandPanel";
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

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    
    if (email === "admin@gmail.com" && password === "admin") {
      navigate("/admin");
    } else if (email === "resident@gmail.com" && password === "resident") {
      navigate("/resident");
    } else if (email === "security@gmail.com" && password === "security") {
      navigate("/gate");
    } else {
      setError("Invalid credentials. Try admin@gmail.com / admin");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel (identical to signup) ────────────────── */}
      <div className="lg:w-[42%] hidden lg:block">
        <BrandPanel variant="signin" />
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

        {/* Ambient gradient blobs */}
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

        {/* Skyline watermark */}
        <SkylineWatermark
          className="absolute top-0 right-0 text-[#0f1a2b] pointer-events-none"
          style={{ width: 260, opacity: 0.6 }}
        />

        {/* Mini buildings */}
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

        {/* Sparkles */}
        <Sparkle size={18} className="absolute top-10 left-[30%] text-primary auth-sparkle"
          style={{ opacity: 0.7, animationDelay: "0s" }} />
        <Sparkle size={13} className="absolute top-[22%] right-10 text-secondary auth-sparkle"
          style={{ opacity: 0.6, animationDelay: "1.1s" }} />
        <Sparkle size={20} className="absolute bottom-[18%] right-8 text-primary auth-sparkle"
          style={{ opacity: 0.55, animationDelay: "2.2s" }} />
        <Sparkle size={11} className="absolute bottom-12 right-[28%] text-secondary auth-sparkle"
          style={{ opacity: 0.5, animationDelay: "0.6s" }} />

        {/* Diamond dots */}
        <DiamondDot size={9} className="absolute top-[38%] left-8 text-primary"
          style={{ opacity: 0.35 }} />
        <DiamondDot size={7} className="absolute bottom-[35%] right-5 text-secondary"
          style={{ opacity: 0.30 }} />

        {/* Hex / circle rings */}
        <HexRing size={52} className="absolute top-[12%] right-[8%] text-primary auth-spin"
          style={{ opacity: 0.22 }} />
        <CircleRing size={44} className="absolute bottom-[22%] left-[6%] text-secondary auth-spin"
          style={{ opacity: 0.18, animationDirection: "reverse" }} />
        <HexRing size={34} className="absolute bottom-8 right-[20%] text-primary auth-spin"
          style={{ opacity: 0.16, animationDuration: "24s" }} />

        {/* Floating stat chips */}
        <FloatingChip chipIndex={0} animClass="auth-chip-1" className="absolute top-[12%] left-[6%]" />
        <FloatingChip chipIndex={1} animClass="auth-chip-2" className="absolute top-[40%] right-[4%]" />
        <FloatingChip chipIndex={2} animClass="auth-chip-3" className="absolute bottom-[14%] left-[8%]" />

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
            className="rounded-3xl border border-[#e6d8c8] px-8 py-9 sm:p-9"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 48px rgba(15,26,43,0.10), 0 2px 12px rgba(15,26,43,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
            }}
          >
            {/* Logo + Heading */}
            <div className="mb-7">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight text-[#0f1a2b]">SocietySync</span>
              </div>
              <h2 className="text-[22px] font-bold text-[#0f1a2b] tracking-tight leading-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Sign in to continue to your community dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-md">
                  {error}
                </div>
              )}
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <Mail size={16} className="text-muted-foreground/60" />
                    <span className="w-px h-4 bg-border/70 ml-0.5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <Lock size={16} className="text-muted-foreground/60" />
                    <span className="w-px h-4 bg-border/70 ml-0.5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-11 mt-2 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2"
              >
                Sign In
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </form>

            <div className="mt-5 space-y-4">
              <DividerOr text="Or continue with" />
              <SocialButton>Sign in with Google</SocialButton>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-primary font-semibold hover:underline underline-offset-2 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
