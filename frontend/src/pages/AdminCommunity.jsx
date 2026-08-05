import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, WalletCards, Headset, ShieldCheck, CalendarCheck, Users, BarChart3, Search, MessageSquare, Megaphone, Heart, Plus, CheckCircle2, X, UserCog } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { communityError, createNotice, listDirectory, listDiscussions } from "@/features/community/api";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" }, { label: "Finance", icon: WalletCards, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, href: "/admin/helpdesk" }, { label: "Security", icon: ShieldCheck, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, href: "/admin/amenities" }, { label: "Community", icon: Users, active: true, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" }, { label: "User Roles", icon: UserCog, href: "/admin/users" },
];
const EMPTY_NOTICE = { title: "", body: "", target_type: "all", target_value: "" };

export default function AdminCommunity() {
  const { user } = useAuth(); const navigate = useNavigate(); const requestId = useRef(0);
  const [discussions, setDiscussions] = useState([]); const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState(""); const [notice, setNotice] = useState(EMPTY_NOTICE);
  const [showNotice, setShowNotice] = useState(false); const [showForums, setShowForums] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null); const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [toast, setToast] = useState("");

  const load = async (query = search) => {
    const current = ++requestId.current; setLoading(true); setError("");
    try { const [{ data: forumData }, { data: directoryData }] = await Promise.all([listDiscussions(), listDirectory(query)]); if (current !== requestId.current) return; setDiscussions(forumData.items); setResidents(directoryData.items); }
    catch (requestError) { if (current === requestId.current) setError(communityError(requestError, "Unable to load Community administration.")); }
    finally { if (current === requestId.current) setLoading(false); }
  };
  useEffect(() => { const timer = setTimeout(() => load(search), 250); return () => clearTimeout(timer); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);

  const broadcast = async (event) => {
    event.preventDefault(); if (saving) return; setSaving(true); setError("");
    try { await createNotice({ ...notice, target_value: notice.target_type === "all" ? null : notice.target_value }); setNotice(EMPTY_NOTICE); setShowNotice(false); setToast("Notice broadcasted to the selected residents."); }
    catch (requestError) { setError(communityError(requestError, "Unable to broadcast notice.")); }
    finally { setSaving(false); }
  };
  const userName = user ? `${user.first_name} ${user.last_name}` : "Admin";

  return <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin" userName={userName}>
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
      {toast && <div className="fixed bottom-6 right-6 bg-[#d87943] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"><CheckCircle2 size={20}/><span className="font-bold text-sm">{toast}</span><button onClick={() => setToast("")}><X size={16}/></button></div>}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold text-[#0f2336]">Community Hub</h1><p className="text-sm text-gray-500 mt-1">Manage resident directory, notices, and community forums.</p></div><div className="flex gap-3"><button onClick={() => setShowNotice(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border rounded-xl text-sm font-semibold"><Megaphone size={16}/>Broadcast Notice</button><button onClick={() => navigate("/admin/users")} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d87943] text-white rounded-xl text-sm font-semibold"><Plus size={16}/>Add Resident</button></div></div>
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-5"><div className="bg-white rounded-3xl border shadow-sm p-6"><h3 className="text-xl font-bold text-[#0f2336] flex gap-2 mb-6"><MessageSquare className="text-[#d87943]" size={20}/>Active Discussions</h3>{loading && <p className="text-sm text-gray-500">Loading discussions…</p>}{!loading && discussions.length === 0 && <p className="text-sm text-gray-500">No active discussions.</p>}<div className="space-y-4">{discussions.slice(0, showForums ? discussions.length : 3).map((post) => <button key={post.id} onClick={() => setSelectedDiscussion(post)} className="w-full text-left p-4 rounded-2xl bg-gray-50/50 border hover:bg-gray-50"><div className="flex justify-between mb-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-600">{post.tag}</span><span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleString()}</span></div><h4 className="font-bold text-[#0f2336]">{post.title}</h4><p className="text-xs text-gray-500 mb-4">By {post.author}{post.author_flat ? ` (${post.author_flat})` : ""}</p><div className="flex gap-4 text-gray-400 text-xs"><span className="flex gap-1"><MessageSquare size={14}/>{post.reply_count}</span><span className="flex gap-1"><Heart size={14}/>{post.like_count}</span></div></button>)}</div>{discussions.length > 3 && <button onClick={() => setShowForums((value) => !value)} className="w-full mt-6 py-3 border border-dashed rounded-xl text-sm font-bold text-gray-500">{showForums ? "Show Less" : "View All Forums"}</button>}</div></div>
        <div className="xl:col-span-7"><div className="bg-white rounded-3xl border shadow-sm overflow-hidden"><div className="p-6 md:p-8 border-b flex flex-col sm:flex-row justify-between gap-4"><h3 className="text-xl font-bold text-[#0f2336]">Resident Directory</h3><div className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search residents or units..." className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border bg-gray-50 text-sm"/></div></div>{loading && <p className="p-8 text-sm text-gray-500">Loading residents…</p>}{!loading && residents.length === 0 && <p className="p-8 text-sm text-gray-500">No residents match the search.</p>}<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-[11px] text-gray-400 uppercase"><tr><th className="px-6 py-3">Resident</th><th className="px-6 py-3">Unit</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{residents.map((resident) => <tr key={resident.user_id}><td className="px-6 py-4"><div className="font-bold text-[#0f2336]">{resident.name}</div><div className="text-[10px] text-gray-400">Joined {new Date(resident.joined_at).toLocaleDateString()}</div></td><td className="px-6 py-4"><span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold">{resident.unit || "N/A"}</span></td><td className="px-6 py-4 text-gray-500">{resident.role}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${resident.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>{resident.status}</span></td></tr>)}</tbody></table></div></div></div>
      </div>
      {showNotice && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={broadcast} className="bg-white rounded-3xl p-8 w-full max-w-lg relative"><button type="button" onClick={() => setShowNotice(false)} className="absolute right-6 top-6"><X size={20}/></button><h2 className="text-2xl font-extrabold text-[#0f2336] mb-6">Broadcast Notice</h2><div className="space-y-4"><input required maxLength={255} value={notice.title} onChange={(event) => setNotice({...notice, title: event.target.value})} placeholder="Notice title" className="w-full h-12 px-4 border rounded-xl"/><textarea required maxLength={10000} value={notice.body} onChange={(event) => setNotice({...notice, body: event.target.value})} placeholder="Notice message" className="w-full h-32 p-4 border rounded-xl"/><select value={notice.target_type} onChange={(event) => setNotice({...notice, target_type: event.target.value, target_value: ""})} className="w-full h-12 px-4 border rounded-xl"><option value="all">All Blocks</option><option value="block">Specific Block</option><option value="flat">Specific Flat</option></select>{notice.target_type !== "all" && <input required value={notice.target_value} onChange={(event) => setNotice({...notice, target_value: event.target.value})} placeholder={notice.target_type === "block" ? "Block, e.g. A" : "Flat, e.g. A-101"} className="w-full h-12 px-4 border rounded-xl"/>}<button disabled={saving} className="w-full py-3 bg-[#d87943] text-white font-bold rounded-xl">{saving ? "Broadcasting…" : "Broadcast Notice"}</button></div></form></div>}
      {selectedDiscussion && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-8 w-full max-w-lg relative"><button onClick={() => setSelectedDiscussion(null)} className="absolute right-6 top-6"><X size={20}/></button><span className="text-xs font-bold text-orange-600 uppercase">{selectedDiscussion.tag}</span><h2 className="text-2xl font-extrabold text-[#0f2336] mt-2">{selectedDiscussion.title}</h2><p className="text-sm text-gray-500 mt-1">By {selectedDiscussion.author}</p><p className="text-gray-700 mt-5">{selectedDiscussion.body}</p></div></div>}
    </div>
  </DashboardLayout>;
}
