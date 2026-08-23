import { useEffect, useRef, useState } from "react";
import {
  BarChart3, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Headset, LayoutDashboard, LogIn, LogOut, Radio, Search, ShieldCheck,
  UserCog, Users, WalletCards, XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { useAuth } from "@/hooks/useAuth";
import {
  decideVisitor, listAccessLogs, listVisitors, securityError, visitorEntry, visitorExit,
} from "@/features/security/api";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Finance", icon: WalletCards, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: true, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, href: "/admin/amenities" },
  { label: "Community", icon: Users, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, href: "/admin/users" },
];
const PAGE_SIZE = 20;

export default function AdminSecurity() {
  const { user } = useAuth();
  const sequence = useRef(0);
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logsError, setLogsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");

  const load = async (query = search, pageValue = page) => {
    const id = ++sequence.current;
    setLoading(true);
    setLogsLoading(true);
    setError("");
    setLogsError("");
    const [visitorResult, logResult] = await Promise.allSettled([
      listVisitors({ search: query.trim() || undefined, page: pageValue, page_size: PAGE_SIZE }),
      listAccessLogs(20),
    ]);
    if (id !== sequence.current) return;
    if (visitorResult.status === "fulfilled") {
      const data = visitorResult.value.data;
      setVisitors(data.items);
      setTotal(data.total);
      setSelected((current) => current ? data.items.find((item) => item.id === current.id) || null : null);
    } else {
      setVisitors([]);
      setTotal(0);
      setError(securityError(visitorResult.reason, "Unable to load visitor log."));
    }
    if (logResult.status === "fulfilled") setLogs(logResult.value.data);
    else {
      setLogs([]);
      setLogsError(securityError(logResult.reason, "Unable to load the access audit."));
    }
    setLoading(false);
    setLogsLoading(false);
  };

  useEffect(() => {
    sequence.current += 1;
    const timer = setTimeout(() => load(search, page), 250);
    return () => clearTimeout(timer);
  }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { sequence.current += 1; }, []);
  useRealtimeRefresh(["security"], () => load(search, page));
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const act = async (action) => {
    if (!selected || saving) return;
    setSaving(true);
    setActionError("");
    try {
      if (action === "approved" || action === "denied") {
        await decideVisitor(selected.id, action, selected.version);
      } else if (action === "entry") await visitorEntry(selected.id);
      else await visitorExit(selected.id);
      setSelected(null);
      setToast(`Visitor ${action} recorded.`);
      await load(search, page);
    } catch (requestError) {
      setActionError(securityError(requestError, "Unable to update visitor."));
    } finally {
      setSaving(false);
    }
  };

  const userName = user ? `${user.first_name} ${user.last_name}` : "Admin";
  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const visibleSidebarItems = sidebarItems.filter((item) => item.href !== "/admin/users" || isSuperAdmin);
  const roleLabel = isSuperAdmin ? "Super Admin" : userRoles.includes("admin") ? "Residential Admin" : "Committee Member";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <DashboardLayout sidebarItems={visibleSidebarItems} userRole={roleLabel} userName={userName}>
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 relative">
      {toast && <div role="status" className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex gap-2"><Radio size={20}/>{toast}</div>}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-[#0f2336]">Security Console</h1>
        <div className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search visitors" placeholder="Search visitors..." className="w-64 h-10 pl-10 pr-4 rounded-xl border bg-white"/></div>
      </div>
      {error && <div role="alert" className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-xl font-bold text-[#0f2336]">Live Visitor Log</h3></div>
        {loading && <p role="status" className="p-8 text-gray-500">Loading visitor log…</p>}
        {!loading && visitors.length === 0 && <p className="p-8 text-gray-500">No visitors match the search.</p>}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-[11px] uppercase text-gray-500 bg-gray-50"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Purpose</th><th className="px-6 py-4">Target Unit</th><th className="px-6 py-4">Vehicle</th><th className="px-6 py-4">Requested</th><th className="px-6 py-4">Status</th></tr></thead><tbody className="divide-y">{visitors.map((row) => <tr key={row.id} onClick={() => { setActionError(""); setSelected(row); }} className="hover:bg-gray-50 cursor-pointer"><td className="px-6 py-5 font-semibold">{row.visitor_name}</td><td className="px-6 py-5 text-gray-500">{row.purpose}</td><td className="px-6 py-5">{row.unit || "N/A"}</td><td className="px-6 py-5 font-mono text-xs">{row.vehicle_number || "—"}</td><td className="px-6 py-5 text-gray-500">{new Date(row.requested_at).toLocaleString()}</td><td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${row.status === "approved" || row.status === "inside" ? "bg-emerald-50 text-emerald-600" : row.status === "denied" || row.status === "expired" ? "bg-red-50 text-red-600" : "bg-orange-100 text-orange-600"}`}>{row.status}</span></td></tr>)}</tbody></table></div>
        {!loading && total > 0 && <div className="p-4 border-t flex justify-between"><span className="text-sm text-gray-500">{total} visitor(s)</span><div className="flex items-center gap-2"><button aria-label="Previous visitor page" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft size={16}/></button><span className="text-sm">Page {page} of {pages}</span><button aria-label="Next visitor page" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight size={16}/></button></div></div>}
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-xl font-bold text-[#0f2336]">Recent Access Audit</h3></div>
        {logsError && <p role="alert" className="m-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{logsError}</p>}
        {logsLoading && <p role="status" className="p-8 text-gray-500">Loading access audit…</p>}
        {!logsLoading && !logsError && logs.length === 0 && <p className="p-8 text-gray-500">No access activity recorded.</p>}
        {!logsLoading && logs.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-[11px] uppercase text-gray-500 bg-gray-50"><tr><th className="px-6 py-4">Event</th><th className="px-6 py-4">Subject</th><th className="px-6 py-4">Unit</th><th className="px-6 py-4">Gate</th><th className="px-6 py-4">Details</th><th className="px-6 py-4">Time</th></tr></thead><tbody className="divide-y">{logs.map((row) => <tr key={row.id}><td className="px-6 py-4 font-semibold capitalize">{row.event_type.replaceAll("_", " ")}</td><td className="px-6 py-4">{row.subject_name}</td><td className="px-6 py-4">{row.unit || "—"}</td><td className="px-6 py-4">{row.gate}</td><td className="px-6 py-4 text-gray-500">{row.details || "—"}</td><td className="px-6 py-4 text-gray-500">{new Date(row.occurred_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </div>

      {selected && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="visitor-title"><div className="bg-white rounded-3xl p-8 w-full max-w-sm relative"><button aria-label="Close visitor details" disabled={saving} onClick={() => setSelected(null)} className="absolute right-6 top-6"><XCircle size={20}/></button><h3 id="visitor-title" className="text-xl font-bold text-[#0f2336]">{selected.visitor_name}</h3><p className="text-sm text-gray-500">{selected.purpose} • {selected.unit}</p><p className="mt-4 text-sm">Resident: <strong>{selected.resident_name}</strong></p>{actionError && <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{actionError}</p>}<div className="flex gap-2 mt-6">{selected.status === "pending" && <><button disabled={saving} onClick={() => act("denied")} className="flex-1 py-3 bg-red-500 disabled:opacity-50 text-white rounded-xl flex justify-center gap-1"><XCircle size={18}/>Deny</button><button disabled={saving} onClick={() => act("approved")} className="flex-1 py-3 bg-[#5f8787] disabled:opacity-50 text-white rounded-xl flex justify-center gap-1"><CheckCircle2 size={18}/>Approve</button></>}{selected.status === "approved" && <button disabled={saving} onClick={() => act("entry")} className="w-full py-3 bg-emerald-600 disabled:opacity-50 text-white rounded-xl flex justify-center gap-2"><LogIn size={18}/>Record Entry</button>}{selected.status === "inside" && <button disabled={saving} onClick={() => act("exit")} className="w-full py-3 bg-[#0f2336] disabled:opacity-50 text-white rounded-xl flex justify-center gap-2"><LogOut size={18}/>Record Exit</button>}{!["pending", "approved", "inside"].includes(selected.status) && <div className="w-full p-3 bg-gray-50 rounded-xl text-center text-sm"><Clock size={16} className="inline mr-1"/>No action available</div>}</div></div></div>}
    </div>
  </DashboardLayout>;
}
