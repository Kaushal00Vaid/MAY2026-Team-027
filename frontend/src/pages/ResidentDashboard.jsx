import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  Wrench,
  CalendarDays,
  QrCode,
  Droplet,
  Zap,
  Maximize2,
  X,
  CreditCard,
  Download,
  AlertCircle,
  Bell,
  Megaphone
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { getResidentAnalytics } from "@/api/analytics";

export default function ResidentDashboard() {
  const [ticketFilter, setTicketFilter] = useState("all");
  const [showQRModal, setShowQRModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getResidentAnalytics();
        setAnalytics(response.data);
      } catch (error) {
        console.error("Failed to fetch resident analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getIconForType = (type) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('plumb')) return Droplet;
    if (t.includes('elect')) return Zap;
    if (t.includes('admin') || t.includes('bill')) return Wallet;
    return Wrench;
  };

  const tickets = analytics?.tickets || [];
  const notices = analytics?.notices || [];
  const bookings = analytics?.bookings || [];
  const events = analytics?.events || [];
  const balance = analytics?.balance || { total_due: 0 };

  const filteredTickets = tickets.filter(t => {
    if (ticketFilter === "open") return t.status !== "Resolved" && t.status !== "Closed";
    if (ticketFilter === "resolved") return t.status === "Resolved" || t.status === "Closed";
    return true;
  });

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        {/* Top Header & Balance */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2336] tracking-tight">Welcome back, Ananya!</h1>
            <p className="text-gray-500 mt-2 text-base">Here's what's happening in Green Valley today.</p>
          </div>

          <div className="bg-gradient-to-br from-[#0f1a2b] to-[#1a2d48] p-6 rounded-2xl shadow-xl w-full lg:w-96 shrink-0 relative overflow-hidden group">
            {/* Decorative background circles */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 right-10 -mb-10 w-24 h-24 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors duration-700"></div>
            
            <div className="relative z-10 flex justify-between items-start mb-4">
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">Current Balance</div>
              {balance.latest_invoice_number && (
                <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <AlertCircle size={12} /> {balance.latest_invoice_number}
                </div>
              )}
            </div>
            <div className="relative z-10 text-4xl font-extrabold text-white mb-1">
              ₹{Math.floor(balance.total_due).toLocaleString()}
              <span className="text-xl text-white/60">.{(balance.total_due % 1).toFixed(2).substring(2)}</span>
            </div>
            {balance.next_due_date ? (
              <div className="relative z-10 text-sm text-red-300 font-medium mb-6">Due by {balance.next_due_date}</div>
            ) : (
              <div className="relative z-10 text-sm text-emerald-300 font-medium mb-6">All clear!</div>
            )}
            
            <div className="relative z-10 flex gap-3">
              <button className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95 flex items-center justify-center gap-2">
                <CreditCard size={16} /> Pay Now
              </button>
              <button className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm border border-white/10 transition-all active:scale-95 flex items-center justify-center">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Active Tickets (Col 1-5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Wrench size={18} className="text-blue-500" />
                Helpdesk Tickets
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {["all", "open", "resolved"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTicketFilter(tab)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                      ticketFilter === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {filteredTickets.map(t => (
                <div key={t.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        t.color === 'orange' ? 'bg-orange-100 text-orange-500' :
                        t.color === 'blue' ? 'bg-blue-100 text-blue-500' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {(() => {
                          const Icon = getIconForType(t.type);
                          return <Icon size={18} />;
                        })()}
                      </div>
                      <div>
                        <div className="font-bold text-[#0f2336] text-sm group-hover:text-primary transition-colors">{t.title}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{t.id} • {t.type}</div>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      (t.status === 'Resolved' || t.status === 'Closed') ? 'bg-[#0f2336] text-white' : 'bg-orange-100 text-orange-700 animate-pulse'
                    }`}>
                      {t.status}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">No tickets found.</div>
              )}
            </div>
            
            <button className="mt-4 w-full py-2.5 border border-dashed border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2">
              <span className="text-lg leading-none">+</span> Raise New Ticket
            </button>
          </div>

          {/* Bookings & Pass (Col 6-8) */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">
            {/* Digital Entry Pass */}
            <div className="bg-gradient-to-br from-[#0f2336] to-[#1e3a5f] p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="w-full flex items-center justify-between mb-5 z-10">
                <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Digital ID</div>
                <QrCode size={16} className="text-white/50" />
              </div>
              
              <div className="w-28 h-28 bg-white p-2 rounded-xl mb-5 relative z-10 shadow-lg cursor-pointer transform transition-transform hover:scale-105 active:scale-95" onClick={() => setShowQRModal(true)}>
                {/* Mock QR Code Pattern */}
                <div className="w-full h-full bg-gray-100 grid grid-cols-3 grid-rows-3 gap-0.5">
                  <div className="bg-[#0f2336] rounded-sm"></div><div className="bg-transparent"></div><div className="bg-[#0f2336] rounded-sm"></div>
                  <div className="bg-transparent"></div><div className="bg-[#0f2336] rounded-sm"></div><div className="bg-transparent"></div>
                  <div className="bg-[#0f2336] rounded-sm"></div><div className="bg-transparent"></div><div className="bg-[#0f2336] rounded-sm"></div>
                </div>
                <div className="absolute inset-0 border border-black/10 rounded-xl pointer-events-none"></div>
              </div>
              
              <button 
                onClick={() => setShowQRModal(true)}
                className="text-xs font-semibold text-white/90 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors z-10"
              >
                <Maximize2 size={12} />
                Expand Pass
              </button>
            </div>

            {/* My Bookings */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-[#0f2336] flex items-center gap-2 mb-4">
                <CalendarDays size={18} className="text-emerald-500" />
                My Bookings
              </h3>
              <div className="relative pl-4 border-l-2 border-emerald-100 space-y-4">
                {bookings.map((b, i) => (
                  <div key={b.id} className={`relative ${!b.is_today ? 'opacity-60' : ''}`}>
                    <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 bg-white ${
                      b.is_today ? 'border-emerald-500' : 'border-gray-300'
                    }`}></span>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                      b.is_today ? 'text-emerald-600' : 'text-gray-500'
                    }`}>{b.is_today ? 'Today' : 'Upcoming'}</div>
                    <div className="font-bold text-sm text-[#0f2336]">{b.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{b.starts_at} - {b.ends_at}</div>
                  </div>
                ))}
                {bookings.length === 0 && (
                  <div className="text-sm text-gray-500 italic mt-2">No upcoming bookings.</div>
                )}
              </div>
            </div>
          </div>

          {/* Events (Col 9-12) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-[#0f2336] flex items-center gap-2 mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] text-purple-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Upcoming Events
            </h3>
            <div className="space-y-4">
              {events.map((e, index) => (
                <div key={e.id}>
                  {index > 0 && <div className="w-full h-px bg-gray-100 my-3"></div>}
                  <div className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="w-14 h-14 bg-purple-50 border border-purple-100 rounded-xl flex flex-col items-center justify-center shrink-0 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <div className="text-[10px] font-bold text-purple-500 group-hover:text-purple-200 uppercase tracking-wider">{e.month}</div>
                      <div className="text-xl font-extrabold text-purple-700 group-hover:text-white leading-none mt-0.5">{e.day}</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="font-bold text-sm text-[#0f2336]">{e.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{e.location} • {e.time_str}</div>
                      <button className="mt-2 w-fit px-3 py-1 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-gray-50 transition">
                        RSVP / Info
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-sm text-gray-500 italic mt-2">No upcoming events.</div>
              )}
            </div>
          </div>
        </div>

        {/* Notice Board - Horizontal Scroll */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-pink-500" />
            <h3 className="text-lg font-bold text-[#0f2336]">Notice Board</h3>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar cursor-grab active:cursor-grabbing">
            {notices.map((n, i) => (
              <div key={n.id || i} className={`min-w-[300px] max-w-[300px] p-5 rounded-2xl border snap-start shrink-0 hover:shadow-md transition-shadow
                ${n.color === 'blue' ? 'bg-blue-50/50 border-blue-100' : 
                  n.color === 'orange' ? 'bg-orange-50/50 border-orange-100' : 
                  'bg-emerald-50/50 border-emerald-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-current" style={{ color: `var(--${n.color}-500)` }}></div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{n.from_author} • {n.time_str}</div>
                </div>
                <div className="font-bold text-base text-[#0f2336] mb-2 leading-snug">{n.title}</div>
                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{n.desc}</p>
              </div>
            ))}
            {notices.length === 0 && (
              <div className="text-sm text-gray-500 italic px-4 py-2">No new notices.</div>
            )}
            
            {/* View All Card */}
            <div className="min-w-[150px] p-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center snap-start shrink-0 hover:bg-gray-100 cursor-pointer transition-colors group">
              <span className="text-sm font-bold text-gray-500 group-hover:text-primary transition-colors">View All &rarr;</span>
            </div>
          </div>
        </div>

      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1a2b]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#0f2336] to-[#1a365d] p-6 text-center relative">
              <button 
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
              <h3 className="text-lg font-bold text-white mb-1">Digital Entry Pass</h3>
              <p className="text-xs text-white/70">Green Valley Residency • Unit B-402</p>
            </div>
            
            {/* QR Body */}
            <div className="p-8 flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-50 rounded-2xl border-2 border-gray-100 p-2 mb-6 relative">
                {/* Scanner Animation Line */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/50 shadow-[0_0_8px_rgba(79,70,229,0.8)] animate-[scan_2s_ease-in-out_infinite_alternate]"></div>
                
                {/* Mock QR Content */}
                <div className="w-full h-full bg-gray-200 grid grid-cols-4 grid-rows-4 gap-1 p-1">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-[#0f2336]' : 'bg-transparent'}`}></div>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <div className="font-mono text-lg font-bold tracking-widest text-[#0f2336] mb-1">ID: RES-84920</div>
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  Status: Active
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
