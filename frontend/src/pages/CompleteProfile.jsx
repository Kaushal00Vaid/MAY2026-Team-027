import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  User, Phone, Building2, AlertCircle, CheckCircle2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandPanel from "@/components/auth/components/BrandPanel";
import {
  Sparkle, DiamondDot, HexRing, CircleRing,
  MiniBuilding, SkylineWatermark, FloatingChip, DotGridBg,
} from "@/components/auth/components/AuthDecorations";
import * as authApi from "@/api/auth";
import { useAuth } from "@/hooks/useAuth";

// ── Field wrapper (matches SignUpPage style) ──────────────────────────────────
function Field({ id, label, icon: Icon, required, hint, children }) {
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
      {hint && <p className="text-xs text-muted-foreground/60 pl-1">{hint}</p>}
    </div>
  );
}

function InputEl({ id, type = "text", placeholder, value, onChange, required, disabled, className = "" }) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/60 bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    />
  );
}

function ReadOnlyField({ id, label, icon: Icon, value }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <Icon size={15} className="text-muted-foreground/60" />
            <span className="w-px h-4 bg-border/70 ml-0.5" />
          </div>
        )}
        <input
          id={id}
          type="text"
          readOnly
          value={value || ""}
          className="w-full h-11 pl-[42px] pr-4 rounded-lg border border-border/40 bg-muted/20 text-sm text-muted-foreground cursor-not-allowed"
        />
      </div>
      <p className="text-[11px] text-muted-foreground/50 pl-1 flex items-center gap-1">
        <Shield size={10} /> Provided by Google — cannot be changed here
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogleToken, getRoleRedirectPath } = useAuth();

  // Extract params from callback redirect
  const pendingToken = searchParams.get("token") || "";
  const googleFirstName = searchParams.get("first_name") || "";
  const googleLastName = searchParams.get("last_name") || "";
  const googleEmail = searchParams.get("email") || "";
  const googlePicture = searchParams.get("picture") || "";

  const [form, setForm] = useState({
    first_name: googleFirstName,
    last_name: googleLastName,
    phone_number: "",
    flat_number: "",
    building_block: "",
    emergency_contact: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    if (!pendingToken) {
      setTokenInvalid(true);
    }
  }, [pendingToken]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.first_name.trim()) return "First name is required.";
    if (!form.last_name.trim()) return "Last name is required.";
    if (!form.phone_number.trim()) return "Phone number is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { data } = await authApi.completeProfile(
        {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone_number: form.phone_number.trim(),
          flat_number: form.flat_number.trim() || undefined,
          building_block: form.building_block.trim() || undefined,
          emergency_contact: form.emergency_contact.trim() || undefined,
        },
        pendingToken,
      );

      // Hydrate the AuthContext session with the new full access token
      const user = await loginWithGoogleToken(data.access_token);
      const path = getRoleRedirectPath(user?.roles || []);
      navigate(path, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 401) {
        setTokenInvalid(true);
        return;
      }
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(" • "));
      } else {
        setError(detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="lg:w-[42%] hidden lg:block">
        <BrandPanel />
      </div>

      {/* Right panel */}
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

        {/* Decorations */}
        <SkylineWatermark className="absolute top-0 right-0 text-[#0f1a2b] pointer-events-none" style={{ width: 200, opacity: 0.5 }} />
        <Sparkle size={16} className="absolute top-10 left-[30%] text-primary auth-sparkle" style={{ opacity: 0.6 }} />
        <HexRing size={44} className="absolute top-[8%] right-[6%] text-primary auth-spin" style={{ opacity: 0.18 }} />
        <DiamondDot size={8} className="absolute top-[60%] left-6 text-primary" style={{ opacity: 0.3 }} />
        <MiniBuilding className="absolute bottom-10 left-6 text-primary auth-float-2" width={34} style={{ opacity: 0.50 }} />
        <FloatingChip chipIndex={1} animClass="auth-chip-2" className="absolute top-[40%] right-[4%]" />

        {/* Form card */}
        <div className="relative z-20 w-full max-w-[480px] mx-4 sm:mx-8">

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
            {/* ── Invalid / expired token ── */}
            {tokenInvalid ? (
              <div className="flex flex-col items-center text-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle size={30} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0f1a2b] tracking-tight">Link Expired</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[300px] mx-auto">
                    This profile completion link has expired or is invalid. Please sign in with Google again to get a new link.
                  </p>
                </div>
                <Link to="/signin">
                  <Button className="mt-1 font-semibold rounded-xl px-8">Back to Sign In</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Google profile banner */}
                {googlePicture && (
                  <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <img
                      src={googlePicture}
                      alt="Google profile"
                      className="w-10 h-10 rounded-full ring-2 ring-primary/20 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0f1a2b]">{googleFirstName} {googleLastName}</p>
                      <p className="text-xs text-muted-foreground">{googleEmail}</p>
                    </div>
                    <div className="ml-auto shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full">
                        Google
                      </span>
                    </div>
                  </div>
                )}

                {/* Heading */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-bold text-[#0f1a2b] tracking-tight leading-tight">
                    Complete Your Profile
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Just a few more details to finish setting up your community account.
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
                    <Field id="cp-first-name" label="First Name" icon={User} required>
                      <InputEl
                        id="cp-first-name"
                        placeholder="Jane"
                        value={form.first_name}
                        onChange={set("first_name")}
                        required
                      />
                    </Field>
                    <Field id="cp-last-name" label="Last Name" icon={User} required>
                      <InputEl
                        id="cp-last-name"
                        placeholder="Doe"
                        value={form.last_name}
                        onChange={set("last_name")}
                        required
                      />
                    </Field>
                  </div>

                  {/* Read-only email from Google */}
                  {googleEmail && (
                    <ReadOnlyField
                      id="cp-email"
                      label="Email Address"
                      icon={() => (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={15} height={15} className="text-muted-foreground/60">
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      )}
                      value={googleEmail}
                    />
                  )}

                  {/* Phone — required */}
                  <Field
                    id="cp-phone"
                    label="Phone Number"
                    icon={Phone}
                    required
                    hint="International format: +91 followed by 10-digit number"
                  >
                    <InputEl
                      id="cp-phone"
                      type="tel"
                      placeholder="+919876543210"
                      value={form.phone_number}
                      onChange={set("phone_number")}
                      required
                    />
                  </Field>

                  {/* ── Section: Residence ── */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 pt-2">
                    Residence Details <span className="normal-case font-normal">(optional)</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Field id="cp-flat" label="Flat / Unit" icon={Building2}>
                      <InputEl
                        id="cp-flat"
                        placeholder="A-101"
                        value={form.flat_number}
                        onChange={set("flat_number")}
                      />
                    </Field>
                    <Field id="cp-block" label="Block / Tower" icon={Building2}>
                      <InputEl
                        id="cp-block"
                        placeholder="Tower A"
                        value={form.building_block}
                        onChange={set("building_block")}
                      />
                    </Field>
                  </div>

                  <Field id="cp-emergency" label="Emergency Contact" icon={Phone}>
                    <InputEl
                      id="cp-emergency"
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
                        Saving…
                      </span>
                    ) : (
                      <>
                        Complete Setup
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-5">
                  Wrong account?{" "}
                  <Link to="/signin" className="text-primary font-semibold hover:underline underline-offset-2">
                    Sign in with a different account
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
