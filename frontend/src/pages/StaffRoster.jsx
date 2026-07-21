import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { Users, CalendarClock, Plus, Filter, FileText, CheckCircle2, X, Clock, UserCheck, Phone } from "lucide-react";

export default function StaffRoster() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [shiftForm, setShiftForm] = useState({ name: "", role: "Security", shift: "Morning (06:00 - 14:00)", days: "" });

  const [roster, setRoster] = useState([
    { id: "S-104", name: "David Miller", role: "Security Officer", shift: "Morning (06:00 - 14:00)", days: "Mon-Fri", status: "Active" },
    { id: "M-202", name: "Sarah Jenkins", role: "Plumber", shift: "General (09:00 - 17:00)", days: "Mon-Sat", status: "Active" },
    { id: "G-305", name: "John Davis", role: "Gardener", shift: "Morning (06:00 - 14:00)", days: "Tue-Sun", status: "On Leave" },
    { id: "S-106", name: "Michael Chang", role: "Security Guard", shift: "Night (22:00 - 06:00)", days: "Wed-Sun", status: "Active" },
  ]);

  const handleAssignShift = (e) => {
    e.preventDefault();
    if (!shiftForm.name) return;
    
    const newStaff = {
      id: `NEW-${Math.floor(Math.random() * 900) + 100}`,
      name: shiftForm.name,
      role: shiftForm.role,
      shift: shiftForm.shift,
      days: shiftForm.days || "Mon-Fri",
      status: "Active"
    };
    
    setRoster([newStaff, ...roster]);
    setShiftForm({ name: "", role: "Security", shift: "Morning (06:00 - 14:00)", days: "" });
    setShowAssignModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/roster")} userRole="HR & Scheduling" userName="Admin">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Shift Assigned</span>
              <span className="text-xs text-gray-300">The roster has been updated successfully.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Assign Shift Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowAssignModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <h3 className="font-bold text-[#0f2336] text-xl mb-6 flex items-center gap-2">
                <CalendarClock size={22} className="text-blue-500" /> Assign New Shift
              </h3>
              <form onSubmit={handleAssignShift} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Staff Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Emily Clark"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({...shiftForm, name: e.target.value})}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Role</label>
                    <select 
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                      value={shiftForm.role}
                      onChange={(e) => setShiftForm({...shiftForm, role: e.target.value})}
                    >
                      <option>Security</option>
                      <option>Maintenance</option>
                      <option>Cleaning</option>
                      <option>Gardening</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Working Days</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mon-Fri"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                      value={shiftForm.days}
                      onChange={(e) => setShiftForm({...shiftForm, days: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Shift Timing</label>
                  <select 
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    value={shiftForm.shift}
                    onChange={(e) => setShiftForm({...shiftForm, shift: e.target.value})}
                  >
                    <option>Morning (06:00 - 14:00)</option>
                    <option>General (09:00 - 17:00)</option>
                    <option>Evening (14:00 - 22:00)</option>
                    <option>Night (22:00 - 06:00)</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#0f2336] hover:bg-[#1a365d] text-white text-sm font-bold rounded-xl transition-all shadow-md mt-6 flex items-center justify-center gap-2">
                  <Plus size={18} /> Confirm Assignment
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] mb-2 tracking-tight relative inline-block">
              Staff Roster
              <svg className="absolute -top-4 -right-8 w-12 h-12 text-primary/40 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </h1>
            <p className="text-gray-500 mt-2">Manage shifts, attendance, and assignments for all tertiary staff members.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-bold hover:bg-[#1a365d] transition-all shadow-lg shadow-[#0f2336]/20 active:scale-95">
              <Plus size={16} /> Assign Shift
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <FileText size={16} /> Export Schedule
            </button>
          </div>
        </div>

        {/* Roster Table */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-gray-50/50 to-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
             
            <h2 className="text-xl font-bold text-[#0f2336] flex items-center gap-3 relative z-10">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Users size={20} />
              </div>
              Weekly Schedule
            </h2>
            <div className="flex gap-3 relative z-10 w-full sm:w-auto">
              <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center gap-2">
                <Filter size={16} /> <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Staff Member</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Shift Timing</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {roster.map((person) => (
                  <tr key={person.id} className="hover:bg-blue-50/20 transition-colors group/row">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 text-gray-500 font-bold text-sm">
                           {person.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-base text-[#0f2336] group-hover/row:text-blue-700 transition-colors mb-0.5">{person.name}</div>
                          <div className="text-xs text-gray-400 font-mono">ID: {person.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">{person.role}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-sm font-bold text-[#0f2336] mb-1 flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> {person.shift}</div>
                      <div className="text-xs text-gray-500 font-medium">Days: {person.days}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider ${person.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <UserCheck size={18} />
                       </button>
                       <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors ml-1">
                          <Phone size={18} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
