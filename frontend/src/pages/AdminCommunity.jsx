import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutDashboard, WalletCards, Headset, ShieldCheck, CalendarCheck, Users, BarChart3, Search, MessageSquare, Megaphone, Heart, Plus, CheckCircle2, X, UserCog } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { useAuth } from "@/hooks/useAuth";
import { communityError, createNotice, createPoll, listDirectory, listDiscussions } from "@/features/community/api";

const baseSidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" }, { label: "Finance", icon: WalletCards, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, href: "/admin/helpdesk" }, { label: "Security", icon: ShieldCheck, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, href: "/admin/amenities" }, { label: "Community", icon: Users, active: true, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
];
const EMPTY_NOTICE = { title: "", body: "", target_type: "all", target_value: "" };
const EMPTY_POLL = { question: "", description: "", ends_at: "", options: ["", ""] };
const PAGE_SIZE = 10;

export default function AdminCommunity() {
  const { user } = useAuth();
  const discussionRequest = useRef(0); const directoryRequest = useRef(0); const savingRef = useRef(false);
  const [discussions, setDiscussions] = useState([]); const [discussionTotal, setDiscussionTotal] = useState(0); const [discussionPage, setDiscussionPage] = useState(1); const [discussionLoading, setDiscussionLoading] = useState(true); const [discussionError, setDiscussionError] = useState("");
  const [residents, setResidents] = useState([]); const [directoryTotal, setDirectoryTotal] = useState(0); const [directoryPage, setDirectoryPage] = useState(1); const [directoryLoading, setDirectoryLoading] = useState(true); const [directoryError, setDirectoryError] = useState("");
  const [search, setSearch] = useState(""); const [notice, setNotice] = useState(EMPTY_NOTICE); const [showNotice, setShowNotice] = useState(false); const [pollForm, setPollForm] = useState(EMPTY_POLL); const [showPoll, setShowPoll] = useState(false); const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [saving, setSaving] = useState(false); const [noticeError, setNoticeError] = useState(""); const [pollError, setPollError] = useState(""); const [toast, setToast] = useState("");

  const loadDiscussions = useCallback(async () => {
    const current = ++discussionRequest.current; setDiscussionLoading(true); setDiscussionError("");
    try {
      const { data } = await listDiscussions({ page: discussionPage, page_size: PAGE_SIZE });
      if (current !== discussionRequest.current) return;
      setDiscussions(data.items); setDiscussionTotal(data.total);
      if (discussionPage > 1 && data.items.length === 0 && data.total > 0) setDiscussionPage(Math.ceil(data.total / PAGE_SIZE));
      setSelectedDiscussion((selected) => selected ? data.items.find((item) => item.id === selected.id) || null : null);
    } catch (requestError) {
      if (current === discussionRequest.current) setDiscussionError(communityError(requestError, "Unable to load discussions."));
    } finally { if (current === discussionRequest.current) setDiscussionLoading(false); }
  }, [discussionPage]);

  const loadDirectory = useCallback(async (query = search) => {
    const current = ++directoryRequest.current; setDirectoryLoading(true); setDirectoryError("");
    try {
      const { data } = await listDirectory({ search: query, page: directoryPage, page_size: PAGE_SIZE });
      if (current !== directoryRequest.current) return;
      setResidents(data.items); setDirectoryTotal(data.total);
      if (directoryPage > 1 && data.items.length === 0 && data.total > 0) setDirectoryPage(Math.ceil(data.total / PAGE_SIZE));
    } catch (requestError) {
      if (current === directoryRequest.current) setDirectoryError(communityError(requestError, "Unable to load resident directory."));
    } finally { if (current === directoryRequest.current) setDirectoryLoading(false); }
  }, [directoryPage, search]);

  useEffect(() => { loadDiscussions(); }, [loadDiscussions]);
  useEffect(() => { const timer = setTimeout(() => loadDirectory(search), 250); return () => clearTimeout(timer); }, [search, loadDirectory]);
  useEffect(() => () => { discussionRequest.current += 1; directoryRequest.current += 1; }, []);
  useRealtimeRefresh(["community"], () => Promise.allSettled([loadDiscussions(), loadDirectory(search)]));
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);

  const broadcast = async (event) => {
    event.preventDefault(); if (savingRef.current) return; savingRef.current = true; setSaving(true); setNoticeError("");
    try {
      await createNotice({ ...notice, target_value: notice.target_type === "all" ? null : notice.target_value });
      setNotice(EMPTY_NOTICE); setShowNotice(false); setToast("Notice broadcasted to the selected residents.");
    } catch (requestError) { setNoticeError(communityError(requestError, "Unable to broadcast notice.")); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const publishPoll = async (event) => {
    event.preventDefault(); if (savingRef.current) return; savingRef.current = true; setSaving(true); setPollError("");
    try {
      await createPoll({ ...pollForm, ends_at: new Date(pollForm.ends_at).toISOString(), options: pollForm.options.filter((option) => option.trim()) });
      setPollForm(EMPTY_POLL); setShowPoll(false); setToast("Poll published for residents.");
    } catch (requestError) { setPollError(communityError(requestError, "Unable to publish poll.")); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const userRoles = (user?.roles || []).map((role) => typeof role === "string" ? role : role.role_name || role.name).filter(Boolean);
  const isSuperAdmin = userRoles.includes("super_admin");
  const sidebarItems = isSuperAdmin ? [...baseSidebarItems, { label: "User Roles", icon: UserCog, href: "/admin/users" }] : baseSidebarItems;
  const userRole = isSuperAdmin ? "Super Admin" : userRoles.includes("committee_member") ? "Committee Member" : "Residential Admin";
  const userName = user ? `${user.first_name} ${user.last_name}` : "Admin";
  const discussionPages = Math.max(1, Math.ceil(discussionTotal / PAGE_SIZE));
  const directoryPages = Math.max(1, Math.ceil(directoryTotal / PAGE_SIZE));

  return <DashboardLayout sidebarItems={sidebarItems} userRole={userRole} userName={userName}>
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
      {toast && <div className="fixed bottom-6 right-6 bg-[#d87943] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"><CheckCircle2 size={20}/><span className="font-bold text-sm">{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={16}/></button></div>}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><h1 className="text-3xl font-extrabold text-[#0f2336]">Community Hub</h1><div className="flex gap-3"><button onClick={() => { setNoticeError(""); setShowNotice(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border rounded-xl text-sm font-semibold"><Megaphone size={16}/>Broadcast Notice</button><button onClick={() => { setPollError(""); setShowPoll(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d87943] text-white rounded-xl text-sm font-semibold"><Plus size={16}/>Create Poll</button></div></div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5"><div className="bg-white rounded-3xl border shadow-sm p-6"><h3 className="text-xl font-bold text-[#0f2336] flex gap-2 mb-6"><MessageSquare className="text-[#d87943]" size={20}/>Active Discussions</h3>{discussionLoading ? <p className="text-sm text-gray-500">Loading discussions…</p> : discussionError ? <div role="alert" className="text-sm text-red-600"><p>{discussionError}</p><button onClick={loadDiscussions} className="font-bold mt-2">Retry discussions</button></div> : discussions.length === 0 ? <p className="text-sm text-gray-500">No active discussions.</p> : <div className="space-y-4">{discussions.map((post) => <button key={post.id} onClick={() => setSelectedDiscussion(post)} className="w-full text-left p-4 rounded-2xl bg-gray-50/50 border hover:bg-gray-50"><div className="flex justify-between mb-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-600">{post.tag}</span><span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span></div><h4 className="font-bold text-[#0f2336]">{post.title}</h4><p className="text-xs text-gray-500 mb-4">By {post.author}{post.author_flat ? ` (${post.author_flat})` : ""}</p><div className="flex gap-4 text-gray-400 text-xs"><span className="flex gap-1"><MessageSquare size={14}/>{post.reply_count}</span><span className="flex gap-1"><Heart size={14}/>{post.like_count}</span></div></button>)}</div>}{!discussionLoading && !discussionError && discussionTotal > PAGE_SIZE && <div className="flex items-center justify-between mt-6"><button disabled={discussionPage === 1} onClick={() => setDiscussionPage((page) => page - 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Previous</button><span className="text-xs text-gray-500">Page {discussionPage} of {discussionPages}</span><button disabled={discussionPage >= discussionPages} onClick={() => setDiscussionPage((page) => page + 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Next discussions</button></div>}</div></div>
        <div className="xl:col-span-7"><div className="bg-white rounded-3xl border shadow-sm overflow-hidden"><div className="p-6 md:p-8 border-b flex flex-col sm:flex-row justify-between gap-4"><h3 className="text-xl font-bold text-[#0f2336]">Resident Directory</h3><div className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input aria-label="Search resident directory" value={search} onChange={(event) => { setSearch(event.target.value); setDirectoryPage(1); }} placeholder="Search residents or units..." className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border bg-gray-50 text-sm"/></div></div>{directoryLoading ? <p className="p-8 text-sm text-gray-500">Loading residents…</p> : directoryError ? <div role="alert" className="p-8 text-sm text-red-600"><p>{directoryError}</p><button onClick={() => loadDirectory(search)} className="font-bold mt-2">Retry directory</button></div> : residents.length === 0 ? <p className="p-8 text-sm text-gray-500">No residents match the search.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-[11px] text-gray-400 uppercase"><tr><th className="px-6 py-3">Resident</th><th className="px-6 py-3">Unit</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{residents.map((resident) => <tr key={resident.user_id}><td className="px-6 py-4"><div className="font-bold text-[#0f2336]">{resident.name}</div><div className="text-[10px] text-gray-400">Joined {new Date(resident.joined_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</div></td><td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold">{resident.unit || "N/A"}</span></td><td className="px-6 py-4 text-gray-500">{resident.role}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${resident.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{resident.status}</span></td></tr>)}</tbody></table></div>}{!directoryLoading && !directoryError && directoryTotal > PAGE_SIZE && <div className="flex items-center justify-between p-5 border-t"><button disabled={directoryPage === 1} onClick={() => setDirectoryPage((page) => page - 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Previous residents</button><span className="text-xs text-gray-500">Page {directoryPage} of {directoryPages}</span><button disabled={directoryPage >= directoryPages} onClick={() => setDirectoryPage((page) => page + 1)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Next residents</button></div>}</div></div>
      </div>
      {showNotice && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={broadcast} className="bg-white rounded-3xl p-8 w-full max-w-lg relative"><button type="button" aria-label="Close notice form" disabled={saving} onClick={() => setShowNotice(false)} className="absolute right-6 top-6 disabled:opacity-40"><X size={20}/></button><h2 className="text-2xl font-extrabold text-[#0f2336] mb-6">Broadcast Notice</h2><div className="space-y-4"><label className="sr-only" htmlFor="notice-title">Notice title</label><input id="notice-title" required maxLength={255} value={notice.title} onChange={(event) => setNotice({...notice, title: event.target.value})} placeholder="Notice title" className="w-full h-12 px-4 border rounded-xl"/><label className="sr-only" htmlFor="notice-body">Notice message</label><textarea id="notice-body" required maxLength={10000} value={notice.body} onChange={(event) => setNotice({...notice, body: event.target.value})} placeholder="Notice message" className="w-full h-32 p-4 border rounded-xl"/><label className="sr-only" htmlFor="notice-target">Notice audience</label><select id="notice-target" value={notice.target_type} onChange={(event) => setNotice({...notice, target_type: event.target.value, target_value: ""})} className="w-full h-12 px-4 border rounded-xl"><option value="all">All Blocks</option><option value="block">Specific Block</option><option value="flat">Specific Flat</option></select>{notice.target_type !== "all" && <><label className="sr-only" htmlFor="notice-target-value">Target {notice.target_type}</label><input id="notice-target-value" required value={notice.target_value} onChange={(event) => setNotice({...notice, target_value: event.target.value})} placeholder={notice.target_type === "block" ? "Block, e.g. A" : "Flat, e.g. A-101"} className="w-full h-12 px-4 border rounded-xl"/></>}{noticeError && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{noticeError}</p>}<button disabled={saving} className="w-full py-3 bg-[#d87943] text-white font-bold rounded-xl">{saving ? "Broadcasting…" : "Broadcast Notice"}</button></div></form></div>}
      {showPoll && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={publishPoll} className="bg-white rounded-3xl p-8 w-full max-w-lg relative"><button type="button" aria-label="Close poll form" disabled={saving} onClick={() => setShowPoll(false)} className="absolute right-6 top-6 disabled:opacity-40"><X size={20}/></button><h2 className="text-2xl font-extrabold text-[#0f2336] mb-6">Create Poll</h2><div className="space-y-4"><label className="sr-only" htmlFor="poll-question">Poll question</label><input id="poll-question" required maxLength={500} value={pollForm.question} onChange={(event) => setPollForm({...pollForm, question: event.target.value})} placeholder="Poll question" className="w-full h-12 px-4 border rounded-xl"/><label className="sr-only" htmlFor="poll-description">Poll description</label><textarea id="poll-description" maxLength={10000} value={pollForm.description} onChange={(event) => setPollForm({...pollForm, description: event.target.value})} placeholder="Description (optional)" className="w-full h-24 p-4 border rounded-xl"/><label htmlFor="poll-ends-at" className="text-sm font-semibold text-[#0f2336]">Closes at</label><input id="poll-ends-at" required type="datetime-local" value={pollForm.ends_at} onChange={(event) => setPollForm({...pollForm, ends_at: event.target.value})} className="w-full h-12 px-4 border rounded-xl"/>{pollForm.options.map((option, index) => <div key={index} className="flex gap-2"><input required aria-label={`Poll option ${index + 1}`} maxLength={255} value={option} onChange={(event) => setPollForm({...pollForm, options: pollForm.options.map((item, optionIndex) => optionIndex === index ? event.target.value : item)})} placeholder={`Option ${index + 1}`} className="flex-1 h-12 px-4 border rounded-xl"/>{pollForm.options.length > 2 && <button type="button" aria-label={`Remove option ${index + 1}`} onClick={() => setPollForm({...pollForm, options: pollForm.options.filter((_item, optionIndex) => optionIndex !== index)})} className="px-3 border rounded-xl text-gray-500">Remove</button>}</div>)}{pollForm.options.length < 10 && <button type="button" onClick={() => setPollForm({...pollForm, options: [...pollForm.options, ""]})} className="text-sm font-bold text-[#d87943]">Add option</button>}{pollError && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl">{pollError}</p>}<button disabled={saving} className="w-full py-3 bg-[#d87943] text-white font-bold rounded-xl">{saving ? "Publishing…" : "Publish Poll"}</button></div></form></div>}
      {selectedDiscussion && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-lg relative"><button aria-label="Close discussion" onClick={() => setSelectedDiscussion(null)} className="absolute right-6 top-6"><X size={20}/></button><span className="text-xs font-bold text-orange-600 uppercase">{selectedDiscussion.tag}</span><h2 className="text-2xl font-extrabold text-[#0f2336] mt-2">{selectedDiscussion.title}</h2><p className="text-sm text-gray-500 mt-1">By {selectedDiscussion.author}</p><p className="text-gray-700 mt-5">{selectedDiscussion.body}</p></div></div>}
    </div>
  </DashboardLayout>;
}
