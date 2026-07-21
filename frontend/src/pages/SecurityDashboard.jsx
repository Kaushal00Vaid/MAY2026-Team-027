import { useState, useEffect } from "react";
import {
  LogOut,
  QrCode,
  Truck,
  History,
  AlertTriangle,
  ArrowRightToLine,
  ArrowLeftFromLine,
  Phone,
  XCircle,
  ScanLine,
  CheckCircle2
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";

const initialActions = [
  { id: 1, type: "timeout", unit: "712", title: "Approval Timeout", desc: "Resident has not responded to access request for 'Food Delivery'.", time: "4m ago" }
];

const initialFeed = [
  { id: 1, t: "14:32", e: "Unit 402 - Uber", type: "Entry", in: true },
  { id: 2, t: "14:28", e: "Res. Smith (B-12)", type: "Exit", in: false },
  { id: 3, t: "14:15", e: "Amazon Delivery", type: "Entry", in: true },
  { id: 4, t: "14:05", e: "Unit 101 - Guest", type: "Exit", in: false },
  { id: 5, t: "13:50", e: "Res. Lee (A-04)", type: "Entry", in: true },
];

export default function SecurityDashboard() {
  const [pin, setPin] = useState("");
  const [actions, setActions] = useState(initialActions);
  const [feed, setFeed] = useState(initialFeed);
  const [scanning, setScanning] = useState(true);

  const handlePinPress = (val) => {
    if (pin.length < 4) {
      setPin(prev => prev + val);
    }
  };

  const clearPin = () => setPin("");

  const submitPin = () => {
    if (pin.length === 4) {
      // Simulate success entry
      setFeed([{ id: Date.now(), t: "Just Now", e: `PIN Entry - Guest`, type: "Entry", in: true, highlight: true }, ...feed]);
      setPin("");
    }
  };

  const removeAction = (id) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const [visitorForm, setVisitorForm] = useState({ name: "", unit: "", block: "", phone: "", purpose: "Guest / Friend" });
  const [requestLoading, setRequestLoading] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUnit, setManualUnit] = useState("");

  const handleRequestApproval = () => {
    if (!visitorForm.name || !visitorForm.unit) return;
    setRequestLoading(true);
    setTimeout(() => {
      setActions([{ 
        id: Date.now(), 
        type: "approval", 
        unit: `${visitorForm.block ? visitorForm.block + '-' : ''}${visitorForm.unit}`, 
        title: "Approval Requested", 
        desc: `Waiting for resident to approve ${visitorForm.name} for ${visitorForm.purpose}.`, 
        time: "Just Now" 
      }, ...actions]);
      setVisitorForm({ name: "", unit: "", block: "", phone: "", purpose: "Guest / Friend" });
      setRequestLoading(false);
    }, 1500);
  };

  const handleManualEntrySubmit = (e) => {
    e.preventDefault();
    if (!manualUnit) return;
    setFeed([{ id: Date.now(), t: "Just Now", e: `Manual Entry - ${manualUnit}`, type: "Entry", in: true, highlight: true }, ...feed]);
    setManualUnit("");
    setShowManualModal(false);
  };

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate")} userRole="Gate 1 - North" userName="R. Davis">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto min-h-full animate-in fade-in duration-500">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: PIN Pad */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#1a2d48] text-white p-6 rounded-3xl border border-[#0f1a2b] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/5 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-lg font-bold relative inline-block">
                  Pre-Approved PIN
                  <svg className="absolute -top-3 -right-6 w-8 h-8 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </h3>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                  <div className="w-2 h-2 bg-white/20 rounded-full"></div>
                </div>
              </div>
              
              <div className="bg-[#0f1a2b] rounded-2xl h-20 mb-8 flex items-center justify-center gap-4 border border-white/5 shadow-inner relative z-10">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    pin.length > i ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'bg-white/10'
                  }`}></div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 relative z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    onClick={() => handlePinPress(num.toString())}
                    className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-2xl font-semibold text-white active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={clearPin}
                  className="h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 flex items-center justify-center transition-all"
                >
                  <XCircle size={28} />
                </button>
                <button 
                  onClick={() => handlePinPress("0")}
                  className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-2xl font-semibold text-white active:scale-95 transition-all"
                >
                  0
                </button>
                <button 
                  onClick={submitPin}
                  className={`h-16 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-lg ${
                    pin.length === 4 
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30' 
                      : 'bg-white/5 border-white/10 text-white/30'
                  }`}
                >
                  <CheckCircle2 size={28} />
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column: Scanner & Unscheduled */}
          <div className="lg:col-span-4 space-y-6">
            {/* Digital ID */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center group">
              <div className="w-full flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0f2336]">Resident Scanner</h3>
                <div className={`p-2 rounded-full transition-colors ${scanning ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'}`}>
                  <ScanLine size={20} />
                </div>
              </div>
              
              <div className="w-56 h-56 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 mb-8 relative flex items-center justify-center overflow-hidden">
                {/* Scanner Animation Line */}
                {scanning && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite_alternate] z-20"></div>
                )}
                
                <div className="w-24 h-24 bg-gray-200 grid grid-cols-2 gap-1.5 p-1.5 opacity-30">
                  <div className="bg-gray-400 rounded-sm"></div><div className="bg-gray-400 rounded-sm"></div>
                  <div className="bg-gray-400 rounded-sm"></div><div className="bg-gray-400 rounded-sm"></div>
                </div>
                
                {/* Scanner corners */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg z-10 transition-colors"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg z-10 transition-colors"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg z-10 transition-colors"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg z-10 transition-colors"></div>
              </div>
              
              <p className="text-xs text-center text-gray-500 mb-4 px-6 leading-relaxed">Present digital ID to the terminal scanner or enter unit number manually below.</p>
              
              <button onClick={() => setShowManualModal(true)} className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95">
                Manual Unit Entry
              </button>
            </div>
          </div>

          {/* Manual Entry Modal */}
          {showManualModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setShowManualModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
                  <XCircle size={20} />
                </button>
                <h3 className="font-bold text-[#0f2336] text-lg mb-4 flex items-center gap-2">
                  <ScanLine size={18} /> Manual Entry
                </h3>
                <form onSubmit={handleManualEntrySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Unit / Tag Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A-101"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase" 
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="w-full py-3 bg-[#0f2336] hover:bg-[#1a365d] text-white text-sm font-bold rounded-xl transition-all shadow-md">
                    Log Entry
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Right Column: Actions & Feed */}
          <div className="lg:col-span-4 space-y-6">
            {/* Pending Actions */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-sm font-bold text-[#0f2336]">Pending Approvals</h3>
                {actions.length > 0 && (
                  <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce">
                    {actions.length}
                  </span>
                )}
              </div>
              
              <div className="p-3 bg-gray-50/30 flex-1 flex flex-col gap-3 max-h-[300px] overflow-y-auto">
                {actions.map(action => (
                  <div key={action.id} className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm relative overflow-hidden animate-in slide-in-from-right-4">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-red-500" />
                        <span className="text-sm font-bold text-gray-900">Unit {action.unit} - {action.title}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded">{action.time}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-4">{action.desc}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1 transition-colors">
                        <Phone size={12} /> Intercom
                      </button>
                      <button 
                        onClick={() => removeAction(action.id)}
                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                      >
                        Deny Entry
                      </button>
                    </div>
                  </div>
                ))}
                {actions.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm font-medium">
                    No pending actions. You're all caught up!
                  </div>
                )}
              </div>
            </div>

            {/* Recent Gate Activity */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-[#0f2336]">Live Gate Feed</h3>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div> Live
                </div>
              </div>
              
              <div className="space-y-1">
                {feed.map((row) => (
                  <div key={row.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${row.highlight ? 'bg-blue-50 border border-blue-100 animate-pulse' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-mono text-gray-400 w-12">{row.t}</div>
                      <div className={`text-sm font-semibold ${row.highlight ? 'text-blue-700' : 'text-gray-800'}`}>{row.e}</div>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                      row.in ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {row.in ? <ArrowRightToLine size={12} /> : <ArrowLeftFromLine size={12} />}
                      {row.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Spanning: Unscheduled Visitor Form */}
          <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm mt-[-1.5rem] lg:mt-0 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-32 -mt-32 opacity-50"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f2336] flex items-center gap-2">
                  <Truck size={20} className="text-blue-500" />
                  Unscheduled Visitor Check-in
                </h3>
                <p className="text-sm text-gray-500 mt-1">Require resident approval for entry.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Full Name</label>
                <input type="text" placeholder="e.g. Jane Doe" className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Target Unit / Block</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Blk A" className="w-1/3 h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-center uppercase" value={visitorForm.block} onChange={e => setVisitorForm({...visitorForm, block: e.target.value})} />
                  <input type="text" placeholder="Unit 402" className="w-2/3 h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={visitorForm.unit} onChange={e => setVisitorForm({...visitorForm, unit: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Phone Number <span className="text-gray-400 normal-case">(Optional)</span></label>
                <input type="text" placeholder="(555) 000-0000" className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={visitorForm.phone} onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Purpose of Visit</label>
                <select className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer" value={visitorForm.purpose} onChange={e => setVisitorForm({...visitorForm, purpose: e.target.value})}>
                  <option>Guest / Friend</option>
                  <option>Delivery</option>
                  <option>Maintenance</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 relative z-10">
              <button onClick={() => setVisitorForm({ name: "", unit: "", block: "", phone: "", purpose: "Guest / Friend" })} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95">
                Clear Form
              </button>
              <button onClick={handleRequestApproval} disabled={requestLoading} className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed">
                {requestLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <AlertTriangle size={16} />}
                {requestLoading ? "Sending..." : "Request Resident Approval"}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
