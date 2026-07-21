import {
  LayoutDashboard,
  Wallet,
  Wrench,
  CalendarDays,
  QrCode,
  Users
} from "lucide-react";

export const getResidentSidebarItems = (currentPath) => [
  { label: "Dashboard", icon: LayoutDashboard, active: currentPath === "/resident", href: "/resident" },
  { label: "Financials", icon: Wallet, active: currentPath === "/resident/finance", href: "/resident/finance" },
  { label: "Helpdesk", icon: Wrench, active: currentPath === "/resident/helpdesk", href: "/resident/helpdesk" },
  { label: "Community", icon: Users, active: currentPath === "/resident/community", href: "/resident/community" },
  { label: "Amenities", icon: CalendarDays, active: currentPath === "/resident/amenities", href: "/resident/amenities" },
  { label: "Digital ID", icon: QrCode, active: currentPath === "/resident/digital-id", href: "/resident/digital-id" },
];
