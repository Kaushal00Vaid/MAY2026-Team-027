import axiosInstance from "@/api/axiosInstance";

export const createWebSocketTicket = () => axiosInstance.post("/auth/ws-ticket");
export const getNotifications = (params = {}) => axiosInstance.get("/api/v1/notifications", { params });
export const markNotificationRead = (id) => axiosInstance.patch(`/api/v1/notifications/${id}/read`);
export const markAllNotificationsRead = () => axiosInstance.post("/api/v1/notifications/read-all");
