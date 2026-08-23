import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  addComment,
  analyzeIssue,
  createComplaint,
  downloadAttachment,
  errorMessage,
  getComplaint,
  listAttachments,
  listComments,
  listComplaints,
  listKnownIssues,
  listStatusHistory,
  subscribeKnownIssue,
  uploadAttachment,
} from "@/features/helpdesk/api";
import { Bot, User, Send, Paperclip, AlertTriangle, MapPin, KeyRound, Calendar, Volume2, FileQuestion, Plus, X, CheckCircle2 } from "lucide-react";

const statusColor = (status) => ({
  Open: "bg-emerald-100 text-emerald-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Resolved: "bg-gray-100 text-gray-700",
  Closed: "bg-gray-100 text-gray-500",
}[status] || "bg-gray-100 text-gray-700");

const INITIAL_FORM = { title: "", description: "", category: "Maintenance", priority: "Medium" };

export default function ResidentHelpdesk() {
  const location = useLocation();
  const { user } = useAuth();
  const createFileRef = useRef(null);
  const deepLinkHandled = useRef(false);
  const assistantSendingRef = useRef(false);
  const chatEndRef = useRef(null);
  const [tickets, setTickets] = useState([]);
  const [knownIssues, setKnownIssues] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(location.state?.action === "new");
  const [form, setForm] = useState(INITIAL_FORM);
  const [attachment, setAttachment] = useState(null);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState({ comments: [], history: [], attachments: [] });
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([{ role: "bot", text: "Hello! Describe an issue and I’ll check for compatible known issues." }]);
  const [assistantIssue, setAssistantIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistantSending, setAssistantSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [{ data: complaintData }, { data: issueData }] = await Promise.all([
        listComplaints({ page_size: 100, sort_by: "updated_at", sort_order: "desc" }),
        listKnownIssues(),
      ]);
      setTickets(complaintData.items);
      setKnownIssues(issueData);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load Helpdesk data."));
    } finally { setLoading(false); }
  };

  useEffect(() => { void Promise.resolve().then(load); }, []);
  useRealtimeRefresh(["helpdesk"], load);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [chat, assistantSending]);

  const openDetails = async (ticket) => {
    setError("");
    try {
      const [{ data: complaintData }, { data: comments }, { data: history }, { data: files }] = await Promise.all([
        getComplaint(ticket.id), listComments(ticket.id), listStatusHistory(ticket.id), listAttachments(ticket.id),
      ]);
      setSelected(complaintData);
      setDetails({ comments, history, attachments: files });
    } catch (requestError) { setError(errorMessage(requestError, "Unable to load ticket details.")); }
  };

  useEffect(() => {
    if (deepLinkHandled.current || !location.state?.ticketId || tickets.length === 0) return;
    const target = tickets.find((ticket) => ticket.id === Number(location.state.ticketId));
    if (!target) return;
    deepLinkHandled.current = true;
    // Resolve the dashboard deep link after its ticket is present in the API result.

    void openDetails(target);
  }, [location.state?.ticketId, tickets]);

  const submitTicket = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const { data } = await createComplaint({ ...form, description: form.description || form.title });
      if (attachment) await uploadAttachment(data.id, attachment);
      setForm(INITIAL_FORM); setAttachment(null); setShowModal(false);
      setToast("Ticket created successfully."); await load();
    } catch (requestError) { setError(errorMessage(requestError, "Unable to create the ticket.")); }
    finally { setSaving(false); }
  };

  const sendAssistantMessage = async () => {
    const text = message.trim();
    if (!text || assistantSendingRef.current) return;
    const history = chat.slice(-10).map((item) => ({
      role: item.role === "bot" ? "assistant" : "user",
      content: item.text,
    }));
    assistantSendingRef.current = true;
    setChat((items) => [...items, { role: "user", text }]);
    setMessage(""); setAssistantSending(true); setError("");
    try {
      const { data } = await analyzeIssue(text, history);
      setChat((items) => [...items, { role: "bot", text: data.message }]);
      setAssistantIssue(data.known_issue);
      if (data.suggested_category !== "Other") {
        setForm((current) => ({ ...current, title: text.slice(0, 255), description: text, category: data.suggested_category }));
      }
    } catch (requestError) {
      const assistantError = errorMessage(requestError, "The assistant is temporarily unavailable. Please retry or create a ticket.");
      setError(assistantError);
      setMessage(text);
    } finally {
      assistantSendingRef.current = false;
      setAssistantSending(false);
    }
  };

  const subscribe = async (issue) => {
    try {
      const { data } = await subscribeKnownIssue(issue.complaint_id);
      setKnownIssues((items) => items.map((item) => item.complaint_id === data.complaint_id ? data : item));
      if (assistantIssue?.complaint_id === data.complaint_id) setAssistantIssue(data);
      setToast("Subscribed to known-issue updates.");
    } catch (requestError) { setError(errorMessage(requestError, "Unable to subscribe.")); }
  };

  const submitComment = async () => {
    if (!comment.trim() || !selected) return;
    try {
      await addComment(selected.id, comment.trim()); setComment(""); await openDetails(selected);
    } catch (requestError) { setError(errorMessage(requestError, "Unable to add comment.")); }
  };

  const openAttachment = async (file) => {
    try {
      const { data } = await downloadAttachment(file.url);
      const objectUrl = URL.createObjectURL(data);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to download the attachment."));
    }
  };

  const quickRequests = [
    { label: "Reset Gate Access Pin", category: "Other", icon: KeyRound },
    { label: "Book Clubhouse", category: "Community", icon: Calendar },
    { label: "Report Noise Complaint", category: "Noise", icon: Volume2 },
    { label: "Billing Query", category: "Billing", icon: FileQuestion },
  ];
  const visibleTickets = showAll ? tickets : tickets.filter((item) => !["Resolved", "Closed"].includes(item.status));
  const userName = user ? `${user.first_name} ${user.last_name}` : "Resident";

  return <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/helpdesk")} userRole="Resident Portal" userName={userName}>
    <div className="p-6 md:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col relative">
      {toast && <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex gap-3 z-50"><CheckCircle2 className="text-emerald-400" size={20}/><span className="text-sm font-bold">{toast}</span><button onClick={() => setToast("")}><X size={16}/></button></div>}
      <div className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-extrabold text-[#0f2336]">Smart Helpdesk</h1><p className="text-gray-500 mt-2">Instant support powered by AI. Resolve issues quickly or connect with management.</p></div><button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-semibold"><Plus size={16}/>New Ticket</button></div>
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-600">{error}</div>}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="h-16 border-b flex items-center justify-between px-6 bg-gray-50/50"><div className="flex gap-3 items-center"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Bot size={20}/></div><div><h3 className="font-bold text-[#0f2336]">Support Assistant</h3><span className="text-xs text-gray-500">AI support</span></div></div><button onClick={() => setShowModal(true)} className="px-4 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-600">Escalate to Human</button></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {chat.map((item, index) => <div key={index} className={`flex gap-3 max-w-[85%] ${item.role === "user" ? "ml-auto flex-row-reverse" : ""}`}><div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${item.role === "user" ? "bg-[#0f2336] text-white" : "bg-blue-100 text-blue-600"}`}>{item.role === "user" ? <User size={16}/> : <Bot size={16}/>}</div><div className={`p-4 rounded-2xl text-sm ${item.role === "user" ? "bg-[#0f2336] text-white" : "bg-gray-100 text-gray-800"}`}>{item.text}</div></div>)}
            {assistantSending && <div className="flex gap-3 max-w-[85%]" aria-label="Assistant is responding"><div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-blue-100 text-blue-600"><Bot size={16}/></div><div className="p-4 rounded-2xl text-sm bg-gray-100 text-gray-500">Thinking…</div></div>}
            {assistantIssue && <div className="bg-orange-50 border border-orange-200 p-5 rounded-3xl max-w-[90%]"><div className="flex gap-2 text-orange-600 font-bold mb-3"><AlertTriangle size={18}/>Possible Duplicate Issue Detected</div><div className="bg-white rounded-2xl p-4 border"><div className="text-xs font-bold text-gray-400">Ticket #{assistantIssue.complaint_id}</div><div className="font-bold text-[#0f2336]">{assistantIssue.title}</div><div className="text-xs text-gray-500 flex gap-1"><MapPin size={10}/>{assistantIssue.location || "Common area"}</div></div><div className="flex gap-2 mt-4"><button disabled={assistantIssue.subscribed} onClick={() => subscribe(assistantIssue)} className="px-4 py-2 bg-[#0f2336] disabled:opacity-50 text-white rounded-xl text-sm font-semibold">{assistantIssue.subscribed ? "Subscribed" : "Subscribe to updates"}</button><button onClick={() => setShowModal(true)} className="px-4 py-2 bg-white border rounded-xl text-sm font-semibold">This is different</button></div></div>}
            <div ref={chatEndRef}/>
          </div>
          <div className="p-4 bg-white border-t"><div className="relative flex items-center"><button aria-label="Attach a file to a new ticket" onClick={() => setShowModal(true)} className="absolute left-3 text-gray-400"><Paperclip size={18}/></button><input aria-label="Message Support Assistant" maxLength={2000} disabled={assistantSending} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void sendAssistantMessage(); } }} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe your issue..." className="w-full h-12 pl-12 pr-12 bg-gray-50 border rounded-2xl text-sm"/><button aria-label="Send message" disabled={assistantSending || !message.trim()} onClick={sendAssistantMessage} className="absolute right-3 p-1.5 bg-[#0f2336] disabled:opacity-50 text-white rounded-xl"><Send size={16}/></button></div></div>
        </div>

        <div className="lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-1 pb-4">
          <div className="bg-white rounded-3xl p-6 border shadow-sm"><h3 className="font-bold text-[#0f2336] mb-4 text-lg">Frequent Requests</h3><div className="space-y-2">{quickRequests.map((request) => <button key={request.label} onClick={() => { setForm({...INITIAL_FORM, title: request.label, category: request.category}); setShowModal(true); }} className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-gray-50"><request.icon size={16} className="text-blue-600"/><span className="text-sm font-semibold text-gray-700">{request.label}</span></button>)}</div>{knownIssues.length > 0 && <div className="mt-5 pt-4 border-t"><h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Known Issues</h4>{knownIssues.slice(0, 2).map((issue) => <button key={issue.complaint_id} onClick={() => setAssistantIssue(issue)} className="block w-full text-left text-xs p-2 rounded-lg hover:bg-orange-50"><strong>{issue.title}</strong><span className="block text-gray-500">{issue.location || "Common area"} • {issue.status}</span></button>)}</div>}</div>
          <div className="bg-white rounded-3xl p-6 border shadow-sm flex-1"><div className="flex justify-between mb-5"><h3 className="font-bold text-[#0f2336] text-lg">{showAll ? "My Tickets" : "My Open Tickets"}</h3><button onClick={() => setShowAll((value) => !value)} className="text-xs font-bold text-primary">{showAll ? "Open Only" : "View All"}</button></div>{loading && <p className="text-sm text-gray-500">Loading tickets…</p>}{!loading && visibleTickets.length === 0 && <p className="text-sm text-gray-500">No tickets found.</p>}<div className="space-y-4">{visibleTickets.map((ticket) => <button key={ticket.id} onClick={() => openDetails(ticket)} className="w-full text-left p-4 rounded-2xl border hover:shadow-sm"><div className="flex justify-between mb-2"><span className="text-xs font-bold text-gray-400">TK-{ticket.id}</span><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor(ticket.status)}`}>{ticket.status}</span></div><div className="font-bold text-sm text-[#0f2336]">{ticket.title || ticket.category}</div><div className="text-xs text-gray-500">Updated {new Date(ticket.updated_at).toLocaleString()}</div></button>)}</div></div>
        </div>
      </div>

      {showModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"><form onSubmit={submitTicket} className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative"><button type="button" onClick={() => setShowModal(false)} className="absolute top-6 right-6"><X size={20}/></button><h2 className="text-2xl font-extrabold text-[#0f2336] mb-6">New Ticket</h2><div className="space-y-4">{error && <p className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</p>}<input required maxLength={255} value={form.title} onChange={(event) => setForm({...form, title: event.target.value})} placeholder="Issue title" className="w-full h-12 px-4 bg-gray-50 border rounded-xl"/><textarea maxLength={10000} value={form.description} onChange={(event) => setForm({...form, description: event.target.value})} placeholder="Describe the issue" className="w-full px-4 py-3 bg-gray-50 border rounded-xl"/><div className="grid grid-cols-2 gap-3"><select value={form.category} onChange={(event) => setForm({...form, category: event.target.value})} className="h-12 px-4 bg-gray-50 border rounded-xl"><option>Maintenance</option><option>Plumbing</option><option>Electrical</option><option>Lift / Elevator</option><option>Billing</option><option>Community</option><option>Noise</option><option>Other</option></select><select value={form.priority} onChange={(event) => setForm({...form, priority: event.target.value})} className="h-12 px-4 bg-gray-50 border rounded-xl"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div><input ref={createFileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="w-full text-sm"/><button disabled={saving} className="w-full py-4 bg-[#0f2336] text-white rounded-xl font-bold">{saving ? "Submitting…" : "Submit Ticket"}</button></div></form></div>}

      {selected && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-2xl rounded-3xl p-8 max-h-[85vh] overflow-y-auto relative"><button onClick={() => setSelected(null)} className="absolute top-6 right-6"><X size={20}/></button><div className="flex gap-3 items-center mb-2"><span className="font-mono text-gray-400">TK-{selected.id}</span><span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor(selected.status)}`}>{selected.status}</span></div><h2 className="text-2xl font-extrabold text-[#0f2336]">{selected.title || selected.category}</h2><p className="text-sm text-gray-600 mt-3">{selected.description}</p>{selected.resolution_notes && <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-sm"><strong>Resolution:</strong> {selected.resolution_notes}</div>}<h3 className="font-bold mt-6 mb-2">Status History</h3><div className="space-y-2">{details.history.map((item) => <div key={item.id} className="p-3 bg-gray-50 rounded-xl text-sm">{item.from_status ? `${item.from_status} → ` : ""}{item.to_status}<span className="block text-xs text-gray-400">{new Date(item.created_at).toLocaleString()} {item.note && `• ${item.note}`}</span></div>)}</div><h3 className="font-bold mt-6 mb-2">Attachments</h3>{details.attachments.length === 0 ? <p className="text-sm text-gray-500">No attachments.</p> : details.attachments.map((file) => <button key={file.id} onClick={() => openAttachment(file)} className="block text-sm text-blue-600 underline">{file.original_filename}</button>)}<h3 className="font-bold mt-6 mb-2">Updates</h3><div className="space-y-2">{details.comments.map((item) => <div key={item.id} className="p-3 bg-gray-50 rounded-xl text-sm"><strong>{item.author_name}</strong><p>{item.body}</p></div>)}</div><div className="flex gap-2 mt-4"><input value={comment} onChange={(event) => setComment(event.target.value)} className="flex-1 h-11 px-3 border rounded-xl" placeholder="Add a comment"/><button onClick={submitComment} className="px-4 bg-[#0f2336] text-white rounded-xl">Send</button></div></div></div>}
    </div>
  </DashboardLayout>;
}
