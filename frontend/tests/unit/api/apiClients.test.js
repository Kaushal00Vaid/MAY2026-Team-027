import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/api/axiosInstance", () => ({ default: http }));

import * as analytics from "@/api/analytics";
import * as auth from "@/api/auth";
import * as legacyFinance from "@/api/finance";
import * as users from "@/api/users";
import * as amenities from "@/features/amenities/api";
import * as community from "@/features/community/api";
import * as finance from "@/features/finance/api";
import * as helpdesk from "@/features/helpdesk/api";
import * as operations from "@/features/operations/api";
import * as realtime from "@/features/realtime/api";
import * as security from "@/features/security/api";

beforeEach(() => vi.clearAllMocks());

describe("auth, users, and analytics API clients", () => {
  it("maps authentication operations to backend routes", () => {
    const payload = { email: "resident@example.com" };
    auth.signup(payload);
    auth.loginWithPassword("a@b.com", "secret");
    auth.requestOtp("+919999999999");
    auth.verifyOtp("+919999999999", "123456");
    auth.refreshAccessToken();
    auth.logout();
    auth.getMe();
    auth.completeProfile(payload, "pending-token");

    expect(http.post).toHaveBeenCalledWith("/auth/signup", payload);
    expect(http.post).toHaveBeenCalledWith("/auth/login/password", { email: "a@b.com", password: "secret" });
    expect(http.post).toHaveBeenCalledWith("/auth/otp/request", { phone_number: "+919999999999" });
    expect(http.post).toHaveBeenCalledWith("/auth/otp/verify", { phone_number: "+919999999999", otp_code: "123456" });
    expect(http.post).toHaveBeenCalledWith("/auth/refresh");
    expect(http.post).toHaveBeenCalledWith("/auth/logout");
    expect(http.get).toHaveBeenCalledWith("/auth/me");
    expect(http.post).toHaveBeenCalledWith("/auth/complete-profile", payload, expect.objectContaining({ _skipAuth: true }));
  });

  it("maps user-management operations", () => {
    users.listUsers(10, 25);
    users.listManagedUsers({ page: 2, pageSize: 20, search: " A-101 ", role: "flat_owner" });
    users.getCurrentUser();
    users.updateUserRole(7, "admin");
    expect(http.get).toHaveBeenCalledWith("/users/", { params: { skip: 10, limit: 25 } });
    expect(http.get).toHaveBeenCalledWith("/users/manage", { params: { page: 2, page_size: 20, search: "A-101", role: "flat_owner" } });
    expect(http.get).toHaveBeenCalledWith("/users/me");
    expect(http.patch).toHaveBeenCalledWith("/users/7/role", { role_name: "admin" });
  });

  it("maps every analytics operation", () => {
    analytics.getAdminAnalytics({ months: 12 });
    analytics.getAdminAdvancedAnalytics({ amenityId: 4 });
    analytics.getResidentAnalytics();
    analytics.getStaffAnalytics();
    analytics.downloadAnalyticsExport();
    expect(http.get).toHaveBeenCalledWith("/api/v1/analytics/admin", { params: { months: 12 } });
    expect(http.get).toHaveBeenCalledWith("/api/v1/analytics/advanced", { params: { amenity_id: 4 } });
    expect(http.get).toHaveBeenCalledWith("/api/v1/analytics/resident");
    expect(http.get).toHaveBeenCalledWith("/api/v1/analytics/staff");
    expect(http.get).toHaveBeenCalledWith("/api/v1/analytics/export", { params: {}, responseType: "blob" });
  });
});

describe("finance and amenities API clients", () => {
  it("maps legacy and v1 finance operations", () => {
    const payload = { amount: 100 };
    legacyFinance.getTransactions({ type: "expenses", limit: 5, offset: 10 });
    legacyFinance.createTransaction(payload);
    finance.getResidentFinance();
    finance.getAdminFinance();
    finance.getFinanceLedger(2, 50);
    finance.generateBulkInvoices(payload, "invoice-key");
    finance.completePayment(payload, "payment-key");
    finance.createExpense(payload);
    finance.downloadStatement();
    finance.downloadAnnualAudit();
    finance.downloadReceipt(8);
    expect(http.get).toHaveBeenCalledWith("/api/finance/transactions", { params: { limit: 5, offset: 10, type: "expense" } });
    expect(http.post).toHaveBeenCalledWith("/api/finance/transactions", payload);
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/resident-summary");
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/admin-summary");
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/ledger", { params: { page: 2, page_size: 50 } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/finance/invoices/bulk", payload, { headers: { "Idempotency-Key": "invoice-key" } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/finance/payments", payload, { headers: { "Idempotency-Key": "payment-key" } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/finance/expenses", payload);
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/statement", { responseType: "blob" });
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/reports/annual-audit", {
      params: { year: new Date().getFullYear() }, responseType: "blob",
    });
    expect(http.get).toHaveBeenCalledWith("/api/v1/finance/payments/8/receipt", { responseType: "blob" });
  });

  it("maps every amenities and booking operation", () => {
    const payload = { name: "Clubhouse" };
    amenities.listAmenities(true);
    amenities.createAmenity(payload);
    amenities.updateAmenity(2, payload);
    amenities.getAvailability(2, "2026-08-11", 14);
    amenities.listBookings({ page: 2 });
    amenities.createBooking(payload, "booking-key");
    amenities.cancelBooking(9);
    expect(http.get).toHaveBeenCalledWith("/api/v1/amenities", { params: { include_inactive: true } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/amenities", payload);
    expect(http.patch).toHaveBeenCalledWith("/api/v1/amenities/2", payload);
    expect(http.get).toHaveBeenCalledWith("/api/v1/amenities/2/availability", { params: { start_date: "2026-08-11", days: 14 } });
    expect(http.get).toHaveBeenCalledWith("/api/v1/bookings", { params: { page: 2 } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/bookings", payload, { headers: { "Idempotency-Key": "booking-key" } });
    expect(http.post).toHaveBeenCalledWith("/api/v1/bookings/9/cancel");
  });
});

describe("community, operations, security, and realtime API clients", () => {
  it("maps all community operations", () => {
    community.listNotices(); community.createNotice({ title: "Notice" }); community.markNoticeRead(1);
    community.listEvents(); community.updateRsvp(2, "going"); community.listVolunteers();
    community.signupVolunteer(3); community.withdrawVolunteer(3); community.getActivePoll();
    community.votePoll(4, 5); community.listDiscussions(); community.listDirectory({ search: " alice " });
    expect(http.post).toHaveBeenCalledWith("/api/v1/community/notices/1/read");
    expect(http.put).toHaveBeenCalledWith("/api/v1/community/events/2/rsvp", { status: "going" });
    expect(http.delete).toHaveBeenCalledWith("/api/v1/community/volunteers/3/signup");
    expect(http.post).toHaveBeenCalledWith("/api/v1/community/polls/4/votes", { option_id: 5 });
    expect(http.get).toHaveBeenCalledWith("/api/v1/community/directory", { params: { search: "alice", page: 1, page_size: 10 } });
  });

  it("maps all operations routes", () => {
    const payload = { title: "Inspect pump" };
    operations.listTasks("open"); operations.createTask(payload); operations.updateTask(1, payload);
    operations.listInventory(" pump "); operations.createInventoryItem(payload); operations.recordMovement(2, payload);
    operations.inventoryOptions(); operations.listStaff(); operations.listShifts(); operations.createShift(payload);
    operations.updateShiftStatus(3, "active"); operations.getTodayAttendance(); operations.toggleAttendance();
    operations.downloadCsv("inventory-export"); operations.downloadCsv("shifts/export");
    expect(http.patch).toHaveBeenCalledWith("/api/v1/operations/tasks/1", payload);
    expect(http.post).toHaveBeenCalledWith("/api/v1/operations/inventory/2/movements", payload);
    expect(http.patch).toHaveBeenCalledWith("/api/v1/operations/shifts/3/status", { status: "active" });
    expect(http.get).toHaveBeenCalledWith("/api/v1/operations/inventory-export", { responseType: "blob" });
    expect(http.get).toHaveBeenCalledWith("/api/v1/operations/shifts/export", { responseType: "blob" });
  });

  it("maps all security routes, including resident ID verification", () => {
    const payload = { token: "qr-token" };
    security.listVisitors({ status: "pending" }); security.createVisitor(payload);
    security.decideVisitor(1, "approved", 2, "ok"); security.visitorEntry(1); security.visitorExit(1);
    security.listGuestPasses(); security.createGuestPass(payload); security.revokeGuestPass(3);
    security.verifyGuestPin("1234"); security.manualResidentEntry("A-101"); security.listAccessLogs(20);
    security.getResidentId(); security.verifyResidentId(payload);
    expect(http.post).toHaveBeenCalledWith("/api/v1/security/visitors/1/decision", { decision: "approved", expected_version: 2, note: "ok" });
    expect(http.post).toHaveBeenCalledWith("/api/v1/security/guest-passes/verify-pin", { pin: "1234" });
    expect(http.post).toHaveBeenCalledWith("/api/v1/security/resident-id/verify", payload);
    expect(http.get).toHaveBeenCalledWith("/api/v1/security/access-logs", { params: { limit: 20 } });
  });

  it("maps websocket-ticket and notification operations", () => {
    realtime.createWebSocketTicket(); realtime.getNotifications({ unread_only: true });
    realtime.markNotificationRead(5); realtime.markAllNotificationsRead();
    expect(http.post).toHaveBeenCalledWith("/auth/ws-ticket");
    expect(http.get).toHaveBeenCalledWith("/api/v1/notifications", { params: { unread_only: true } });
    expect(http.patch).toHaveBeenCalledWith("/api/v1/notifications/5/read");
    expect(http.post).toHaveBeenCalledWith("/api/v1/notifications/read-all");
  });
});

describe("helpdesk API client", () => {
  it("maps complaints, attachments, assistant, and maintenance routes", () => {
    const payload = { category: "Electrical" };
    helpdesk.listComplaints({ page: 2 }); helpdesk.createComplaint(payload); helpdesk.getComplaint(1);
    helpdesk.updateComplaint(1, payload); helpdesk.escalateComplaint(1, payload); helpdesk.listComments(1);
    helpdesk.addComment(1, "Update", true); helpdesk.listStatusHistory(1); helpdesk.listAttachments(1);
    helpdesk.downloadAttachment("/api/v1/complaints/1/attachments/2"); helpdesk.getStats();
    helpdesk.listAssignees(); helpdesk.listKnownIssues(); helpdesk.subscribeKnownIssue(1);
    helpdesk.analyzeIssue("Water leak"); helpdesk.listMaintenanceTasks("mine"); helpdesk.getDutyState();
    helpdesk.setDutyState(true);
    expect(http.post).toHaveBeenCalledWith("/api/v1/complaints/1/comments", { body: "Update", is_internal: true });
    expect(http.get).toHaveBeenCalledWith("/api/v1/complaints/1/attachments");
    expect(http.post).toHaveBeenCalledWith("/api/v1/helpdesk/assistant/analyze", { message: "Water leak" });
    expect(http.put).toHaveBeenCalledWith("/api/v1/helpdesk/maintenance-duty", { on_duty: true });
  });
});
