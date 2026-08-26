import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import "./App.css";

// Auth context
import { AuthProvider } from "@/context/AuthContext";
import { RealtimeProvider } from "@/features/realtime/RealtimeContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Keep the initial bundle small by loading each page only when its route is visited.
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminFinance = lazy(() => import("@/pages/AdminFinance"));
const AdminHelpdesk = lazy(() => import("@/pages/AdminHelpdesk"));
const AdminSecurity = lazy(() => import("@/pages/AdminSecurity"));
const AdminAmenities = lazy(() => import("@/pages/AdminAmenities"));
const AdminCommunity = lazy(() => import("@/pages/AdminCommunity"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const ResidentDashboard = lazy(() => import("@/pages/ResidentDashboard"));
const ResidentFinancials = lazy(() => import("@/pages/ResidentFinancials"));
const ResidentHelpdesk = lazy(() => import("@/pages/ResidentHelpdesk"));
const ResidentAmenities = lazy(() => import("@/pages/ResidentAmenities"));
const ResidentCommunity = lazy(() => import("@/pages/ResidentCommunity"));
const ResidentDigitalID = lazy(() => import("@/pages/ResidentDigitalID"));
const SecurityDashboard = lazy(() => import("@/pages/SecurityDashboard"));
const StaffDashboard = lazy(() => import("@/pages/StaffDashboard"));
const StaffMaintenance = lazy(() => import("@/pages/StaffMaintenance"));
const StaffOperations = lazy(() => import("@/pages/StaffOperations"));
const StaffInventory = lazy(() => import("@/pages/StaffInventory"));
const StaffRoster = lazy(() => import("@/pages/StaffRoster"));
const AdminUserManagement = lazy(() => import("@/pages/AdminUserManagement"));
const CompleteProfile = lazy(() => import("@/pages/CompleteProfile"));
const GoogleAuthSuccess = lazy(() => import("@/pages/GoogleAuthSuccess"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Role constants
const ADMIN_ROLES = ["super_admin", "admin", "committee_member"];
const RESIDENT_ROLES = ["flat_owner", "resident_rental"];
const STAFF_ROLES = ["support_staff"];
const OPERATIONS_ROLES = [...STAFF_ROLES, ...ADMIN_ROLES];
const SUPER_ADMIN_ROLES = ["super_admin"];


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RealtimeProvider>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Loading page…</div>}>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />

          {/* Unauthorized fallback */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center text-center p-8">
                <div>
                  <h1 className="text-2xl font-bold text-[#0f1a2b] mb-2">Access Denied</h1>
                  <p className="text-muted-foreground">You don't have permission to view this page.</p>
                </div>
              </div>
            }
          />
          <Route path="/unauthorised" element={<Navigate to="/unauthorized" replace />} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/finance" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminFinance /></ProtectedRoute>
          } />
          <Route path="/admin/helpdesk" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminHelpdesk /></ProtectedRoute>
          } />
          <Route path="/admin/security" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminSecurity /></ProtectedRoute>
          } />
          <Route path="/admin/amenities" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminAmenities /></ProtectedRoute>
          } />
          <Route path="/admin/community" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminCommunity /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminAnalytics /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}><AdminUserManagement /></ProtectedRoute>
          } />

          {/* Resident routes */}
          <Route path="/resident" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentDashboard /></ProtectedRoute>
          } />
          <Route path="/resident/finance" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentFinancials /></ProtectedRoute>
          } />
          <Route path="/resident/helpdesk" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentHelpdesk /></ProtectedRoute>
          } />
          <Route path="/resident/amenities" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentAmenities /></ProtectedRoute>
          } />
          <Route path="/resident/community" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentCommunity /></ProtectedRoute>
          } />
          <Route path="/resident/digital-id" element={
            <ProtectedRoute allowedRoles={RESIDENT_ROLES}><ResidentDigitalID /></ProtectedRoute>
          } />

          {/* Gate / Staff routes */}
          <Route path="/gate/dashboard" element={
            <ProtectedRoute allowedRoles={STAFF_ROLES}><StaffDashboard /></ProtectedRoute>
          } />
          <Route path="/gate" element={
            <ProtectedRoute allowedRoles={STAFF_ROLES} allowedStaffTypes={["security"]}><SecurityDashboard /></ProtectedRoute>
          } />
          <Route path="/gate/maintenance" element={
            <ProtectedRoute allowedRoles={STAFF_ROLES}><StaffMaintenance /></ProtectedRoute>
          } />
          <Route path="/gate/operations" element={
            <ProtectedRoute allowedRoles={STAFF_ROLES}><StaffOperations /></ProtectedRoute>
          } />
          <Route path="/gate/inventory" element={
            <ProtectedRoute allowedRoles={STAFF_ROLES}><StaffInventory /></ProtectedRoute>
          } />
          <Route path="/gate/roster" element={
            <ProtectedRoute allowedRoles={OPERATIONS_ROLES}><StaffRoster /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
