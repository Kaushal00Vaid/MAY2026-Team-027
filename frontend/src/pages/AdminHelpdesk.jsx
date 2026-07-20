import { useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  ArrowRight,
  Droplet,
  Zap,
  Wrench,
  Search,
  CheckCircle2,
  X,
  UploadCloud
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: true, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
];

export default function AdminHelpdesk() {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("Lift / Elevator");

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute top-40 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2336] tracking-tight">Support Desk</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">Issue resolution and vendor orchestration matrix.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                className="w-full sm:w-64 h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
            <button className="h-11 w-11 flex items-center justify-center bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl transition-all shadow-sm active:scale-95">
              <Filter size={18} />
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="h-11 px-6 bg-[#0f2336] hover:bg-[#1a3857] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#0f2336]/20 active:scale-95 flex items-center gap-2"
            >
              <Plus size={18} />
              Raise Ticket
            </button>
          </div>
        </div>

        {/* Stats Bento */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Active */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Wrench size={20} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active</span>
            </div>
            <div className="text-4xl font-extrabold text-[#0f2336]">42</div>
            <div className="text-xs text-blue-600 font-semibold mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span> 12 unassigned
            </div>
          </div>
          
          {/* SLA Warning */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-orange-100 shadow-[0_4px_20px_rgba(249,115,22,0.05)] group hover:shadow-[0_8px_30px_rgba(249,115,22,0.1)] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-orange-50 text-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Warning</span>
            </div>
            <div className="text-4xl font-extrabold text-orange-600">8</div>
            <div className="text-xs text-orange-600/70 font-semibold mt-2">Approaching 24h SLA</div>
          </div>

          {/* Breached */}
          <div className="bg-[#1a1a24] p-6 rounded-3xl border border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.15)] group hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)] transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle size={20} />
              </div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">Breached</span>
            </div>
            <div className="text-4xl font-extrabold text-white">2</div>
            <div className="text-xs text-red-400/80 font-semibold mt-2">Requires intervention</div>
          </div>

          {/* Resolved */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resolved</span>
            </div>
            <div className="text-4xl font-extrabold text-[#0f2336]">15</div>
            <div className="text-xs text-emerald-600 font-semibold mt-2">Today's completion</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Active Ticket Grid */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <h3 className="text-xl font-bold text-[#0f2336]">Current Pipeline</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Premium Ticket Card 1 */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <Droplet size={14} />
                      </div>
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Plumbing</span>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">#884</span>
                  </div>
                  <h4 className="font-extrabold text-lg text-[#0f2336] mb-2 group-hover:text-blue-600 transition-colors leading-tight">Kitchen pipe leaking extensively</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">"The pipe under the sink burst an hour ago. Need immediate assistance before flooring gets damaged."</p>
                </div>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 z-10">402</div>
                    <span className="text-xs font-semibold text-gray-500">Apt 402 • 2h ago</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Premium Ticket Card 2 (Warning) */}
              <div className="bg-white rounded-3xl p-6 border border-orange-200 shadow-[0_8px_30px_rgba(249,115,22,0.06)] hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)] transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-10 group-hover:scale-125 transition-transform"></div>
                
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 animate-pulse">
                        <AlertTriangle size={14} />
                      </div>
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Lift/Elevator</span>
                    </div>
                    <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">High Priority</span>
                  </div>
                  <h4 className="font-extrabold text-lg text-[#0f2336] mb-2 group-hover:text-orange-600 transition-colors leading-tight">Elevator stuck on 4th floor</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">"Block A main elevator is jammed. No one inside but requires urgent fix from vendor."</p>
                </div>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-orange-700 z-10">Sec</div>
                    <span className="text-xs font-semibold text-gray-500">Security • SLA Warning</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Premium Ticket Card 3 */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 cursor-pointer group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                        <Zap size={14} />
                      </div>
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Electrical</span>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">#881</span>
                  </div>
                  <h4 className="font-extrabold text-lg text-[#0f2336] mb-2 group-hover:text-purple-600 transition-colors leading-tight">Corridor lights out on 3rd floor</h4>
                  <p className="text-sm text-gray-500 line-clamp-2">"Entire corridor is pitch black. Needs bulb replacements ASAP."</p>
                </div>
                
                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 z-10">201</div>
                    <span className="text-xs font-semibold text-gray-500">Apt 201 • 1d ago</span>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-purple-50 group-hover:text-purple-600 flex items-center justify-center transition-colors">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Escalation Center */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <h3 className="text-xl font-bold text-[#0f2336]">Escalation Center</h3>
            
            <div className="bg-[#0f1520] rounded-[2rem] p-1 shadow-2xl relative overflow-hidden h-full flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/40 via-[#0f1520] to-[#0f1520]"></div>
              
              <div className="bg-[#151b2b]/80 backdrop-blur-md rounded-[1.8rem] border border-white/5 p-6 md:p-8 relative z-10 flex-1 flex flex-col">
                
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"></div>
                  <h4 className="text-white font-bold tracking-widest text-sm uppercase">Active Breach</h4>
                </div>
                
                <div className="mb-8">
                  <div className="text-xs font-mono text-gray-400 mb-2">#TK-875</div>
                  <h3 className="text-2xl font-extrabold text-white leading-tight mb-4">Power Backup Failure</h3>
                  <p className="text-sm text-gray-400">Main DG set in clubhouse failed to auto-start during power cut.</p>
                </div>

                {/* Cyberpunk styled timeline */}
                <div className="relative border-l border-white/10 ml-3 space-y-8 flex-1">
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.8)]"></span>
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">09:00 AM</div>
                    <div className="text-sm text-gray-300 font-medium">Ticket Logged</div>
                  </div>
                  
                  <div className="relative pl-6">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]"></span>
                    <div className="text-[10px] font-bold text-red-400 tracking-wider mb-1">01:00 PM</div>
                    <div className="text-sm text-red-200 font-bold">SLA Breached (4hrs)</div>
                  </div>
                  
                  <div className="relative pl-6 opacity-60">
                    <span className="absolute -left-[6px] top-1 w-3 h-3 rounded-full border border-red-500/50 bg-[#151b2b] flex items-center justify-center">
                      <div className="w-1 h-1 rounded-full bg-red-500/50"></div>
                    </span>
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">01:15 PM</div>
                    <div className="text-sm text-gray-400 italic">Auto-escalated to Committee</div>
                  </div>
                </div>
                
                <button className="w-full mt-8 py-4 bg-white hover:bg-gray-100 text-[#0f1520] font-extrabold rounded-2xl text-sm transition-transform active:scale-95 flex items-center justify-center gap-2">
                  <AlertTriangle size={18} />
                  TAKE ACTION
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modern Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1a2b]/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="px-8 py-6 flex items-center justify-between bg-white relative z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0f2336]">Raise Ticket</h2>
                <p className="text-sm text-gray-500 mt-1">Submit a new maintenance request.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-8 pb-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar relative z-10">
              
              {/* Smart Alert */}
              {category === "Lift / Elevator" && (
                <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-5 flex items-start gap-4 animate-in slide-in-from-top-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-900 mb-1">Potential Duplicate Detected</h4>
                    <p className="text-sm text-orange-800/80 mb-3 leading-relaxed">A similar issue "Lift Failure - Block A" near your selected location is already being addressed.</p>
                    <button className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                      VIEW TICKET #882 <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-semibold text-[#0f2336] focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option>Lift / Elevator</option>
                    <option>Plumbing</option>
                    <option>Electrical</option>
                    <option>Carpentry</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div className="space-y-2 md:row-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Description</label>
                  <textarea 
                    placeholder="Provide details about the issue..."
                    className="w-full h-[120px] p-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-medium focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Location</label>
                  <input 
                    type="text" 
                    defaultValue="Block A, Tower 1"
                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-semibold text-[#0f2336] focus:bg-white focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Priority Level</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl border-2 border-gray-100">
                    <button className="flex-1 py-2 text-sm font-bold rounded-lg text-gray-500 hover:text-gray-900 transition-colors">Normal</button>
                    <button className="flex-1 py-2 text-sm font-bold rounded-lg bg-white text-[#0f2336] shadow-sm">Critical</button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Attachments</label>
                  <div className="w-full h-[76px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <UploadCloud size={20} className="group-hover:-translate-y-1 transition-transform" />
                      <span className="text-sm font-semibold">Upload Photo</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3 relative z-10">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                className="px-8 py-3 text-sm font-bold text-white bg-[#0f2336] hover:bg-[#1a3857] rounded-xl transition-transform shadow-lg shadow-[#0f2336]/20 active:scale-95"
                onClick={() => setShowModal(false)}
              >
                Submit Ticket
              </button>
            </div>
            
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
