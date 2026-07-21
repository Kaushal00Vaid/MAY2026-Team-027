import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { Megaphone, BarChart3, Calendar, HeartHandshake, ChevronLeft, ChevronRight, Clock, MapPin, X, CheckCircle2 } from "lucide-react";

export default function ResidentCommunity() {
  const [pollVoted, setPollVoted] = useState(false);
  const [pollOptions, setPollOptions] = useState([
    { id: 1, label: "Pickleball Court", val: 45, bg: "bg-blue-200" },
    { id: 2, label: "Co-working Space Expansion", val: 30, bg: "bg-gray-200" },
    { id: 3, label: "Community Garden", val: 25, bg: "bg-gray-200" },
  ]);
  const [signedUp, setSignedUp] = useState(false);
  const [showNoticesModal, setShowNoticesModal] = useState(false);

  const notices = [
    { target: "Block A & B", time: "Today, 09:00 AM", title: "Scheduled Water Maintenance", desc: "Water supply will be interrupted between 2 PM and 4 PM for routine pump maintenance.", color: "bg-blue-100 text-blue-700 border-blue-500" },
    { target: "All Blocks", time: "Yesterday", title: "Annual General Meeting Minutes", desc: "The minutes from the AGM held on Oct 15th are now available for review in the document center.", color: "bg-emerald-100 text-emerald-700 border-emerald-500" },
    { target: "Block C", time: "Oct 18", title: "Elevator Servicing", desc: "Passenger elevator in Block C will be down for 2 hours.", color: "bg-orange-100 text-orange-700 border-orange-500" },
  ];

  const events = [
    { month: "OCT", day: "28", title: "Halloween Mixer", time: "18:00 - 21:00", loc: "Clubhouse", color: "bg-blue-100 text-blue-600" },
    { month: "NOV", day: "05", title: "Yoga Workshop", time: "07:00 - 08:30", loc: "Central Lawn", color: "bg-gray-100 text-gray-600" },
  ];

  const handleVote = (id) => {
    if (pollVoted) return;
    setPollOptions(pollOptions.map(opt => {
      if (opt.id === id) {
        return { ...opt, val: opt.val + 5, bg: "bg-blue-400" };
      } else {
        return { ...opt, val: Math.max(0, opt.val - 2) };
      }
    }));
    setPollVoted(true);
  };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/community")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">

        {/* Notices Modal */}
        {showNoticesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
              <button onClick={() => setShowNoticesModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <div className="mb-6 shrink-0">
                <h2 className="text-2xl font-extrabold text-[#0f2336] flex items-center gap-2">
                  <Megaphone size={24} className="text-blue-500" />
                  All Notices
                </h2>
                <p className="text-gray-500 text-sm mt-1">Complete history of community announcements.</p>
              </div>
              <div className="overflow-y-auto pr-2 space-y-4">
                {notices.map((n, i) => (
                  <div key={i} className={`relative pl-6 border-l-[3px] py-2 ${n.color}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-[#0f2336]`}>{n.target}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{n.time}</span>
                    </div>
                    <h3 className="font-bold text-[#0f2336] text-base mb-1">{n.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 relative inline-block">
          {/* Faint swoosh decoration behind title */}
          <div className="absolute -top-4 -left-6 w-32 h-16 border-t-2 border-l-2 border-primary/20 rounded-tl-[60px] rounded-br-[60px] -z-10 rotate-[-15deg]"></div>
          <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Community Hub</h1>
          <p className="text-gray-500 mt-2">Connect, participate, and stay informed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

          {/* Notice Board */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Megaphone size={20} className="text-blue-500" />
                Notice Board
              </h2>
              <button onClick={() => setShowNoticesModal(true)} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">View All</button>
            </div>

            <div className="space-y-6 pl-2">
              {notices.slice(0, 2).map((n, i) => (
                <div key={i} className={`relative pl-6 border-l-[3px] ${n.color}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-[#0f2336]`}>{n.target}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{n.time}</span>
                  </div>
                  <h3 className="font-bold text-[#0f2336] text-base mb-1">{n.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Poll */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-emerald-500" />
              Active Poll
            </h2>

            <div className="flex-1">
              <h3 className="font-bold text-[#0f2336] mb-1">New Amenity Addition: Quarter 4</h3>
              <p className="text-xs text-gray-500 mb-6">Vote for the next community upgrade.</p>

              <div className="space-y-3 mb-6">
                {pollOptions.map((opt) => (
                  <div 
                    key={opt.id} 
                    onClick={() => handleVote(opt.id)}
                    className={`relative h-8 bg-gray-50 rounded-lg overflow-hidden flex items-center px-3 border border-gray-100/50 group ${pollVoted ? 'cursor-default' : 'cursor-pointer hover:border-blue-300'}`}
                  >
                    <div className={`absolute top-0 left-0 h-full ${opt.bg} opacity-50 transition-all duration-500`} style={{ width: `${opt.val}%` }}></div>
                    <span className="relative z-10 text-xs font-semibold text-gray-700 flex-1">{opt.label}</span>
                    {pollVoted && <span className="relative z-10 text-xs font-bold text-gray-700">{opt.val}%</span>}
                  </div>
                ))}
              </div>
            </div>
            
            {pollVoted ? (
              <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Vote Recorded
              </div>
            ) : (
              <button className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#0f2336] font-bold text-sm rounded-xl transition-colors shadow-sm cursor-not-allowed opacity-50">
                Select an Option
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Upcoming Events */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Upcoming Events
              </h2>
              <div className="flex gap-2">
                <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"><ChevronLeft size={16} /></button>
                <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {events.map((ev, i) => (
                <div key={i} className="min-w-[240px] p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-4 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer group">
                  <div className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${ev.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{ev.month}</span>
                    <span className="text-xl font-extrabold leading-none">{ev.day}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-bold text-[#0f2336] text-sm mb-1 group-hover:text-primary transition-colors">{ev.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5"><Clock size={12} /> {ev.time}</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={12} className="opacity-0 w-0 h-0" /> <span className="ml-0.5">• {ev.loc}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volunteer Board */}
          <div className="lg:col-span-6 bg-[#0f2336] p-6 rounded-3xl shadow-lg relative overflow-hidden group">
            {/* Background design elements */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex items-start justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HeartHandshake size={20} className="text-primary" />
                Volunteer Board
              </h2>
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider shadow-sm">{signedUp ? '2 Needed' : '3 Needed'}</span>
            </div>

            <p className="text-sm text-gray-400 mb-6 relative z-10">Give back to the community. Join one of our active resident committees.</p>

            <div className={`bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative z-10 flex items-center justify-between gap-4 transition-colors ${signedUp ? 'bg-emerald-500/20 border-emerald-500/50' : 'group-hover:bg-white/10'}`}>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">Festive Decoration Committee</h3>
                <p className="text-xs text-gray-400">Help setup lights and displays for the upcoming holidays.</p>
              </div>
              {signedUp ? (
                <button onClick={() => setSignedUp(false)} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-colors shrink-0 backdrop-blur-sm flex items-center gap-1">
                  <CheckCircle2 size={14} /> Signed Up
                </button>
              ) : (
                <button onClick={() => setSignedUp(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-colors shrink-0 backdrop-blur-sm">
                  Sign Up
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
