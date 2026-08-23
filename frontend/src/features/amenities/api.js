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

const IST = "Asia/Kolkata";
const istParts = (date) => Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(date)).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]),
);

export const localDate = (date) => {
  const { year, month, day } = istParts(date);
  return `${year}-${month}-${day}`;
};

export const istTime = (date) => new Intl.DateTimeFormat("en-IN", {
  timeZone: IST, hour: "2-digit", minute: "2-digit",
}).format(new Date(date));

export const istDateTime = (date) => new Intl.DateTimeFormat("en-IN", {
  timeZone: IST, dateStyle: "medium", timeStyle: "short",
}).format(new Date(date));
