import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1";

export const listAmenities = (includeInactive = false) => axiosInstance.get(`${base}/amenities`, { params: { include_inactive: includeInactive } });
export const createAmenity = (data) => axiosInstance.post(`${base}/amenities`, data);
export const updateAmenity = (id, data) => axiosInstance.patch(`${base}/amenities/${id}`, data);
export const getAvailability = (id, startDate, days = 7) => axiosInstance.get(`${base}/amenities/${id}/availability`, { params: { start_date: startDate, days } });
export const listBookings = (params = {}) => axiosInstance.get(`${base}/bookings`, { params });
export const createBooking = (data, key) => axiosInstance.post(`${base}/bookings`, data, { headers: { "Idempotency-Key": key } });
export const cancelBooking = (id) => axiosInstance.post(`${base}/bookings/${id}/cancel`);

export const amenitiesError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};

export const localDate = (date) => {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
