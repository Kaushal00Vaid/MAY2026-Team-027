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
import SecurityDashboard from "@/pages/SecurityDashboard";

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
        <Route path="/gate" element={<SecurityDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
