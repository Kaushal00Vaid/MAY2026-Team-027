import axiosInstance from "@/api/axiosInstance";

const base = "/api/v1/finance";

export const getResidentFinance = () => axiosInstance.get(`${base}/resident-summary`);
export const getAdminFinance = () => axiosInstance.get(`${base}/admin-summary`);
export const getFinanceLedger = (page = 1, pageSize = 20) =>
  axiosInstance.get(`${base}/ledger`, { params: { page, page_size: pageSize } });
export const generateBulkInvoices = (data, idempotencyKey) =>
  axiosInstance.post(`${base}/invoices/bulk`, data, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
export const completePayment = (data, idempotencyKey) =>
  axiosInstance.post(`${base}/payments`, data, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
export const createExpense = (data) => axiosInstance.post(`${base}/expenses`, data);
export const downloadStatement = () =>
  axiosInstance.get(`${base}/statement`, { responseType: "blob" });
export const downloadAnnualAudit = (year = new Date().getFullYear()) =>
  axiosInstance.get(`${base}/reports/annual-audit`, {
    params: { year }, responseType: "blob",
  });
export const downloadReceipt = (paymentId) =>
  axiosInstance.get(`${base}/payments/${paymentId}/receipt`, { responseType: "blob" });

export const saveBlob = (response, filename) => {
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const financeError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" • ");
  return typeof detail === "string" ? detail : fallback;
};
