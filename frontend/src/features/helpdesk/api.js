import axiosInstance from "@/api/axiosInstance";

export const listComplaints = (params = {}) =>
  axiosInstance.get("/api/v1/complaints", { params });

export const createComplaint = (data) =>
  axiosInstance.post("/api/v1/complaints", data);

export const getComplaint = (id) =>
  axiosInstance.get(`/api/v1/complaints/${id}`);

export const updateComplaint = (id, data) =>
  axiosInstance.patch(`/api/v1/complaints/${id}`, data);

export const escalateComplaint = (id, data) =>
  axiosInstance.post(`/api/v1/complaints/${id}/escalate`, data);

export const listComments = (id) =>
  axiosInstance.get(`/api/v1/complaints/${id}/comments`);

export const addComment = (id, body, isInternal = false) =>
  axiosInstance.post(`/api/v1/complaints/${id}/comments`, {
    body,
    is_internal: isInternal,
  });

export const listStatusHistory = (id) =>
  axiosInstance.get(`/api/v1/complaints/${id}/status-history`);

export const listAttachments = (id) =>
  axiosInstance.get(`/api/v1/complaints/${id}/attachments`);

export const downloadAttachment = (url) =>
  axiosInstance.get(url, { responseType: "blob" });

export const uploadAttachment = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return axiosInstance.post(`/api/v1/complaints/${id}/attachments`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getStats = () => axiosInstance.get("/api/v1/helpdesk/stats");
export const listAssignees = () => axiosInstance.get("/api/v1/helpdesk/assignees");
export const listKnownIssues = () => axiosInstance.get("/api/v1/helpdesk/known-issues");
export const subscribeKnownIssue = (id) =>
  axiosInstance.post(`/api/v1/helpdesk/known-issues/${id}/subscribe`);
export const analyzeIssue = (message) =>
  axiosInstance.post("/api/v1/helpdesk/assistant/analyze", { message });

export const listMaintenanceTasks = (filterBy = "all") =>
  axiosInstance.get("/api/v1/helpdesk/maintenance-tasks", {
    params: { filter_by: filterBy },
  });
export const getDutyState = () => axiosInstance.get("/api/v1/helpdesk/maintenance-duty");
export const setDutyState = (onDuty) =>
  axiosInstance.put("/api/v1/helpdesk/maintenance-duty", { on_duty: onDuty });
export const completeMaintenanceTask = (id, notes, photo) => {
  const form = new FormData();
  form.append("resolution_notes", notes);
  form.append("photo", photo);
  return axiosInstance.post(`/api/v1/helpdesk/maintenance-tasks/${id}/complete`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
