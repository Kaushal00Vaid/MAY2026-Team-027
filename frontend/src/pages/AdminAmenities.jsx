import { useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  QrCode,
  Edit2,
  Calendar,
  Clock,
  MapPin
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: true, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
];

export default function AdminAmenities() {
  const [activeTab, setActiveTab] = useState("Clubhouse");

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        
        {/* Subtle background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/5 rounded-[100%] blur-3xl -z-10 pointer-events-none"></div>

        {/* Header / Nav Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-4 px-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
            <button 
              onClick={() => setActiveTab("Clubhouse")}
              className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'Clubhouse' ? 'bg-[#5f8787] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white'}`}
            >
              Clubhouse
            </button>
            <button 
              onClick={() => setActiveTab("Tennis Court")}
              className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'Tennis Court' ? 'bg-[#5f8787] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white'}`}
            >
              Tennis Court
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#5f8787] hover:border-teal-200 transition-all active:scale-95">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
              <Calendar size={16} className="text-[#5f8787]" />
              <span className="text-sm font-extrabold text-[#0f2336]">Oct 12 - Oct 18, 2024</span>
            </div>
            <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#5f8787] hover:border-teal-200 transition-all active:scale-95">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Enhanced Calendar Grid */}
          <div className="xl:col-span-8 bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-x-auto relative">
            <h3 className="text-xl font-bold text-[#0f2336] mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-[#5f8787]" />
              {activeTab} Schedule
            </h3>
            
            <div className="min-w-[750px]">
              {/* Header Row */}
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="p-3 text-right"></div>
                {[
                  { d: 'Mon', n: '12' }, 
                  { d: 'Tue', n: '13' }, 
                  { d: 'Wed', n: '14', active: true }, 
                  { d: 'Thu', n: '15' }, 
                  { d: 'Fri', n: '16' }, 
                  { d: 'Sat', n: '17' }, 
                  { d: 'Sun', n: '18' }
                ].map((day, i) => (
                  <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-2xl ${day.active ? 'bg-[#0f2336] text-white shadow-lg' : 'bg-gray-50/50 text-gray-500'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${day.active ? 'text-blue-200' : ''}`}>{day.d}</span>
                    <span className="text-lg font-extrabold">{day.n}</span>
                  </div>
                ))}
              </div>
              
              {/* Time Slots */}
              {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM'].map((time, rowIdx) => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-2 group">
                  <div className="p-3 flex flex-col justify-center items-end">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#5f8787] transition-colors">{time.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold text-gray-400">{time.split(' ')[1]}</span>
                  </div>
                  
                  {/* Interactive Slots */}
                  {[0, 1, 2, 3, 4, 5, 6].map((colIdx) => {
                    let bgClass = "bg-teal-50/50 border border-teal-100 hover:bg-teal-100 hover:border-teal-300"; // default available
                    let content = null;
                    let shadow = "";

                    if (rowIdx === 0 && colIdx === 2) {
                      bgClass = "bg-[#0f2336] border-transparent";
                      shadow = "shadow-md shadow-[#0f2336]/20";
                      content = <span className="text-white text-[11px] font-bold">Apt 402</span>;
                    } else if (rowIdx === 1 && colIdx === 2) {
                      bgClass = "bg-[#d87943] border-transparent";
                      shadow = "shadow-md shadow-[#d87943]/20";
                      content = <span className="text-white text-[11px] font-bold flex items-center justify-center gap-1">In Process</span>;
                    } else if (rowIdx === 2 && (colIdx === 3 || colIdx === 4)) {
                      bgClass = "bg-[#0f2336] border-transparent";
                      content = <span className="text-white/50 text-[10px] font-bold">Booked</span>;
                    } else if ((rowIdx === 0 && colIdx === 4) || (rowIdx === 3 && (colIdx === 4 || colIdx === 5))) {
                      bgClass = "bg-gray-100 border-gray-200 flex items-center justify-center opacity-50 cursor-not-allowed";
                      content = <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-[10px] font-bold">/</div>;
                    }

                    return (
                      <div key={`${rowIdx}-${colIdx}`} className={`p-3 rounded-2xl h-[72px] transition-all cursor-pointer flex flex-col justify-center items-center ${bgClass} ${shadow} hover:scale-[1.02]`}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* Premium Reserve Card */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-transparent rounded-bl-full -z-10"></div>
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-extrabold text-[#0f2336]">Reserve Slot</h3>
                  <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-teal-100">{activeTab}</span>
                </div>
                
                <div className="bg-[#0f2336] rounded-2xl p-5 flex items-center gap-5 mb-8 shadow-lg shadow-[#0f2336]/10 relative overflow-hidden group cursor-pointer hover:bg-[#16334f] transition-colors">
                  <div className="absolute right-0 top-0 w-24 h-full bg-white/5 skew-x-12 -mr-10 group-hover:bg-white/10 transition-colors"></div>
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 transform -rotate-90 drop-shadow-md">
                      <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                      <circle cx="28" cy="28" r="24" stroke="#5f8787" strokeWidth="6" fill="none" strokeDasharray="150" strokeDashoffset="50" className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">2/3</div>
                  </div>
                  <div>
                    <div className="font-bold text-white mb-0.5 tracking-wide">Household Quota</div>
                    <div className="text-xs text-blue-200 font-medium">1 slot remaining this week</div>
                  </div>
                </div>
                
                <div className="space-y-5 mb-8">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Date & Time</label>
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 bg-gray-50 hover:bg-white hover:border-teal-200 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                        <span className="text-sm font-extrabold text-[#0f2336]">Wed 14 Oct, 11:00 AM</span>
                      </div>
                      <Edit2 size={16} className="text-gray-400 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Purpose</label>
                    <select className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 hover:bg-white hover:border-teal-200 text-sm font-bold text-[#0f2336] outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer appearance-none">
                      <option>Private Event</option>
                      <option>Society Meeting</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                
                <button className="w-full py-4 bg-[#5f8787] hover:bg-[#4a6d6d] text-white font-extrabold tracking-wide rounded-xl text-sm transition-transform shadow-lg shadow-teal-500/30 active:scale-95">
                  CONFIRM BOOKING
                </button>
              </div>
            </div>

            {/* Generated Token Card */}
            <div className="bg-gradient-to-b from-[#1a1a24] to-[#0f1520] p-8 rounded-[2rem] border border-white/5 shadow-2xl relative text-center overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
              
              {/* CSS Cutouts for ticket look */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#fafafa] rounded-full shadow-inner"></div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#fafafa] rounded-full shadow-inner"></div>
              
              {/* Dotted cut line */}
              <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:10px_2px] opacity-30"></div>
              
              <div className="relative z-10">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 shadow-[0_0_15px_rgba(95,135,135,0.4)]">
                    <CheckCircle2 size={24} className="text-teal-400" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-white mb-1">Booking Confirmed</h3>
                <p className="text-sm text-gray-400 mb-8">Access token for Flat A-402</p>
                
                <div className="flex justify-center mb-8 pb-4">
                  <div className="bg-white rounded-2xl p-3 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
                    <QrCode size={96} className="text-[#0f1520]" />
                  </div>
                </div>
                
                <div className="pt-6 mt-4 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Token ID</div>
                    <div className="text-sm font-mono font-bold text-teal-400">#CG-8492</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Valid On</div>
                    <div className="text-sm font-bold text-white">12 Oct, 18:00</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
