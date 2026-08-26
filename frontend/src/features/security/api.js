import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/security";
export const listVisitors = (params = {}) => axiosInstance.get(`${base}/visitors`, { params });
export const listAllVisitors = async (params = {}) => {
  const items = []; let page = 1; let total;
  do {
    const response = await listVisitors({ ...params, page, page_size: 100 });
    const batch = Array.isArray(response.data?.items) ? response.data.items : [];
    total = Number(response.data?.total) || 0; items.push(...batch);
    if (!batch.length) break;
    page += 1;
  } while (items.length < total && page <= 100);
  return items;
};
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
export const verifyResidentId = (data) => axiosInstance.post(`${base}/resident-id/verify`, data);
export const securityError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
