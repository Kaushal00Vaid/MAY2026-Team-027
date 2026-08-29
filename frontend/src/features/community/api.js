import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/community";

export const listNotices = ({ page = 1, page_size = 20 } = {}) =>
  axiosInstance.get(`${base}/notices`, { params: { page, page_size } });
export const createNotice = (data) => axiosInstance.post(`${base}/notices`, data);
export const markNoticeRead = (id) => axiosInstance.post(`${base}/notices/${id}/read`);
export const listEvents = () => axiosInstance.get(`${base}/events`);
export const updateRsvp = (id, status) => axiosInstance.put(`${base}/events/${id}/rsvp`, { status });
export const listVolunteers = () => axiosInstance.get(`${base}/volunteers`);
export const signupVolunteer = (id) => axiosInstance.post(`${base}/volunteers/${id}/signup`);
export const withdrawVolunteer = (id) => axiosInstance.delete(`${base}/volunteers/${id}/signup`);
export const getActivePoll = () => axiosInstance.get(`${base}/polls/active`);
export const createPoll = (data) => axiosInstance.post(`${base}/polls`, data);
export const votePoll = (id, optionId) => axiosInstance.post(`${base}/polls/${id}/votes`, { option_id: optionId });
export const listDiscussions = ({ page = 1, page_size = 10 } = {}) => axiosInstance.get(`${base}/discussions`, { params: { page, page_size } });
export const listDirectory = ({ search = "", page = 1, page_size = 10 } = {}) => axiosInstance.get(`${base}/directory`, { params: { search: search.trim() || undefined, page, page_size } });

export const communityError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
