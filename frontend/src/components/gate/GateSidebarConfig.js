import {
  LayoutDashboard,
  ArrowRightToLine,
  Wrench,
  TreePine,
  Package,
  Users
} from "lucide-react";

export const getGateSidebarItems = (currentPath) => [
  { label: "Dashboard", icon: LayoutDashboard, active: currentPath === "/gate/dashboard", href: "/gate/dashboard" },
  { label: "Entry Control", icon: ArrowRightToLine, active: currentPath === "/gate", href: "/gate" },
  { label: "Maintenance", icon: Wrench, active: currentPath === "/gate/maintenance", href: "/gate/maintenance" },
  { label: "Grounds & Ops", icon: TreePine, active: currentPath === "/gate/operations", href: "/gate/operations" },
  { label: "Inventory", icon: Package, active: currentPath === "/gate/inventory", href: "/gate/inventory" },
  { label: "Staff Roster", icon: Users, active: currentPath === "/gate/roster", href: "/gate/roster" },
];
