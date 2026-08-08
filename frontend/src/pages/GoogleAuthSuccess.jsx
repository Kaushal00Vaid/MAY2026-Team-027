import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * GoogleAuthSuccess — intermediate landing page at /auth/google/success
 *
 * The backend callback redirects here with ?token=<access_token> after
 * successfully authenticating a returning Google user (profile already complete).
 * This page hydrates the AuthContext session and then redirects to the
 * appropriate dashboard based on the user's role.
 */
export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogleToken, getRoleRedirectPath } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      const messages = {
        oauth_cancelled: "Google sign-in was cancelled.",
        google_auth_failed: "Google authentication failed. Please try again.",
        account_error: "There was a problem with your account. Please try again.",
        token_error: "Failed to create session. Please try again.",
      };
      setError(messages[oauthError] || "Authentication failed. Please try again.");
      return;
    }

    if (!token) {
      setError("No authentication token received. Please try again.");
      return;
    }

    loginWithGoogleToken(token)
      .then((user) => {
        const path = getRoleRedirectPath(user?.roles || []);
        navigate(path, { replace: true });
      })
      .catch(() => {
        setError("Failed to establish session. Please sign in again.");
      });
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #fdf9f4 0%, #faf6ef 45%, #f4ede0 100%)" }}
    >
      <div
        className="rounded-3xl border border-[#e6d8c8] px-10 py-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 48px rgba(15,26,43,0.10), 0 2px 12px rgba(15,26,43,0.06)",
        }}
      >
        {/* Logo */}
        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-md">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2.5}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        {error ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-7 h-7 text-red-500">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-[#0f1a2b]">Authentication Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              onClick={() => navigate("/signin", { replace: true })}
              className="text-sm text-primary font-semibold hover:underline underline-offset-2"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-[#0f1a2b]">Signing you in…</p>
              <p className="text-sm text-muted-foreground mt-1">Setting up your session</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
