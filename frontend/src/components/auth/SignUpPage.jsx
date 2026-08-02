import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Building2, Tag, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandPanel from "./components/BrandPanel";
import DividerOr from "./components/DividerOr";
import SocialButton from "./components/SocialButton";
import {
  Sparkle, DiamondDot, HexRing, CircleRing,
  MiniBuilding, SkylineWatermark, FloatingChip, DotGridBg,
} from "./components/AuthDecorations";
import * as authApi from "@/api/auth";

function Field({ id, label, icon: Icon, required, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <Icon size={15} className="text-muted-foreground/60" />
            <span className="w-px h-4 bg-border/70 ml-0.5" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function InputEl({ id, type = "text", placeholder, value, onChange, required, className = "" }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200 ${className}`}
    />
  );
}

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
  flat_number: "",
  building_block: "",
  staff_type: "",
  emergency_contact: "",
};

export default function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.first_name.trim()) return "First name is required.";
    if (!form.last_name.trim()) return "Last name is required.";
    if (!form.phone_number.trim()) return "Phone number is required.";
    if (form.password && form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm_password) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await authApi.signup({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim(),
        password: form.password || undefined,
        confirm_password: form.confirm_password || undefined,
        flat_number: form.flat_number.trim() || undefined,
        building_block: form.building_block.trim() || undefined,
        staff_type: form.staff_type.trim() || undefined,
        emergency_contact: form.emergency_contact.trim() || undefined,
      });
      setSuccess(true);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(" • "));
      } else {
        setError(detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="lg:w-[42%] hidden lg:block">
        <BrandPanel />
      </div>

      {/* Right decorated panel */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-y-auto py-8"
        style={{ background: "linear-gradient(135deg, #fdf9f4 0%, #faf6ef 45%, #f4ede0 100%)" }}
      >
        <DotGridBg />

        {/* Ambient blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(216,121,67,0.10) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(82,117,117,0.08) 0%, transparent 70%)" }} />

        {/* Decorations (fewer — form is tall) */}
        <SkylineWatermark className="absolute top-0 right-0 text-[#0f1a2b] pointer-events-none" style={{ width: 200, opacity: 0.5 }} />
        <Sparkle size={16} className="absolute top-10 left-[30%] text-primary auth-sparkle" style={{ opacity: 0.6 }} />
        <HexRing size={44} className="absolute top-[8%] right-[6%] text-primary auth-spin" style={{ opacity: 0.18 }} />
        <DiamondDot size={8} className="absolute top-[60%] left-6 text-primary" style={{ opacity: 0.3 }} />

        {/* ── Form card ── */}
        <div className="relative z-20 w-full max-w-[460px] mx-4 sm:mx-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-5 lg:hidden">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-[#0f1a2b]">SocietySync</span>
          </div>

          <div
            className="rounded-3xl border border-[#e6d8c8] p-7 sm:p-9"
            style={{
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 48px rgba(15,26,43,0.10), 0 2px 12px rgba(15,26,43,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
            }}
          >
            {success ? (
              /* ── Success state ── */
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0f1a2b] tracking-tight">Account Created!</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[300px] mx-auto">
                    Your account is ready. You can now sign in using your phone number or email and password.
                  </p>
                </div>
                <Button
                  className="mt-2 font-semibold rounded-xl px-8"
                  onClick={() => navigate("/signin")}
                >
                  Go to Sign In
                </Button>
              </div>
            ) : (
              <>
                {/* Heading */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-[#0f1a2b] tracking-tight leading-tight">
                    Join SocietySync
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Create your resident account. Your admin will assign your role.
                  </p>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="mb-5 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                  {/* ── Section: Identity ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 pt-1">
                    Personal Details
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Field id="first_name" label="First Name" icon={User} required>
                      <InputEl id="first_name" placeholder="Jane" value={form.first_name} onChange={set("first_name")} required />
                    </Field>
                    <Field id="last_name" label="Last Name" icon={User} required>
                      <InputEl id="last_name" placeholder="Doe" value={form.last_name} onChange={set("last_name")} required />
                    </Field>
                  </div>

                  <Field id="phone_number" label="Phone Number" icon={Phone} required>
                    <InputEl
                      id="phone_number"
                      type="tel"
                      placeholder="+919876543210"
                      value={form.phone_number}
                      onChange={set("phone_number")}
                      required
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground/60 -mt-2 pl-1">
                    International format: +91 followed by 10-digit number
                  </p>

                  <Field id="email" label="Email Address" icon={Mail}>
                    <InputEl id="email" type="email" placeholder="jane@example.com" value={form.email} onChange={set("email")} />
                  </Field>

                  {/* ── Section: Password ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 pt-2">
                    Password (optional — skip for OTP-only access)
                  </p>

                  <Field id="password" label="Password" icon={Lock}>
                    <InputEl
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={set("password")}
                    />
                  </Field>

                  <Field id="confirm_password" label="Confirm Password" icon={Lock}>
                    <InputEl
                      id="confirm_password"
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                    />
                  </Field>

                  {/* ── Section: Residence (optional) ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 pt-2">
                    Residence Details (optional)
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Field id="flat_number" label="Flat / Unit" icon={Building2}>
                      <InputEl id="flat_number" placeholder="A-101" value={form.flat_number} onChange={set("flat_number")} />
                    </Field>
                    <Field id="building_block" label="Block / Tower" icon={Building2}>
                      <InputEl id="building_block" placeholder="Tower A" value={form.building_block} onChange={set("building_block")} />
                    </Field>
                  </div>

                  <Field id="staff_type" label="Staff Designation" icon={Tag}>
                    <InputEl
                      id="staff_type"
                      placeholder="e.g. Security, Housekeeping"
                      value={form.staff_type}
                      onChange={set("staff_type")}
                    />
                  </Field>

                  <Field id="emergency_contact" label="Emergency Contact" icon={Phone}>
                    <InputEl
                      id="emergency_contact"
                      type="tel"
                      placeholder="+919999999999"
                      value={form.emergency_contact}
                      onChange={set("emergency_contact")}
                    />
                  </Field>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 font-semibold text-sm tracking-wide rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Creating account…
                      </span>
                    ) : (
                      <>
                        Create Account
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-5 space-y-4">
                  <DividerOr text="Or sign up with" />
                  <SocialButton disabled>Sign up with Google (coming soon)</SocialButton>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  Already have an account?{" "}
                  <Link to="/signin" className="text-primary font-semibold hover:underline underline-offset-2 transition-colors">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
