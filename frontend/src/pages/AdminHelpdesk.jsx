import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, WalletCards, Headset, ShieldCheck, CalendarCheck, Users, BarChart3, Filter, Plus, AlertTriangle, Clock, ArrowRight, Droplet, Wrench, Search, CheckCircle2, X, UploadCloud, UserCog, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { useAuth } from "@/hooks/useAuth";
import {
  createComplaint, errorMessage, escalateComplaint, getStats,
  listAssignees, listComments, listComplaints, listKnownIssues,
  updateComplaint, uploadAttachment,
} from "@/features/helpdesk/api";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Finance", icon: WalletCards, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: true, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, href: "/admin/amenities" },
  { label: "Community", icon: Users, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, href: "/admin/users" },
];
const EMPTY_STATS = { active: 0, unassigned: 0, sla_warning: 0, breached: 0, resolved_today: 0 };
const PAGE_SIZE = 20;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export default function AdminHelpdesk() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const requestSequence = useRef(0);
  const commentSequence = useRef(0);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [assignees, setAssignees] = useState([]);
  const [knownIssues, setKnownIssues] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [category, setCategory] = useState("Lift / Elevator");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Block A, Tower 1");
  const [priority, setPriority] = useState("Normal");
  const [attachment, setAttachment] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [workOrderNotes, setWorkOrderNotes] = useState("");
  const [actionType, setActionType] = useState("Assign to Staff / Vendor");
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");

  const load = async (searchValue = search, statusValue = statusFilter, pageValue = page) => {
    const requestId = ++requestSequence.current;
    setLoading(true); setError("");
    try {
      const params = { page: pageValue, page_size: PAGE_SIZE, sort_by: "updated_at", sort_order: "desc" };
      if (searchValue.trim()) params.search = searchValue.trim();
      if (statusValue) params.status = statusValue;
      const [complaintsResult, metricsResult, assigneesResult, issuesResult] = await Promise.allSettled([
        listComplaints(params), getStats(), listAssignees(), listKnownIssues(),
      ]);
      if (complaintsResult.status === "rejected") throw complaintsResult.reason;
      if (requestId !== requestSequence.current) return;
      const complaints = complaintsResult.value.data;
      setTickets(complaints.items); setTotal(complaints.total);
      setStats(metricsResult.status === "fulfilled" ? metricsResult.value.data : EMPTY_STATS);
      setAssignees(assigneesResult.status === "fulfilled" ? assigneesResult.value.data : []);
      setKnownIssues(issuesResult.status === "fulfilled" ? issuesResult.value.data : []);
      if ([metricsResult, assigneesResult, issuesResult].some((result) => result.status === "rejected")) {
        setError("Tickets loaded, but some supporting Helpdesk data is temporarily unavailable.");
      }
    } catch (requestError) {
      if (requestId === requestSequence.current) setError(errorMessage(requestError, "Unable to load Helpdesk operations."));
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    requestSequence.current += 1;
    const timer = setTimeout(() => load(search, statusFilter, page), 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { requestSequence.current += 1; commentSequence.current += 1; }, []);
  useRealtimeRefresh(["helpdesk"], () => load(search, statusFilter, page));
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);

  const openResolve = async (ticket) => {
    const requestId = ++commentSequence.current;
    setSelectedTicket(ticket); setAssignee(ticket.assigned_to || ""); setWorkOrderNotes(ticket.work_order_notes || ""); setAdminNote(""); setActionType("Assign to Staff / Vendor");
    setComments([]); setCommentsError(""); setCommentsLoading(true); setActionError(""); setShowResolveModal(true);
    try {
      const { data } = await listComments(ticket.id);
      if (requestId === commentSequence.current) setComments(data);
    } catch {
      if (requestId === commentSequence.current) setCommentsError("Unable to load ticket comments.");
    } finally {
      if (requestId === commentSequence.current) setCommentsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedTicket || saving) return; setSaving(true); setActionError("");
    try {
      if (actionType === "Escalate to Committee") {
        await escalateComplaint(selectedTicket.id, { expected_version: selectedTicket.version, note: adminNote || undefined });
      } else {
        const payload = { expected_version: selectedTicket.version, internal_note: adminNote.trim() || undefined };
        if (actionType === "Mark as Resolved") {
          payload.status = "Resolved";
          payload.status_note = adminNote.trim() || undefined;
        }
        if (actionType === "Assign to Staff / Vendor") {
          payload.assigned_to = Number(assignee);
          payload.work_order_notes = workOrderNotes.trim() || undefined;
        }
        await updateComplaint(selectedTicket.id, payload);
      }
      commentSequence.current += 1; setShowResolveModal(false); setToast("Ticket updated successfully."); await load(search, statusFilter, page);
    } catch (requestError) { setActionError(errorMessage(requestError, "Unable to update the ticket.")); }
    finally { setSaving(false); }
  };

  const handleRaise = async () => {
    if (!description.trim()) return setCreateError("Description is required.");
    if (attachment && !ALLOWED_ATTACHMENT_TYPES.has(attachment.type)) return setCreateError("Attachment must be a JPEG, PNG, WebP, or PDF file.");
    if (attachment && attachment.size > MAX_ATTACHMENT_BYTES) return setCreateError("Attachment must not exceed 5 MB.");
    setSaving(true); setCreateError("");
    try {
      const { data } = await createComplaint({ title: category, category, description: description.trim(), location: location.trim() || undefined, priority });
      let attachmentFailed = false;
      if (attachment) {
        try { await uploadAttachment(data.id, attachment); }
        catch { attachmentFailed = true; }
      }
      setShowModal(false); setDescription(""); setAttachment(null); setCreateError("");
      setToast(attachmentFailed ? `Ticket #${data.id} was created, but its attachment could not be uploaded.` : "Ticket raised successfully.");
      if (page === 1) await load(search, statusFilter, 1); else setPage(1);
    } catch (requestError) { setCreateError(errorMessage(requestError, "Unable to raise the ticket.")); }
    finally { setSaving(false); }
  };

  const breachedTicket = tickets.find((ticket) => ["Open", "In Progress"].includes(ticket.status) && ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date());
  const duplicate = knownIssues.find((issue) => issue.category === category && (!location || issue.location?.toLowerCase() === location.toLowerCase()));
  const userName = user ? `${user.first_name} ${user.last_name}` : "Admin";
  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const visibleSidebarItems = sidebarItems.filter((item) => item.href !== "/admin/users" || isSuperAdmin);
  const roleLabel = isSuperAdmin ? "Super Admin" : userRoles.includes("admin") ? "Residential Admin" : "Committee Member";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <DashboardLayout sidebarItems={visibleSidebarItems} userRole={roleLabel} userName={userName}>
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 relative">
      {toast && <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex gap-3 z-50"><CheckCircle2 className="text-emerald-400" size={20}/><span className="text-sm font-bold">{toast}</span><button onClick={() => setToast("")}><X size={16}/></button></div>}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2336]">Support Desk</h1><div className="flex gap-3"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search tickets..." aria-label="Search tickets" className="w-64 h-11 pl-10 pr-4 rounded-xl border bg-white"/></div><button onClick={() => { setStatusFilter((value) => value ? "" : "Open"); setPage(1); }} title="Toggle open-only filter" aria-label="Toggle open-only filter" aria-pressed={Boolean(statusFilter)} className={`h-11 w-11 flex items-center justify-center border rounded-xl ${statusFilter ? "bg-[#0f2336] text-white" : "bg-white"}`}><Filter size={18}/></button><button onClick={() => { setCreateError(""); setShowModal(true); }} className="h-11 px-6 bg-[#0f2336] text-white text-sm font-bold rounded-xl flex gap-2 items-center"><Plus size={18}/>Raise Ticket</button></div></div>
      {error && <div role="alert" className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Metric icon={Wrench} label="Active" value={stats.active} detail={`${stats.unassigned} unassigned`} />
        <Metric icon={Clock} label="Warning" value={stats.sla_warning} detail="Approaching SLA" orange />
        <Metric icon={AlertTriangle} label="Breached" value={stats.breached} detail="Requires intervention" dark />
        <Metric icon={CheckCircle2} label="Resolved" value={stats.resolved_today} detail="Today's completion" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8"><div className="xl:col-span-8"><h3 className="text-xl font-bold text-[#0f2336] mb-6">Current Pipeline</h3>{loading && <p role="status" className="text-sm text-gray-500">Loading pipeline…</p>}{!loading && tickets.length === 0 && <div className="bg-white rounded-3xl p-8 text-gray-500">No tickets match the current filter.</div>}<div className="grid sm:grid-cols-2 gap-5">{tickets.map((ticket) => <div key={ticket.id} className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between"><div><div className="flex justify-between mb-5"><span className="text-xs font-bold uppercase flex gap-2"><Droplet size={14}/>{ticket.category}</span><span className="text-[10px] font-bold text-gray-500">#{ticket.id}</span></div><h4 className="font-extrabold text-lg text-[#0f2336] mb-2">{ticket.title || ticket.category}</h4><p className="text-sm text-gray-500 line-clamp-2">{ticket.description}</p></div><div className="mt-6 pt-5 border-t flex justify-between"><span className="text-xs text-gray-500">{ticket.location || "N/A"} • {ticket.priority} • {ticket.status}</span><button aria-label={`Update ticket ${ticket.id}`} onClick={() => openResolve(ticket)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><ArrowRight size={14}/></button></div></div>)}</div>{!loading && total > 0 && <div className="mt-6 flex items-center justify-between"><span className="text-sm text-gray-500">{total} ticket(s)</span><div className="flex items-center gap-2"><button aria-label="Previous ticket page" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft size={16}/></button><span className="text-sm">Page {page} of {pages}</span><button aria-label="Next ticket page" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight size={16}/></button></div></div>}</div>
        <div className="xl:col-span-4"><h3 className="text-xl font-bold text-[#0f2336] mb-6">Escalation Center</h3><div className="bg-[#0f1520] rounded-[2rem] p-8 text-white min-h-80">{breachedTicket ? <><div className="flex gap-3 mb-8"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"/><h4 className="font-bold uppercase text-sm">Active Breach</h4></div><div className="text-xs font-mono text-gray-400">#TK-{breachedTicket.id}</div><h3 className="text-2xl font-extrabold my-3">{breachedTicket.title || breachedTicket.category}</h3><p className="text-sm text-gray-400">{breachedTicket.description}</p><p className="text-sm text-red-300 mt-6">SLA deadline: {new Date(breachedTicket.sla_deadline).toLocaleString()}</p><button onClick={() => openResolve(breachedTicket)} className="w-full mt-8 py-4 bg-white text-[#0f1520] font-extrabold rounded-2xl">TAKE ACTION</button></> : <div className="h-full flex flex-col items-center justify-center text-center text-gray-400"><CheckCircle2 size={32} className="text-emerald-400 mb-3"/><p>No active SLA breaches.</p></div>}</div></div>
      </div>

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1a2b]/80" role="dialog" aria-modal="true" aria-labelledby="raise-ticket-title"><div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden"><div className="px-8 py-6 flex justify-between"><h2 id="raise-ticket-title" className="text-2xl font-extrabold text-[#0f2336]">Raise Ticket</h2><button aria-label="Close raise ticket form" disabled={saving} onClick={() => setShowModal(false)}><X size={20}/></button></div><div className="px-8 pb-8 space-y-6">{createError && <p role="alert" className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{createError}</p>}{duplicate && <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5"><h4 className="font-bold text-orange-900">Potential Duplicate Detected</h4><p className="text-sm text-orange-800">{duplicate.title} at {duplicate.location || "common area"} is already open.</p></div>}<div className="grid md:grid-cols-2 gap-6"><select aria-label="Ticket category" disabled={saving} value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 px-4 rounded-xl border bg-gray-50"><option>Lift / Elevator</option><option>Plumbing</option><option>Electrical</option><option>Carpentry</option><option>Other</option></select><textarea aria-label="Ticket description" disabled={saving} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Provide details" className="h-28 p-4 rounded-xl border bg-gray-50"/><input aria-label="Ticket location" disabled={saving} value={location} onChange={(event) => setLocation(event.target.value)} className="h-12 px-4 rounded-xl border bg-gray-50"/><select aria-label="Ticket priority" disabled={saving} value={priority} onChange={(event) => setPriority(event.target.value)} className="h-12 px-4 rounded-xl border bg-gray-50"><option>Normal</option><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="hidden"/><button type="button" disabled={saving} onClick={() => fileRef.current?.click()} className="h-20 border-2 border-dashed rounded-xl text-gray-500 flex gap-2 items-center justify-center"><UploadCloud size={20}/>{attachment?.name || "Upload Photo"}</button></div></div><div className="p-6 border-t bg-gray-50 flex justify-end gap-3"><button disabled={saving} onClick={() => setShowModal(false)} className="px-6 py-3 font-bold">Cancel</button><button disabled={saving} onClick={handleRaise} className="px-8 py-3 font-bold text-white bg-[#0f2336] rounded-xl">{saving ? "Submitting…" : "Submit Ticket"}</button></div></div></div>}

      {showResolveModal && selectedTicket && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1a2b]/80" role="dialog" aria-modal="true" aria-labelledby="update-ticket-title"><div className="bg-white rounded-[2rem] w-full max-w-md p-8 max-h-[85vh] overflow-y-auto relative"><button aria-label="Close update ticket form" disabled={saving} onClick={() => { commentSequence.current += 1; setShowResolveModal(false); }} className="absolute top-6 right-6"><X size={20}/></button><h2 id="update-ticket-title" className="text-2xl font-extrabold text-[#0f2336] mb-6">Update Ticket TK-{selectedTicket.id}</h2><div className="space-y-4">{actionError && <p role="alert" className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{actionError}</p>}<select aria-label="Ticket action" disabled={saving} value={actionType} onChange={(event) => setActionType(event.target.value)} className="w-full h-12 px-4 rounded-xl border bg-gray-50"><option>Assign to Staff / Vendor</option><option>Mark as Resolved</option><option>Escalate to Committee</option></select>{actionType === "Assign to Staff / Vendor" && <><select aria-label="Ticket assignee" disabled={saving} value={assignee} onChange={(event) => setAssignee(event.target.value)} className="w-full h-12 px-4 rounded-xl border bg-gray-50"><option value="">Select assignee</option>{assignees.map((item) => <option key={item.user_id} value={item.user_id}>{item.name} ({item.staff_type || "Support"}) {item.on_duty ? "• On duty" : "• Off duty"}</option>)}</select><textarea aria-label="Work order notes" disabled={saving} value={workOrderNotes} onChange={(event) => setWorkOrderNotes(event.target.value)} placeholder="One required step per line" className="w-full h-24 p-4 rounded-xl border bg-gray-50"/></>}<textarea aria-label="Internal admin note" disabled={saving} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Internal admin note" className="w-full h-20 p-4 rounded-xl border bg-gray-50"/>{commentsLoading && <p role="status" className="text-sm text-gray-500">Loading comments…</p>}{commentsError && <p className="text-sm text-red-600">{commentsError}</p>}{!commentsLoading && !commentsError && comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}{comments.length > 0 && <div className="max-h-32 overflow-y-auto space-y-2">{comments.map((item) => <div key={item.id} className="p-3 bg-gray-50 rounded-xl text-sm"><strong>{item.author_name}</strong><p>{item.body}</p></div>)}</div>}<button disabled={saving || (actionType === "Assign to Staff / Vendor" && !assignee)} onClick={handleAction} className="w-full py-4 bg-[#0f2336] disabled:opacity-50 text-white font-bold rounded-xl">{saving ? "Saving…" : "Confirm Action"}</button></div></div></div>}
    </div>
  </DashboardLayout>;
}

function Metric({ icon: Icon, label, value, detail, orange = false, dark = false }) {
  return <div className={`${dark ? "bg-[#1a1a24] text-white" : "bg-white/80"} p-6 rounded-3xl border shadow-sm`}><div className="flex justify-between mb-4"><Icon size={20} className={orange ? "text-orange-500" : dark ? "text-red-400" : "text-blue-600"}/><span className="text-xs font-bold uppercase text-gray-400">{label}</span></div><div className={`text-4xl font-extrabold ${orange ? "text-orange-600" : ""}`}>{value}</div><div className="text-xs text-gray-500 font-semibold mt-2">{detail}</div></div>;
}
