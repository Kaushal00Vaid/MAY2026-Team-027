import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/security";
export const listVisitors = (params = {}) => axiosInstance.get(`${base}/visitors`, { params });
export const createVisitor = (data) => axiosInstance.post(`${base}/visitors`, data);
export const decideVisitor = (id, decision, expectedVersion, note) => axiosInstance.post(`${base}/visitors/${id}/decision`, { decision, expected_version: expectedVersion, note });
export const visitorEntry = (id) => axiosInstance.post(`${base}/visitors/${id}/entry`);
export const visitorExit = (id) => axiosInstance.post(`${base}/visitors/${id}/exit`);
export const listGuestPasses = () => axiosInstance.get(`${base}/guest-passes`);
export const createGuestPass = (data) => axiosInstance.post(`${base}/guest-passes`, data);
export const revokeGuestPass = (id) => axiosInstance.post(`${base}/guest-passes/${id}/revoke`);
export const verifyGuestPin = (pin) => axiosInstance.post(`${base}/guest-passes/verify-pin`, { pin });
export const manualResidentEntry = (unit) => axiosInstance.post(`${base}/access-logs/manual-entry`, { unit });
export const listAccessLogs = (limit = 100) => axiosInstance.get(`${base}/access-logs`, { params: { limit } });
export const getResidentId = () => axiosInstance.get(`${base}/resident-id`);
export const securityError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
