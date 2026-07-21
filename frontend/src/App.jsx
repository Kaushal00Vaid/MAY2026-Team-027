import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminFinance from "@/pages/AdminFinance";
import AdminHelpdesk from "@/pages/AdminHelpdesk";
import AdminSecurity from "@/pages/AdminSecurity";
import AdminAmenities from "@/pages/AdminAmenities";
import AdminCommunity from "@/pages/AdminCommunity";
import AdminAnalytics from "@/pages/AdminAnalytics";
import ResidentDashboard from "@/pages/ResidentDashboard";
import ResidentFinancials from "@/pages/ResidentFinancials";
import ResidentHelpdesk from "@/pages/ResidentHelpdesk";
import ResidentAmenities from "@/pages/ResidentAmenities";
import ResidentCommunity from "@/pages/ResidentCommunity";
import ResidentDigitalID from "@/pages/ResidentDigitalID";
import SecurityDashboard from "@/pages/SecurityDashboard";
import StaffMaintenance from "@/pages/StaffMaintenance";
import StaffOperations from "@/pages/StaffOperations";
import StaffInventory from "@/pages/StaffInventory";
import StaffRoster from "@/pages/StaffRoster";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/finance" element={<AdminFinance />} />
        <Route path="/admin/helpdesk" element={<AdminHelpdesk />} />
        <Route path="/admin/security" element={<AdminSecurity />} />
        <Route path="/admin/amenities" element={<AdminAmenities />} />
        <Route path="/admin/community" element={<AdminCommunity />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/resident" element={<ResidentDashboard />} />
        <Route path="/resident/finance" element={<ResidentFinancials />} />
        <Route path="/resident/helpdesk" element={<ResidentHelpdesk />} />
        <Route path="/resident/amenities" element={<ResidentAmenities />} />
        <Route path="/resident/community" element={<ResidentCommunity />} />
        <Route path="/resident/digital-id" element={<ResidentDigitalID />} />
        <Route path="/gate" element={<SecurityDashboard />} />
        <Route path="/gate/maintenance" element={<StaffMaintenance />} />
        <Route path="/gate/operations" element={<StaffOperations />} />
        <Route path="/gate/inventory" element={<StaffInventory />} />
        <Route path="/gate/roster" element={<StaffRoster />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
