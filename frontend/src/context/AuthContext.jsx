import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axiosInstance from "@/api/axiosInstance";
import * as authApi from "@/api/auth";

const AuthContext = createContext(null);

/**
 * Access tokens live only in memory. Refresh tokens remain in the backend's
 * HttpOnly cookie. A session becomes authenticated only after /users/me has
 * verified the token and returned the user's current database roles.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const accessTokenRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const refreshPromiseRef = useRef(null);

  const clearSession = useCallback(() => {
    sessionGenerationRef.current += 1;
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  }, []);

  const fetchCurrentUser = useCallback(async (token) => {
    const { data } = await axiosInstance.get("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      _skipAuth: true,
      _skipRefresh: true,
    });
    return data;
  }, []);

  const establishSession = useCallback(async (token, generation) => {
    const profile = await fetchCurrentUser(token);

    // Ignore a response from a login/refresh that started before logout or a
    // newer authentication attempt.
    if (sessionGenerationRef.current !== generation) return null;

    accessTokenRef.current = token;
    setAccessToken(token);
    setUser(profile);
    return profile;
  }, [fetchCurrentUser]);

  const silentRefresh = useCallback(() => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const generation = sessionGenerationRef.current;
    const refreshPromise = (async () => {
      try {
        const { data } = await authApi.refreshAccessToken();
        const profile = await establishSession(data.access_token, generation);
        return profile ? data.access_token : null;
      } catch {
        if (sessionGenerationRef.current === generation) clearSession();
        return null;
      } finally {
        if (refreshPromiseRef.current === refreshPromise) {
          refreshPromiseRef.current = null;
        }
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [clearSession, establishSession]);

  const loginWithPassword = useCallback(async (email, password) => {
    // Let startup refresh finish before login so an older Set-Cookie response
    // cannot overwrite the refresh token issued for the new account.
    const pendingRefresh = refreshPromiseRef.current;
    if (pendingRefresh) await pendingRefresh.catch(() => null);

    const generation = sessionGenerationRef.current + 1;
    sessionGenerationRef.current = generation;
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);

    const { data } = await authApi.loginWithPassword(email, password);
    const profile = await establishSession(data.access_token, generation);
    if (!profile) throw new Error("Authentication attempt was superseded.");
    return profile;
  }, [establishSession]);

  const loginWithOtp = useCallback(async (phoneNumber, otpCode) => {
    const pendingRefresh = refreshPromiseRef.current;
    if (pendingRefresh) await pendingRefresh.catch(() => null);

    const generation = sessionGenerationRef.current + 1;
    sessionGenerationRef.current = generation;
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);

    const { data } = await authApi.verifyOtp(phoneNumber, otpCode);
    const profile = await establishSession(data.access_token, generation);
    if (!profile) throw new Error("Authentication attempt was superseded.");
    return profile;
  }, [establishSession]);

  const loginWithGoogleToken = useCallback(async (accessToken) => {
    // Called by GoogleAuthSuccess and CompleteProfile pages after receiving
    // a full access token from the backend to hydrate the AuthContext session.
    const pendingRefresh = refreshPromiseRef.current;
    if (pendingRefresh) await pendingRefresh.catch(() => null);

    const generation = sessionGenerationRef.current + 1;
    sessionGenerationRef.current = generation;
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);

    const profile = await establishSession(accessToken, generation);
    if (!profile) throw new Error("Authentication attempt was superseded.");
    return profile;
  }, [establishSession]);

  const logoutUser = useCallback(async () => {
    // Remove protected content synchronously. If a refresh is already running,
    // wait for it to rotate its cookie before asking the backend to revoke the
    // final refresh token. Its response cannot restore state due to generation.
    clearSession();
    const pendingRefresh = refreshPromiseRef.current;
    if (pendingRefresh) await pendingRefresh.catch(() => null);

    try {
      await authApi.logout();
    } finally {
      accessTokenRef.current = null;
      setAccessToken(null);
      setUser(null);
    }
  }, [clearSession]);

  const getRoleRedirectPath = useCallback((roles) => {
    if (!roles || roles.length === 0) return "/unauthorized";
    if (roles.some((role) => ["super_admin", "admin", "committee_member"].includes(role))) {
      return "/admin";
    }
    if (roles.includes("support_staff")) return "/gate/dashboard";
    if (roles.some((role) => ["flat_owner", "resident_rental"].includes(role))) {
      return "/resident";
    }
    return "/unauthorized";
  }, []);

  useEffect(() => {
    const requestInterceptor = axiosInstance.interceptors.request.use((config) => {
      const token = accessTokenRef.current;
      if (token && !config._skipAuth) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const request = error.config;
        const isAuthEndpoint = request?.url?.startsWith("/auth/login")
          || request?.url?.startsWith("/auth/otp")
          || request?.url?.startsWith("/auth/refresh")
          || request?.url?.startsWith("/auth/logout");

        if (
          error.response?.status !== 401
          || !request
          || request._retry
          || request._skipRefresh
          || isAuthEndpoint
        ) {
          return Promise.reject(error);
        }

        request._retry = true;
        const token = await silentRefresh();
        if (!token) return Promise.reject(error);

        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(request);
      },
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
      axiosInstance.interceptors.response.eject(responseInterceptor);
    };
  }, [silentRefresh]);

  useEffect(() => {
    let active = true;
    silentRefresh().finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [silentRefresh]);

  const value = {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    loginWithPassword,
    loginWithOtp,
    loginWithGoogleToken,
    logout: logoutUser,
    getRoleRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return context;
}
