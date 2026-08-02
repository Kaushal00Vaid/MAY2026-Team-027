import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { 
  Bot, 
  User, 
  Send, 
  Paperclip, 
  AlertTriangle, 
  MapPin,
  KeyRound,
  Calendar,
  Volume2,
  FileQuestion,
  Plus,
  X,
  CheckCircle2
} from "lucide-react";

import axiosInstance from "@/api/axiosInstance";

const getStatusColor = (status) => {
  switch(status) {
    case 'Open': return "bg-emerald-100 text-emerald-700";
    case 'In Progress': return "bg-blue-100 text-blue-700";
    case 'Resolved': return "bg-gray-100 text-gray-700";
    case 'Closed': return "bg-gray-100 text-gray-500";
    default: return "bg-gray-100 text-gray-700";
  }
};

export default function ResidentHelpdesk() {
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Maintenance");
  const [newPriority, setNewPriority] = useState("Medium");
  const [showToast, setShowToast] = useState(false);

  const fetchTickets = async () => {
    try {
      const response = await axiosInstance.get("/api/helpdesk/complaints");
      setTickets(response.data.map(t => ({
        id: `TK-${t.id}`,
        title: t.title || t.category,
        updated: new Date(t.updated_at).toLocaleString(),
        status: t.status,
        statusColor: getStatusColor(t.status)
      })));
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    }
  };

  useEffect(() => {
    fetchTickets();
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const quickRequests = [
    { label: "Reset Gate Access Pin", icon: KeyRound },
    { label: "Book Clubhouse", icon: Calendar },
    { label: "Report Noise Complaint", icon: Volume2 },
    { label: "Billing Query", icon: FileQuestion },
  ];

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await axiosInstance.post("/api/helpdesk/complaints", {
        title: newTitle,
        description: newDescription || newTitle,
        category: newCategory,
        priority: newPriority,
      });
      setNewTitle("");
      setNewDescription("");
      setNewCategory("Maintenance");
      setNewPriority("Medium");
      setShowModal(false);
      setShowToast(true);
      fetchTickets();
    } catch (error) {
      console.error("Failed to create ticket", error);
    }
  };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/helpdesk")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 h-[calc(100vh-4rem)] flex flex-col relative">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Ticket Created</span>
              <span className="text-xs text-gray-300">Your request has been submitted.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* New Ticket Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-extrabold text-[#0f2336] mb-2">New Ticket</h2>
              <p className="text-gray-500 text-sm mb-6">Create a new helpdesk request manually.</p>
              
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Issue Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Broken gym equipment"
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Category</label>
                    <select
                      className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Billing">Billing</option>
                      <option value="Community">Community</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Priority</label>
                    <select
                      className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full mt-4 py-4 bg-[#0f2336] hover:bg-[#1a365d] text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg">
                  Submit Ticket
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Smart Helpdesk</h1>
            <p className="text-gray-500 mt-2">Instant support powered by AI. Resolve issues quickly or connect with management.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-[#0f2336] hover:bg-[#1a365d] text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95">
            <Plus size={16} /> New Ticket
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Chat Interface */}
          <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
            
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f2336] leading-tight">Support Assistant</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </div>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                Escalate to Human
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 relative">
               {/* Decorative background logo/icon faint */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                 <Bot size={240} />
               </div>

               {/* Bot Message */}
               <div className="flex gap-3 max-w-[85%] relative z-10">
                 <div className="w-8 h-8 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mt-1">
                   <Bot size={16} />
                 </div>
                 <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-sm text-sm shadow-sm border border-gray-200/50">
                   Hello! I'm your SocietySync Assistant. How can I help you today? You can ask me about maintenance, billing, or community rules.
                 </div>
               </div>

               {/* User Message */}
               <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse relative z-10">
                 <div className="w-8 h-8 shrink-0 bg-[#0f2336] text-white rounded-full flex items-center justify-center mt-1 shadow-md">
                   <User size={16} />
                 </div>
                 <div className="bg-[#0f2336] text-white p-4 rounded-2xl rounded-tr-sm text-sm shadow-md">
                   There is water leaking from the ceiling in the Block B 4th floor hallway near the elevators.
                 </div>
               </div>

               {/* Bot Response (Complex Card) */}
               <div className="flex gap-3 max-w-[90%] relative z-10 animate-in slide-in-from-bottom-2 duration-300">
                 <div className="w-8 h-8 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mt-1">
                   <Bot size={16} />
                 </div>
                 <div className="bg-orange-50 border border-orange-200 p-5 rounded-3xl rounded-tl-sm shadow-sm">
                   <div className="flex items-center gap-2 text-orange-600 font-bold mb-3">
                     <AlertTriangle size={18} />
                     Possible Duplicate Issue Detected
                   </div>
                   <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                     Based on your description and location, this seems related to an ongoing incident reported 15 minutes ago.
                   </p>
                   
                   <div className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm mb-4 hover:shadow-md transition-shadow">
                     <div className="flex items-start gap-4">
                       <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                         <MapPin size={24} />
                       </div>
                       <div>
                         <div className="text-xs font-bold text-gray-400 mb-1">Ticket #INC-4092</div>
                         <div className="font-bold text-[#0f2336] mb-1">Plumbing Leak - Main Line</div>
                         <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                           <MapPin size={10} /> Block B, Floor 4, Elevator Lobby
                         </div>
                         <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Status: Maintenance Dispatched</span>
                       </div>
                     </div>
                   </div>

                   <p className="text-sm text-gray-700 mb-4 font-medium">
                     Would you like to subscribe to updates for this ticket instead of creating a new one?
                   </p>
                   
                   <div className="flex flex-wrap gap-2">
                     <button className="px-4 py-2 bg-[#0f2336] hover:bg-[#1a365d] text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95">
                       Yes, subscribe to updates
                     </button>
                     <button className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all">
                       No, this is different
                     </button>
                   </div>
                 </div>
               </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <div className="relative flex items-center">
                <button className="absolute left-3 text-gray-400 hover:text-gray-600 transition-colors p-1">
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Describe your issue..."
                  className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="absolute right-3 p-1.5 bg-[#0f2336] text-white rounded-xl hover:bg-[#1a365d] transition-all shadow-md active:scale-95">
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
              <div className="text-center mt-3 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                AI responses may occasionally be inaccurate.
              </div>
            </div>
          </div>

          {/* Right Sidebar Area */}
          <div className="lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto pr-1 pb-4">
            
            {/* Frequent Requests */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-[#0f2336] mb-4 text-lg">Frequent Requests</h3>
              <div className="space-y-2">
                {quickRequests.map((req, i) => (
                  <button key={i} className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                      <req.icon size={16} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors flex-1">{req.label}</span>
                    <span className="text-gray-300 group-hover:text-primary transition-colors">&rarr;</span>
                  </button>
                ))}
              </div>
            </div>

            {/* My Open Tickets */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[#0f2336] text-lg">My Open Tickets</h3>
                <button className="text-xs font-bold text-primary hover:text-primary/80">View All</button>
              </div>
              <div className="space-y-4">
                {tickets.map((t, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-400 font-mono">{t.id}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${t.statusColor}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#0f2336] mb-1 group-hover:text-primary transition-colors">{t.title}</div>
                    <div className="text-xs text-gray-500">Updated {t.updated}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
