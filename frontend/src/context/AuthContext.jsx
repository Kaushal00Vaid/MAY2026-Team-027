import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axiosInstance from "@/api/axiosInstance";
import * as authApi from "@/api/auth";

const AuthContext = createContext(null);

/**
 * AuthProvider
 *
 * Session strategy:
 *  - Access token → stored in React state (memory). Never touches localStorage.
 *    Survives re-renders; lost on full page refresh (recovered via silent refresh).
 *  - Refresh token → HttpOnly cookie managed by the browser + backend.
 *    Sent automatically on /auth/* requests thanks to withCredentials: true.
 *
 * On mount the provider attempts a silent token refresh.
 * All axios requests automatically receive the current access token
 * through a request interceptor. A response interceptor handles 401s
 * by attempting one silent refresh, then logging out.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent multiple concurrent refresh attempts
  const isRefreshing = useRef(false);
  const refreshSubscribers = useRef([]);

  // Helpers

  const onRefreshed = (token) => {
    refreshSubscribers.current.forEach((cb) => cb(token));
    refreshSubscribers.current = [];
  };

  const addRefreshSubscriber = (cb) => {
    refreshSubscribers.current.push(cb);
  };

  // Core auth actions

  const storeSession = useCallback(async (token) => {
    setAccessToken(token);
    try {
      const { data } = await authApi.getMe();
      // Inject token for this specific call
      setUser(data);
    } catch {
      // getMe failed — token may have been accepted but user fetch errored
      setUser(null);
    }
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const { data } = await authApi.refreshAccessToken();
      await storeSession(data.access_token);
      return data.access_token;
    } catch {
      clearSession();
      return null;
    }
  }, [storeSession, clearSession]);

  // Public API

  const loginWithPassword = useCallback(async (email, password) => {
    const { data } = await authApi.loginWithPassword(email, password);
    await storeSession(data.access_token);
    return data;
  }, [storeSession]);

  const loginWithOtp = useCallback(async (phone_number, otp_code) => {
    const { data } = await authApi.verifyOtp(phone_number, otp_code);
    await storeSession(data.access_token);
    return data;
  }, [storeSession]);

  const logoutUser = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const getRoleRedirectPath = useCallback((roles) => {
    if (!roles || roles.length === 0) return "/signin";
    if (roles.includes("super_admin") || roles.includes("admin") || roles.includes("committee_member")) {
      return "/admin";
    }
    if (roles.includes("support_staff")) return "/gate";
    return "/resident"; // flat_owner, resident_rental
  }, []);

  // Axios interceptors

  useEffect(() => {
    // Request interceptor: inject access token
    const reqInterceptor = axiosInstance.interceptors.request.use((config) => {
      if (accessToken && !config._skipAuth) {
        config.headers["Authorization"] = `Bearer ${accessToken}`;
      }
      return config;
    });

    // Response interceptor: handle 401 with silent refresh
    const resInterceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes("/auth/refresh") &&
          !originalRequest.url?.includes("/auth/login")
        ) {
          originalRequest._retry = true;

          if (isRefreshing.current) {
            // Queue the request until refresh completes
            return new Promise((resolve, reject) => {
              addRefreshSubscriber((token) => {
                if (token) {
                  originalRequest.headers["Authorization"] = `Bearer ${token}`;
                  resolve(axiosInstance(originalRequest));
                } else {
                  reject(error);
                }
              });
            });
          }

          isRefreshing.current = true;
          try {
            const newToken = await silentRefresh();
            isRefreshing.current = false;
            onRefreshed(newToken);
            if (newToken) {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              return axiosInstance(originalRequest);
            }
          } catch {
            isRefreshing.current = false;
            onRefreshed(null);
            clearSession();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(reqInterceptor);
      axiosInstance.interceptors.response.eject(resInterceptor);
    };
  }, [accessToken, silentRefresh, clearSession]);

  //On mount: attempt silent refresh

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await authApi.refreshAccessToken();
        if (mounted) {
          // Manually fetch user with fresh token (interceptor not yet bound)
          const userRes = await axiosInstance.get("/auth/me", {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          setAccessToken(data.access_token);
          setUser(userRes.data);
        }
      } catch {
        // Not logged in — that's fine
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    user,
    accessToken,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    loginWithPassword,
    loginWithOtp,
    logout: logoutUser,
    getRoleRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
