import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import SignUpPage from "@/components/auth/SignUpPage";
import SignInPage from "@/components/auth/SignInPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
