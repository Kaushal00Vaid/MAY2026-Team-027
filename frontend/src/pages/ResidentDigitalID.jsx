import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { ShieldCheck, Share, Phone, ShieldAlert, LogIn, LogOut, Users, RefreshCw, CheckCircle2, X } from "lucide-react";

export default function ResidentDigitalID() {
  const [guestName, setGuestName] = useState("");
  const [refreshCountdown, setRefreshCountdown] = useState(14);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: "", desc: "" });

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => prev > 0 ? prev - 1 : 30);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSharePass = () => {
    if (!guestName.trim()) return;
    setToastMessage({ title: "Pass Sent", desc: `A temporary access pass has been sent to ${guestName}.` });
    setShowToast(true);
    setGuestName("");
  };

  const showEmergencyToast = (service) => {
    setToastMessage({ title: "Connecting", desc: `Initiating call to ${service}...` });
    setShowToast(true);
  };

  const accessLogs = [
    { event: "Entry", loc: "Main Gate - Vehicle", time: "Today, 08:42 AM", type: "entry" },
    { event: "Exit", loc: "Main Gate - Pedestrian", time: "Yesterday, 06:15 PM", type: "exit" },
    { event: "Entry", loc: "Fitness Center", time: "Yesterday, 06:30 AM", type: "entry" },
    { event: "Guest Entry", loc: "Lobby Desk", time: "Oct 24, 02:10 PM", type: "guest" },
  ];

  const getLogIcon = (type) => {
    switch (type) {
      case 'entry': return <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><LogIn size={14} /></div>;
      case 'exit': return <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><LogOut size={14} /></div>;
      case 'guest': return <div className="w-8 h-8 rounded-full bg-[#0f2336] text-white flex items-center justify-center"><Users size={14} /></div>;
      default: return null;
    }
  };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/digital-id")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Identity & Access</h1>
          <p className="text-gray-500 mt-2">Manage your digital credentials, generate temporary guest passes, and review recent access activity.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Digital ID Card Column */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              
              {/* ID Header */}
              <div className="bg-gradient-to-br from-[#0f2336] to-[#1a365d] p-6 text-white relative overflow-hidden">
                {/* Security Pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">SocietySync Verified</span>
                  <ShieldCheck size={18} className="text-emerald-400" />
                </div>
                
                <h2 className="relative z-10 text-3xl font-extrabold tracking-tight mb-2">Resident</h2>
              </div>

              {/* ID Body */}
              <div className="p-6 flex flex-col items-center relative">
                {/* Floating Avatar */}
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 overflow-hidden absolute -top-10 left-6">
                  <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Ananya&backgroundColor=f3f4f6" alt="User" className="w-full h-full object-cover" />
                </div>
                
                <div className="w-full pl-24 mb-8">
                  <h3 className="font-bold text-[#0f2336] text-lg">Ananya Sharma</h3>
                  <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                     Tower B, Unit 402
                  </p>
                </div>

                <div className="text-center w-full">
                  <p className="text-xs text-gray-400 font-medium mb-4">Scan at main gate or amenity entrances.</p>
                  
                  {/* The QR Code visualization */}
                  <div className="w-48 h-48 mx-auto bg-gray-50 rounded-2xl border-2 border-gray-100 p-3 mb-6 relative group overflow-hidden">
                    {/* Scanner line animation */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_8px_rgba(216,121,67,0.8)] animate-[scan_2s_ease-in-out_infinite_alternate] z-10"></div>
                    
                    {/* QR Code pattern */}
                    <div className="w-full h-full bg-gray-200 grid grid-cols-5 grid-rows-5 gap-1 p-1">
                      {[...Array(25)].map((_, i) => (
                         <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-[#0f2336]' : 'bg-transparent'}`}></div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <RefreshCw size={12} className={refreshCountdown < 5 ? "animate-spin text-primary" : ""} />
                    Refreshes in {refreshCountdown}s
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Toast Notification */}
            {showToast && (
              <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{toastMessage.title}</span>
                  <span className="text-xs text-gray-300">{toastMessage.desc}</span>
                </div>
                <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Share Invite */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Share size={18} className="text-blue-500" />
                  <h3 className="font-bold text-[#0f2336] text-lg">Share Invite</h3>
                </div>
                <p className="text-xs text-gray-500 mb-6">Generate a temporary QR pass for guests or deliveries.</p>
                
                <div className="flex-1 flex flex-col justify-end gap-3">
                  <input 
                    type="text" 
                    placeholder="Guest Name" 
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                  />
                  <button onClick={handleSharePass} className="w-full py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Share size={14} /> Send Pass
                  </button>
                </div>
              </div>

              {/* Emergency Hub */}
              <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  <ShieldAlert size={100} />
                </div>
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <ShieldAlert size={18} className="text-red-500" />
                  <h3 className="font-bold text-[#0f2336] text-lg">Emergency Hub</h3>
                </div>
                <p className="text-xs text-gray-500 mb-6 relative z-10">Quick access to essential contacts.</p>
                
                <div className="flex-1 flex flex-col justify-end gap-2 relative z-10">
                  <button onClick={() => showEmergencyToast("Front Desk")} className="w-full px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 flex items-center justify-between transition-colors shadow-sm active:scale-95">
                    Front Desk <Phone size={14} className="text-gray-400" />
                  </button>
                  <button onClick={() => showEmergencyToast("Security Patrol")} className="w-full px-4 py-3 bg-red-100 hover:bg-red-200 border border-red-200 rounded-xl text-sm font-bold text-red-700 flex items-center justify-between transition-colors shadow-sm active:scale-95">
                    Security Patrol <ShieldCheck size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Access Log */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-1 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#0f2336] text-lg">Recent Access Log</h3>
                <button className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">View All</button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Event</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {getLogIcon(log.type)}
                            <span className="font-semibold text-sm text-[#0f2336]">{log.event}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.loc}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
