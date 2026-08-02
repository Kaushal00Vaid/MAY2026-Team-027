import axiosInstance from "./axiosInstance";

/**
 * Fetch recent society financial transactions.
 *
 * @param {{ type?: "income"|"expense", limit?: number, offset?: number }} params
 * @returns {Promise<AxiosResponse>}
 */
export const getTransactions = ({ type, limit = 10, offset = 0 } = {}) => {
  const params = { limit, offset };
  // Normalize plural UI tab value → singular API value
  const normalizedType = type === "expenses" ? "expense" : type;
  if (normalizedType && normalizedType !== "all") params.type = normalizedType;
  return axiosInstance.get("/api/finance/transactions", { params });
};

/**
 * Create a new financial transaction.
 *
 * @param {{ unit_or_vendor: string, category: string, amount: number, type: "income"|"expense", description?: string, transaction_date?: string }} data
 * @returns {Promise<AxiosResponse>}
 */
export const createTransaction = (data) =>
  axiosInstance.post("/api/finance/transactions", data);
