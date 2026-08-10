// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Headphones, LayoutDashboard } from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const logout = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ logout }) }));
vi.mock("@/features/realtime/NotificationMenu", () => ({ default: () => <button type="button">Notifications</button> }));
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, layoutId, ...props }) => { void layoutId; return <div {...props}>{children}</div>; },
    header: ({ children, animate, transition, ...props }) => { void animate; void transition; return <header {...props}>{children}</header>; },
  },
  useScroll: () => ({ scrollY: {} }),
  useMotionValueEvent: () => undefined,
}));

const items = [
  { label: "Dashboard", icon: LayoutDashboard, active: true, href: "/admin" },
  { label: "Helpdesk", icon: Headphones, href: "/admin/helpdesk" },
];

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/admin" element={<DashboardLayout sidebarItems={items} userRole="Admin" userName="Asha Shah"><p>Dashboard content</p></DashboardLayout>}/>
        <Route path="/admin/helpdesk" element={<p>Helpdesk destination</p>}/>
        <Route path="/account" element={<p>Account destination</p>}/>
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardLayout navigation", () => {
  afterEach(cleanup);

  it("opens the mobile drawer and navigates using its role links", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(screen.getByRole("button", { name: /close menu/i })).toBeTruthy();

    const helpdeskLinks = screen.getAllByRole("link", { name: /helpdesk/i });
    fireEvent.click(helpdeskLinks.at(-1));
    expect(await screen.findByText("Helpdesk destination")).toBeTruthy();
  });

  it("searches available navigation and supports keyboard submission", async () => {
    renderLayout();
    const search = screen.getByRole("textbox", { name: /search dashboard navigation/i });
    fireEvent.change(search, { target: { value: "help" } });
    fireEvent.submit(search.closest("form"));
    expect(await screen.findByText("Helpdesk destination")).toBeTruthy();
  });

  it("routes settings and profile controls to the account page", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: /account settings/i }));
    expect(await screen.findByText("Account destination")).toBeTruthy();
  });
});
