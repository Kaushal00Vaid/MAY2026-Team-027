import axiosInstance from "./axiosInstance";

/**
 * List all registered users. Super admin only.
 * @param {number} skip - Pagination offset
 * @param {number} limit - Max users to return
 * @returns {Promise<Array>} Array of UserMeResponse objects
 */
export const listUsers = (skip = 0, limit = 50) =>
  axiosInstance.get("/users/", { params: { skip, limit } });

export const getCurrentUser = () => axiosInstance.get("/users/me");

/**
 * Update a user's role. Super admin (or admin with restrictions) only.
 * @param {number} userId
 * @param {string} roleName - One of: super_admin, admin, committee_member, flat_owner, resident_rental, support_staff
 */
export const updateUserRole = (userId, roleName) =>
  axiosInstance.patch(`/users/${userId}/role`, { role_name: roleName });
