import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandPanel from "./components/BrandPanel";
import DividerOr from "./components/DividerOr";
import SocialButton from "./components/SocialButton";
import OtpInput from "./components/OtpInput";
import {
  Sparkle, DiamondDot, HexRing, CircleRing,
  MiniBuilding, SkylineWatermark, FloatingChip, DotGridBg,
} from "./components/AuthDecorations";
import { useAuth } from "@/hooks/useAuth";
import * as authApi from "@/api/auth";

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: "password", label: "Email & Password" },
  { id: "otp",      label: "Phone & OTP" },
];

// ── OTP countdown ─────────────────────────────────────────────────────────────
function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef(null);

  const start = () => {
    setRemaining(seconds);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);
  return { remaining, start, canResend: remaining === 0 };
}

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithPassword, loginWithOtp, getRoleRedirectPath } = useAuth();
  const from = location.state?.from?.pathname || null;

  const [activeTab, setActiveTab] = useState("password");

  // ── Password form state ───────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── OTP form state ────────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState("phone"); // "phone" | "verify"
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(false);

  const { remaining, start: startCountdown, canResend } = useCountdown(60);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearErrors = () => { setError(""); setOtpError(false); };

  const handleRedirect = (user) => {
    let path = from;
    const roles = user?.roles || [];
    
    if (path) {
      if (path.startsWith("/admin/users") && !roles.includes("super_admin")) {
        path = null;
      } else if (path.startsWith("/admin") && !roles.some(r => ["super_admin", "admin", "committee_member"].includes(r))) {
        path = null;
      } else if (path.startsWith("/gate") && !roles.includes("support_staff")) {
        path = null;
      } else if (path.startsWith("/resident") && !roles.some(r => ["flat_owner", "resident_rental"].includes(r))) {
        path = null;
      }
    }

    if (!path) {
      path = getRoleRedirectPath(roles);
    }
    
    navigate(path, { replace: true });
  };

  // ── Password login ────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      const user = await loginWithPassword(email, password);
      handleRedirect(user);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP — send ───────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    clearErrors();
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setOtpStep("verify");
      startCountdown();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to send OTP. Check the number and retry.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP — verify ─────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otpCode.length < 6) { setError("Enter all 6 digits."); return; }
    clearErrors();
    setLoading(true);
    try {
      const user = await loginWithOtp(phone, otpCode);
      handleRedirect(user);
    } catch (err) {
      setOtpError(true);
      setError(err?.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    clearErrors();
    setOtpStep("phone");
    setOtpCode("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="lg:w-[42%] hidden lg:block">
        <BrandPanel variant="signin" />
      </div>

      {/* Right decorated panel */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #fdf9f4 0%, #faf6ef 45%, #f4ede0 100%)" }}
      >
        <DotGridBg />

        {/* Ambient blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(216,121,67,0.10) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(82,117,117,0.08) 0%, transparent 70%)" }} />

        {/* Decorations */}
        <SkylineWatermark className="absolute top-0 right-0 text-[#0f1a2b] pointer-events-none" style={{ width: 260, opacity: 0.6 }} />
        <MiniBuilding className="absolute bottom-10 left-6 text-primary auth-float-2" width={38} style={{ opacity: 0.55 }} />
        <MiniBuilding className="absolute top-16 left-[14%] text-secondary auth-float-3" width={28} style={{ opacity: 0.40 }} />
        <Sparkle size={18} className="absolute top-10 left-[30%] text-primary auth-sparkle" style={{ opacity: 0.7, animationDelay: "0s" }} />
        <Sparkle size={13} className="absolute top-[22%] right-10 text-secondary auth-sparkle" style={{ opacity: 0.6, animationDelay: "1.1s" }} />
        <Sparkle size={20} className="absolute bottom-[18%] right-8 text-primary auth-sparkle" style={{ opacity: 0.55, animationDelay: "2.2s" }} />
        <DiamondDot size={9} className="absolute top-[38%] left-8 text-primary" style={{ opacity: 0.35 }} />
        <HexRing size={52} className="absolute top-[12%] right-[8%] text-primary auth-spin" style={{ opacity: 0.22 }} />
        <CircleRing size={44} className="absolute bottom-[22%] left-[6%] text-secondary auth-spin" style={{ opacity: 0.18, animationDirection: "reverse" }} />
        <FloatingChip chipIndex={0} animClass="auth-chip-1" className="absolute top-[12%] left-[6%]" />
        <FloatingChip chipIndex={1} animClass="auth-chip-2" className="absolute top-[40%] right-[4%]" />
        <FloatingChip chipIndex={2} animClass="auth-chip-3" className="absolute bottom-[14%] left-[8%]" />

        {/* ── Form card ── */}
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
            className="rounded-3xl border border-[#e6d8c8] px-8 py-8 sm:p-9"
            style={{
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 48px rgba(15,26,43,0.10), 0 2px 12px rgba(15,26,43,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
            }}
          >
            {/* Logo + Heading */}
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight text-[#0f1a2b]">SocietySync</span>
              </div>
              <h2 className="text-[22px] font-bold text-[#0f1a2b] tracking-tight leading-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Sign in to continue to your community dashboard.
              </p>
            </div>

            {/* ── Tab Switcher ── */}
            <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(15,26,43,0.05)" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-white text-[#0f1a2b] shadow-sm"
                      : "text-muted-foreground hover:text-[#0f1a2b]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Error banner ── */}
            {error && (
              <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ════════════════════════════════════════════════
                TAB 1 — Email + Password
            ════════════════════════════════════════════════ */}
            {activeTab === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="signin-email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      <Mail size={16} className="text-muted-foreground/60" />
                      <span className="w-px h-4 bg-border/70 ml-0.5" />
                    </div>
                    <input
                      id="signin-email"
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
                  <label htmlFor="signin-password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      <Lock size={16} className="text-muted-foreground/60" />
                      <span className="w-px h-4 bg-border/70 ml-0.5" />
                    </div>
                    <input
                      id="signin-password"
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <>
                      Sign In
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ════════════════════════════════════════════════
                TAB 2 — Phone + OTP
            ════════════════════════════════════════════════ */}
            {activeTab === "otp" && (
              <div>
                {/* Step 1 — Enter phone */}
                {otpStep === "phone" && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="signin-phone" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Phone Number
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                          <Phone size={16} className="text-muted-foreground/60" />
                          <span className="w-px h-4 bg-border/70 ml-0.5" />
                        </div>
                        <input
                          id="signin-phone"
                          type="tel"
                          placeholder="+919876543210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground/70 pl-1">
                        Use international format, e.g. +91 98765 43210
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !phone}
                      className="w-full h-11 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Sending OTP…
                        </span>
                      ) : "Send OTP →"}
                    </Button>
                  </form>
                )}

                {/* Step 2 — Enter OTP */}
                {otpStep === "verify" && (
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => { setOtpStep("phone"); setOtpCode(""); clearErrors(); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#0f1a2b] transition-colors"
                    >
                      <ArrowLeft size={13} /> Change number
                    </button>

                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold text-[#0f1a2b]">Enter verification code</p>
                      <p className="text-xs text-muted-foreground">
                        Sent to <span className="font-semibold text-[#0f1a2b]">{phone}</span>
                      </p>
                    </div>

                    <OtpInput
                      value={otpCode}
                      onChange={(v) => { setOtpCode(v); setOtpError(false); setError(""); }}
                      disabled={loading}
                      error={otpError}
                    />

                    <Button
                      type="submit"
                      disabled={loading || otpCode.length < 6}
                      className="w-full h-11 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Verifying…
                        </span>
                      ) : "Verify & Sign In"}
                    </Button>

                    {/* Resend timer */}
                    <div className="text-center">
                      {canResend ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          Resend OTP
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Resend in <span className="font-semibold text-[#0f1a2b]">{remaining}s</span>
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Social / Google */}
            <div className="mt-6 space-y-4">
              <DividerOr text="Or continue with" />
              <SocialButton disabled>Sign in with Google (coming soon)</SocialButton>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline underline-offset-2 transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
