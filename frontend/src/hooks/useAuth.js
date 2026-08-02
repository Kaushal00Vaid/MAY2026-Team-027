import { useAuthContext } from "@/context/AuthContext";

/**
 * Convenience hook for consuming the AuthContext.
 *
 * Usage:
 *   const { user, isAuthenticated, loginWithPassword, logout } = useAuth();
 */
export function useAuth() {
  return useAuthContext();
}
