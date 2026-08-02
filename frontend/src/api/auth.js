import axiosInstance from "./axiosInstance";

// Signup
/**
 * @param {Object} data - { first_name, last_name, email, phone_number, password,
 *                          confirm_password, flat_number, building_block,
 *                          staff_type, emergency_contact }
 */
export const signup = (data) => axiosInstance.post("/auth/signup", data);

// Email + Password login
/**
 * @param {string} email
 * @param {string} password
 * @returns {{ access_token, token_type, expires_in }}
 */
export const loginWithPassword = (email, password) =>
  axiosInstance.post("/auth/login/password", { email, password });

// OTP flow
/**
 * Request an OTP to be sent to phone_number.
 * @param {string} phone_number - e.g. "+919876543210"
 */
export const requestOtp = (phone_number) =>
  axiosInstance.post("/auth/otp/request", { phone_number });

/**
 * Verify OTP and receive tokens.
 * @param {string} phone_number
 * @param {string} otp_code - 6-digit string
 * @returns {{ access_token, token_type, expires_in }}
 */
export const verifyOtp = (phone_number, otp_code) =>
  axiosInstance.post("/auth/otp/verify", { phone_number, otp_code });

// Session management
/**
 * Exchange the HttpOnly refresh-token cookie for a new access token.
 * @returns {{ access_token, token_type, expires_in }}
 */
export const refreshAccessToken = () => axiosInstance.post("/auth/refresh");

/**
 * Revoke the current session. Clears the refresh-token cookie server-side.
 */
export const logout = () => axiosInstance.post("/auth/logout");

/**
 * Fetch the current authenticated user's profile.
 * Requires Authorization header (injected by AuthContext interceptor).
 */
export const getMe = () => axiosInstance.get("/auth/me");
