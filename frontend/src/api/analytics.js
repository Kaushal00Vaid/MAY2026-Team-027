import axiosInstance from "./axiosInstance";

/**
 * Fetch analytics data for the Admin Dashboard.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const getAdminAnalytics = ({ months = 6 } = {}) => {
  return axiosInstance.get("/api/v1/analytics/admin", { params: { months } });
};

export const getAdminAdvancedAnalytics = ({ amenityId } = {}) => {
  return axiosInstance.get("/api/v1/analytics/advanced", {
    params: amenityId ? { amenity_id: amenityId } : {},
  });
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

/**
 * Fetch analytics data for the Staff Dashboard.
 *
 * @returns {Promise<AxiosResponse>}
 */
export const getStaffAnalytics = () => {
  return axiosInstance.get("/api/v1/analytics/staff");
};
