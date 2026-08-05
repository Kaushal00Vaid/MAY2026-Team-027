import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/community";

export const listNotices = () => axiosInstance.get(`${base}/notices`, { params: { page_size: 100 } });
export const createNotice = (data) => axiosInstance.post(`${base}/notices`, data);
export const markNoticeRead = (id) => axiosInstance.post(`${base}/notices/${id}/read`);
export const listEvents = () => axiosInstance.get(`${base}/events`);
export const updateRsvp = (id, status) => axiosInstance.put(`${base}/events/${id}/rsvp`, { status });
export const listVolunteers = () => axiosInstance.get(`${base}/volunteers`);
export const signupVolunteer = (id) => axiosInstance.post(`${base}/volunteers/${id}/signup`);
export const withdrawVolunteer = (id) => axiosInstance.delete(`${base}/volunteers/${id}/signup`);
export const getActivePoll = () => axiosInstance.get(`${base}/polls/active`);
export const votePoll = (id, optionId) => axiosInstance.post(`${base}/polls/${id}/votes`, { option_id: optionId });
export const listDiscussions = () => axiosInstance.get(`${base}/discussions`, { params: { page_size: 100 } });
export const listDirectory = (search = "") => axiosInstance.get(`${base}/directory`, { params: { search: search.trim() || undefined, page_size: 100 } });

export const communityError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
