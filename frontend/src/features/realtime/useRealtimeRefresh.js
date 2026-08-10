import { useEffect, useRef } from "react";

/** Refetch REST state when an authorized realtime event invalidates a screen. */
export function useRealtimeRefresh(scopes, refresh) {
  const refreshRef = useRef(refresh);
  const scopeKey = [...scopes].sort().join(",");

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const accepted = new Set(scopeKey.split(",").filter(Boolean));
    const listener = (event) => {
      if (accepted.has(event.detail?.payload?.scope)) {
        Promise.resolve(refreshRef.current()).catch(() => undefined);
      }
    };
    window.addEventListener("societysync:realtime", listener);
    return () => window.removeEventListener("societysync:realtime", listener);
  }, [scopeKey]);
}
