import { useCallback, useEffect, useState } from "react";
import { getResidentId, securityError } from "@/features/security/api";

export function useResidentPass(enabled = true) {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setPass((await getResidentId()).data);
    } catch (requestError) {
      setPass(null);
      setError(securityError(requestError, "Unable to load your digital pass."));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    // Fetching initializes and periodically rotates the server-issued credential.

    void refresh();
    const timer = window.setInterval(refresh, 25_000);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);

  return { pass, loading, error, refresh };
}
