import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/operations";
export const listTasks = (status) => axiosInstance.get(`${base}/tasks`, { params: { status: status || undefined } });
export const createTask = (data) => axiosInstance.post(`${base}/tasks`, data);
export const updateTask = (id, data) => axiosInstance.patch(`${base}/tasks/${id}`, data);
export const listInventory = (search) => axiosInstance.get(`${base}/inventory`, { params: { search: search?.trim() || undefined } });
export const createInventoryItem = (data) => axiosInstance.post(`${base}/inventory`, data);
export const recordMovement = (id, data) => axiosInstance.post(`${base}/inventory/${id}/movements`, data);
export const inventoryOptions = () => axiosInstance.get(`${base}/inventory-options`);
export const listStaff = () => axiosInstance.get(`${base}/staff`);
export const listShifts = () => axiosInstance.get(`${base}/shifts`);
export const createShift = (data) => axiosInstance.post(`${base}/shifts`, data);
export const updateShiftStatus = (id, status) => axiosInstance.patch(`${base}/shifts/${id}/status`, { status });
export const getTodayAttendance = () => axiosInstance.get(`${base}/attendance/today`);
export const toggleAttendance = () => axiosInstance.post(`${base}/attendance/toggle`);
export const downloadCsv = (kind) => axiosInstance.get(`${base}/${kind}`, { responseType: "blob" });
export const saveCsv = (response, name) => { const url=URL.createObjectURL(response.data);const link=document.createElement("a");link.href=url;link.download=name;link.click();URL.revokeObjectURL(url); };
export const operationsError = (error, fallback) => { const detail=error?.response?.data?.detail;if(Array.isArray(detail))return detail.map((x)=>x.msg).join(" • ");return typeof detail==="string"?detail:fallback; };
