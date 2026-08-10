// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

let authState;
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authState }));

function Destination({ label }) {
  const location = useLocation();
  return <p>{label}:{location.state?.from?.pathname || "none"}</p>;
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/signin" element={<Destination label="signin"/>}/>
        <Route path="/unauthorized" element={<Destination label="unauthorized"/>}/>
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><p>admin content</p></ProtectedRoute>}/>
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("ProtectedRoute", () => {
  it("keeps the protected destination while authentication loads", () => {
    authState = { isLoading: true, isAuthenticated: false, user: null };
    renderRoute();
    expect(screen.getByText("Loading your session…")).toBeTruthy();
  });

  it("redirects signed-out users and preserves their destination", () => {
    authState = { isLoading: false, isAuthenticated: false, user: null };
    renderRoute();
    expect(screen.getByText("signin:/admin")).toBeTruthy();
  });

  it("rejects authenticated users without an allowed role", () => {
    authState = { isLoading: false, isAuthenticated: true, user: { roles: ["flat_owner"] } };
    renderRoute();
    expect(screen.getByText("unauthorized:none")).toBeTruthy();
  });

  it("renders protected content for an allowed role", () => {
    authState = { isLoading: false, isAuthenticated: true, user: { roles: ["admin"] } };
    renderRoute();
    expect(screen.getByText("admin content")).toBeTruthy();
  });
});
