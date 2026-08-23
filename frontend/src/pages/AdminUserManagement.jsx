import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  UserCog,
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Shield,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuthContext } from "@/context/AuthContext";
import { listManagedUsers, updateUserRole } from "@/api/users";

const PAGE_SIZE = 20;

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, active: true, href: "/admin/users" },
];

// All assignable roles (super_admin cannot be assigned via UI for safety)
const ASSIGNABLE_ROLES = [
  { value: "admin", label: "Admin", color: "blue" },
  { value: "committee_member", label: "Committee Member", color: "purple" },
  { value: "flat_owner", label: "Flat Owner", color: "gray" },
  { value: "resident_rental", label: "Resident Rental", color: "teal" },
  { value: "support_staff", label: "Support Staff", color: "green" },
];

const ROLE_META = {
  super_admin:      { label: "Super Admin",      bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500"   },
  admin:            { label: "Admin",             bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"    },
  committee_member: { label: "Committee Member", bg: "bg-purple-50",  text: "text-purple-700", dot: "bg-purple-500"  },
  flat_owner:       { label: "Flat Owner",        bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400"    },
  resident_rental:  { label: "Resident Rental",   bg: "bg-teal-50",    text: "text-teal-700",   dot: "bg-teal-500"    },
  support_staff:    { label: "Support Staff",     bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500" },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function ConfirmDialog({ open, user, newRole, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-[#d87943]" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#0f2336]">Confirm Role Change</h3>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">User</span>
            <span className="font-bold text-[#0f2336]">{user?.first_name} {user?.last_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Current role</span>
            <RoleBadge role={user?.roles?.[0]} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">New role</span>
            <RoleBadge role={newRole} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#d87943] hover:bg-[#c66a39] text-white text-sm font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
            {loading ? "Updating…" : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleSelect({ user, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const currentRole = user.roles?.[0] ?? "flat_owner";
  const isSuperAdmin = currentRole === "super_admin";

  if (isSuperAdmin) {
    return (
      <span className="text-xs text-gray-400 font-medium italic">Protected</span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-[#d87943]/40 hover:bg-orange-50/30 text-xs font-semibold text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Change Role
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close role menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden min-w-[180px] py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {ASSIGNABLE_ROLES.map((r) => (
              <button
                key={r.value}
                disabled={currentRole === r.value}
                onClick={() => { setOpen(false); onSelect(r.value); }}
                className={`w-full px-4 py-2.5 text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                  currentRole === r.value
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-orange-50 hover:text-[#d87943]"
                }`}
              >
                <RoleBadge role={r.value} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminUserManagement() {
  const { user: currentUser } = useAuthContext();
  const requestId = useRef(0); const updatingRef = useRef(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [roleCounts, setRoleCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, newRole: "" });
  const [updating, setUpdating] = useState(false);

  // Toast state
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await listManagedUsers({ page, pageSize: PAGE_SIZE, search: searchQuery, role: roleFilter });
      if (current !== requestId.current) return;
      setUsers(data.items); setTotal(data.total); setRoleCounts(data.role_counts);
      if (page > 1 && data.items.length === 0 && data.total > 0) setPage(Math.ceil(data.total / PAGE_SIZE));
    } catch (err) {
      if (current === requestId.current) setError(err?.response?.data?.detail || "Failed to load users.");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [page, roleFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);
  useEffect(() => () => { requestId.current += 1; }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleRoleSelect = (targetUser, newRole) => {
    setConfirmDialog({ open: true, user: targetUser, newRole });
  };

  const handleConfirmRole = async () => {
    if (updatingRef.current) return;
    const { user: targetUser, newRole } = confirmDialog;
    updatingRef.current = true;
    setUpdating(true);
    try {
      const { data: updatedUser } = await updateUserRole(targetUser.user_id, newRole);
      setUsers((prev) =>
        roleFilter !== "all" && roleFilter !== newRole
          ? prev.filter((u) => u.user_id !== targetUser.user_id)
          : prev.map((u) => u.user_id === targetUser.user_id ? updatedUser : u)
      );
      if (roleFilter !== "all" && roleFilter !== newRole) setTotal((value) => Math.max(0, value - 1));
      setRoleCounts((counts) => {
        const currentRole = targetUser.roles?.[0];
        if (!currentRole || currentRole === newRole) return counts;
        return { ...counts, [currentRole]: Math.max(0, (counts[currentRole] || 0) - 1), [newRole]: (counts[newRole] || 0) + 1 };
      });
      setToast({ type: "success", message: `Role updated to "${ROLE_META[newRole]?.label ?? newRole}" for ${targetUser.first_name}.` });
    } catch (err) {
      setToast({ type: "error", message: err?.response?.data?.detail || "Failed to update role." });
    } finally {
      updatingRef.current = false;
      setUpdating(false);
      setConfirmDialog({ open: false, user: null, newRole: "" });
    }
  };

  const handleCancelConfirm = () => {
    if (!updating) setConfirmDialog({ open: false, user: null, newRole: "" });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const formatUnit = (user) => {
    if (!user.flat_number) return null;
    const block = user.building_block?.trim(); const flat = user.flat_number.trim();
    return block && !flat.toLowerCase().startsWith(`${block.toLowerCase()}-`) ? `${block}-${flat}` : flat;
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Super Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
            toast.type === "success" ? "bg-[#0f2336] text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success"
              ? <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
              : <AlertTriangle size={20} className="text-red-200 flex-shrink-0" />}
            <div className="flex flex-col">
              <span className="font-bold text-sm">{toast.type === "success" ? "Role Updated" : "Error"}</span>
              <span className="text-xs opacity-80">{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          user={confirmDialog.user}
          newRole={confirmDialog.newRole}
          onConfirm={handleConfirmRole}
          onCancel={handleCancelConfirm}
          loading={updating}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">User Role Management</h1>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Role Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(ROLE_META).map(([roleKey, meta]) => (
            <button
              key={roleKey}
              onClick={() => { setRoleFilter(roleFilter === roleKey ? "all" : roleKey); setPage(1); }}
              className={`p-4 rounded-2xl border text-left transition-all hover:shadow-md active:scale-95 ${
                roleFilter === roleKey
                  ? "border-[#d87943] bg-orange-50 shadow-md"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className={`text-2xl font-extrabold mb-1 ${roleFilter === roleKey ? "text-[#d87943]" : "text-[#0f2336]"}`}>
                {roleCounts[roleKey] ?? 0}
              </div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
                {meta.label}
              </div>
            </button>
          ))}
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Table Header / Filters */}
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[#0f2336] flex items-center gap-2">
              <UserCog size={20} className="text-[#d87943]" />
              All Users
              <span className="ml-1 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold">
                {total}
              </span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Role filter pill */}
              {roleFilter !== "all" && (
                <button
                  onClick={() => { setRoleFilter("all"); setPage(1); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 border border-[#d87943]/30 text-[#d87943] text-xs font-bold transition-all hover:bg-orange-100"
                >
                  <X size={12} />
                  Clear filter
                </button>
              )}
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone…"
                  aria-label="Search users"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="h-10 pl-9 pr-4 w-full sm:w-64 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#d87943]/20 focus:border-[#d87943] outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400">
                <RefreshCw size={22} className="animate-spin mr-3" />
                <span className="text-sm font-medium">Loading users…</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-4">
                <AlertTriangle size={32} className="text-red-400" />
                <p className="text-sm font-semibold text-gray-700">{error}</p>
                <button
                  onClick={fetchUsers}
                  className="px-5 py-2 rounded-xl bg-[#d87943] text-white text-sm font-semibold hover:bg-[#c66a39] transition-all"
                >
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2 text-gray-400">
                <Users size={32} />
                <p className="text-sm font-medium">No users found.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Flat / Unit</th>
                    <th className="px-6 py-4">Current Role</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const initials = `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase();
                    const currentRole = u.roles?.[0] ?? "flat_owner";
                    const isSelf = u.user_id === currentUser?.user_id;
                    const joined = u.created_at
                      ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—";

                    return (
                      <tr key={u.user_id} className="hover:bg-gray-50/50 transition-colors group">
                        {/* User */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d87943]/20 to-[#d87943]/10 text-[#d87943] flex items-center justify-center font-bold text-xs flex-shrink-0 border border-[#d87943]/10">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-[#0f2336] group-hover:text-[#d87943] transition-colors flex items-center gap-2">
                                {u.first_name} {u.last_name}
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#d87943]/10 text-[#d87943] text-[9px] font-bold uppercase tracking-wider">You</span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium">
                                {u.is_active ? (
                                  <span className="text-emerald-500">● Active</span>
                                ) : (
                                  <span className="text-red-400">● Inactive</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            {u.email && (
                              <span className="text-xs text-gray-600 font-medium">{u.email}</span>
                            )}
                            <span className="text-xs text-gray-400">{u.phone_number}</span>
                          </div>
                        </td>

                        {/* Flat */}
                        <td className="px-6 py-4">
                          {formatUnit(u) ? (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs">
                              {formatUnit(u)}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <RoleBadge role={currentRole} />
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-4 text-xs text-gray-400 font-medium">{joined}</td>

                        {/* Action */}
                        <td className="px-6 py-4 text-right">
                          {isSelf ? (
                            <span className="text-xs text-gray-300 italic">—</span>
                          ) : (
                            <RoleSelect
                              user={u}
                              onSelect={(newRole) => handleRoleSelect(u, newRole)}
                              disabled={updating}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && users.length > 0 && (
            <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between gap-4 text-xs text-gray-400 font-medium">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + users.length} of {total} users</span>
              {totalPages > 1 && <div className="flex items-center gap-3"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Previous users</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Next users</button></div>}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
