import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import AdminDashboard from "@/pages/AdminDashboard";
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
        <Route path="/resident" element={<ResidentDashboard />} />
        <Route path="/gate" element={<SecurityDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
