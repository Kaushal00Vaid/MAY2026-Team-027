import axiosInstance from "./axiosInstance";

/**
 * Fetch analytics data for the Admin Dashboard.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const getAdminAnalytics = () => {
  return axiosInstance.get("/api/v1/analytics/admin");
};
