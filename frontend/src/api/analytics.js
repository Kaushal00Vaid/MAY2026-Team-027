import axiosInstance from "./axiosInstance";

/**
 * Fetch analytics data for the Admin Dashboard.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const getAdminAnalytics = () => {
  return axiosInstance.get("/api/v1/analytics/admin");
};

export const getAdminAdvancedAnalytics = () => {
  return axiosInstance.get("/api/v1/analytics/advanced");
};

/**
 * Fetch analytics data for the Resident Dashboard.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const getResidentAnalytics = () => {
  return axiosInstance.get("/api/v1/analytics/resident");
};

/**
 * Download advanced analytics as CSV.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const downloadAnalyticsExport = () => {
  return axiosInstance.get("/api/v1/analytics/export", { responseType: 'blob' });
};
