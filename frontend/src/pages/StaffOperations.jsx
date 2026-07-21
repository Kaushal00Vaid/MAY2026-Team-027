import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { Map, ListTodo, PackageSearch, Filter, Plus, FileText, CheckCircle2, TreePine, Wrench, X } from "lucide-react";

export default function StaffOperations() {
  const [filter, setFilter] = useState("all");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: "", loc: "" });

  const [dailyTasks, setDailyTasks] = useState([
    { id: 1, title: "Lawn Mowing - Sector 1", loc: "Completed 08:30 AM • John D.", done: true },
    { id: 2, title: "Fertilizer Application", loc: "Rose Garden, Zone B", tag: "Pending", tagColor: "bg-orange-400 text-white", done: false },
    { id: 3, title: "Sprinkler Check", loc: "All Zones", done: false },
    { id: 4, title: "Pool Deck Cleaning", loc: "Clubhouse Exterior", done: false },
  ]);

  const toggleTask = (id) => {
    setDailyTasks(dailyTasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskForm.title) return;
    setDailyTasks([...dailyTasks, { id: Date.now(), title: newTaskForm.title, loc: newTaskForm.loc, done: false }]);
    setNewTaskForm({ title: "", loc: "" });
    setShowNewTaskModal(false);
  };

  const inventory = [
    { name: "NPK Fertilizer 20-20-20", cat: "Gardening", stock: "45 kg", date: "01 Mar 2024", status: "OPTIMAL" },
    { name: "Heavy Duty Bleach", cat: "Janitorial", stock: "2 Gal", date: "15 Feb 2024", status: "LOW STOCK" },
    { name: "Pruning Shears", cat: "Tools", stock: "12 units", date: "10 Nov 2023", status: "OPTIMAL" },
    { name: "Pesticide Spray", cat: "Gardening", stock: "5 Ltr", date: "20 Feb 2024", status: "REORDER SOON" },
  ];

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/operations")} userRole="Operations Command" userName="M. Torres">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Operations & Gardening</h1>
            <p className="text-gray-500 mt-2">Real-time status of society grounds and inventory.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNewTaskModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0f2336] text-white rounded-xl text-sm font-semibold hover:bg-[#1a365d] transition-all shadow-md active:scale-95">
              <Plus size={16} /> New Task
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <FileText size={16} /> Report
            </button>
          </div>
        </div>

        {/* New Task Modal */}
        {showNewTaskModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowNewTaskModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <h3 className="font-bold text-[#0f2336] text-lg mb-4 flex items-center gap-2">
                <ListTodo size={18} /> New Daily Task
              </h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Empty Trash Bins"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                    value={newTaskForm.title}
                    onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Location / Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Park Area"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                    value={newTaskForm.loc}
                    onChange={(e) => setNewTaskForm({...newTaskForm, loc: e.target.value})}
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-[#0f2336] hover:bg-[#1a365d] text-white text-sm font-bold rounded-xl transition-all shadow-md mt-2">
                  Add Task
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Top Grid: Map & Tasks */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">

          {/* Zone Map Status (Creative CSS Layout) */}
          <div className="xl:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Map size={20} className="text-emerald-500" />
                Zone Map Status
              </h2>
              <div className="flex items-center gap-4 text-xs font-bold text-gray-600">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-400 shadow-sm"></div> Clear</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm"></div> Attention</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div> Critical</span>
              </div>
            </div>

            {/* Detailed Inline SVG Map */}
            <div className="flex-1 bg-[#f8fafc] rounded-2xl border border-gray-100 p-2 min-h-[350px] relative overflow-hidden flex items-center justify-center group">
               {/* Faint Grid Background */}
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
               
               <div className="relative w-full h-full min-h-[300px]">
                 <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-xl" preserveAspectRatio="xMidYMid meet">
                   <defs>
                     <pattern id="grass" width="20" height="20" patternUnits="userSpaceOnUse">
                       <rect width="20" height="20" fill="#f0fdf4" />
                       <circle cx="10" cy="10" r="1" fill="#bbf7d0" />
                     </pattern>
                     <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                       <feGaussianBlur stdDeviation="8" result="blur" />
                       <feComposite in="SourceGraphic" in2="blur" operator="over" />
                     </filter>
                   </defs>
                   
                   {/* Base Ground */}
                   <rect x="20" y="20" width="760" height="360" rx="20" fill="url(#grass)" stroke="#e2e8f0" strokeWidth="4" />
                   
                   {/* Roads/Pathways */}
                   <path d="M 20 200 L 780 200 M 400 20 L 400 380 M 200 20 L 200 380 M 600 20 L 600 380" stroke="#f1f5f9" strokeWidth="24" strokeLinecap="round" />
                   
                   {/* Zone Overlays */}
                   
                   {/* Zone A (Residential) - Clear */}
                   <g className="cursor-pointer transition-opacity hover:opacity-80">
                     <rect x="40" y="40" width="140" height="140" rx="10" fill="#60a5fa" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
                     <rect x="60" y="60" width="100" height="60" rx="4" fill="#cbd5e1" />
                     <rect x="60" y="130" width="100" height="30" rx="4" fill="#cbd5e1" />
                     <text x="110" y="85" textAnchor="middle" fill="#0f2336" fontSize="14" fontWeight="bold">Block A</text>
                     <circle cx="160" cy="60" r="12" fill="#3b82f6" />
                     <text x="160" y="64" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">A</text>
                   </g>

                   {/* Zone B (Garden) - Attention (Pruning) */}
                   <g className="cursor-pointer" filter="url(#glow)">
                     <rect x="220" y="40" width="160" height="140" rx="10" fill="#f97316" fillOpacity="0.15" stroke="#f97316" strokeWidth="3" />
                     <circle cx="300" cy="110" r="40" fill="#4ade80" fillOpacity="0.4" />
                     <circle cx="260" cy="80" r="25" fill="#4ade80" fillOpacity="0.6" />
                     <circle cx="340" cy="80" r="25" fill="#4ade80" fillOpacity="0.6" />
                     <circle cx="280" cy="140" r="15" fill="#4ade80" fillOpacity="0.5" />
                     <circle cx="320" cy="140" r="15" fill="#4ade80" fillOpacity="0.5" />
                     <rect x="260" y="100" width="80" height="30" rx="15" fill="white" shadow="sm" />
                     <text x="300" y="120" textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">Pruning Req.</text>
                     <circle cx="360" cy="60" r="12" fill="#f97316" />
                     <text x="360" y="64" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">B</text>
                   </g>
                   
                   {/* Zone C (Residential) - Clear */}
                   <g className="cursor-pointer transition-opacity hover:opacity-80">
                     <rect x="420" y="40" width="160" height="140" rx="10" fill="#60a5fa" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
                     <rect x="450" y="60" width="100" height="60" rx="4" fill="#cbd5e1" />
                     <rect x="450" y="130" width="100" height="30" rx="4" fill="#cbd5e1" />
                     <text x="500" y="85" textAnchor="middle" fill="#0f2336" fontSize="14" fontWeight="bold">Block B</text>
                     <circle cx="560" cy="60" r="12" fill="#3b82f6" />
                     <text x="560" y="64" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">C</text>
                   </g>

                   {/* Zone D (Clubhouse/Pool) - Clear */}
                   <g className="cursor-pointer transition-opacity hover:opacity-80">
                     <rect x="220" y="220" width="360" height="140" rx="10" fill="#60a5fa" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" />
                     <rect x="250" y="240" width="140" height="100" rx="8" fill="#cbd5e1" />
                     <rect x="420" y="260" width="120" height="60" rx="30" fill="#38bdf8" fillOpacity="0.6" stroke="#0ea5e9" strokeWidth="2" />
                     <text x="320" y="295" textAnchor="middle" fill="#0f2336" fontSize="16" fontWeight="bold">Clubhouse</text>
                     <text x="480" y="295" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Pool</text>
                     <circle cx="560" cy="240" r="12" fill="#3b82f6" />
                     <text x="560" y="244" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">D</text>
                   </g>

                   {/* Zone E (Main Gate) - Critical */}
                   <g className="cursor-pointer" filter="url(#glow)">
                     <rect x="40" y="220" width="140" height="140" rx="10" fill="#ef4444" fillOpacity="0.15" stroke="#ef4444" strokeWidth="3" />
                     <rect x="80" y="260" width="60" height="60" rx="8" fill="#cbd5e1" />
                     <rect x="70" y="280" width="80" height="20" fill="#94a3b8" />
                     <text x="110" y="340" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">Gate Issue</text>
                     <circle cx="160" cy="240" r="12" fill="#ef4444" />
                     <text x="160" y="244" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">E</text>
                   </g>

                   {/* Decorative elements */}
                   <circle cx="650" cy="80" r="20" fill="#cbd5e1" />
                   <circle cx="720" cy="120" r="30" fill="#cbd5e1" />
                   <circle cx="680" cy="280" r="25" fill="#cbd5e1" />
                   <circle cx="740" cy="320" r="15" fill="#cbd5e1" />
                   <text x="700" y="205" textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="bold" transform="rotate(-90 700 205)">PARKING AREA</text>

                 </svg>
               </div>
            </div>
          </div>

          {/* Daily Tasks */}
          <div className="xl:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <ListTodo size={20} className="text-blue-500" />
                Daily Tasks
              </h2>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mar 14</span>
            </div>

            <div className="space-y-3">
              {dailyTasks.map(t => (
                <div key={t.id} onClick={() => toggleTask(t.id)} className="flex gap-4 p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors group cursor-pointer">
                  <div className="pt-0.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${t.done ? 'bg-[#0f2336] border-[#0f2336] text-white' : 'border-gray-300 text-transparent group-hover:border-blue-400'}`}>
                      <CheckCircle2 size={14} strokeWidth={3} className={t.done ? "opacity-100" : "opacity-0"} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-bold text-sm mb-1 transition-colors ${t.done ? 'text-gray-400 line-through' : 'text-[#0f2336] group-hover:text-blue-600'}`}>{t.title}</h3>
                      {t.tag && <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm ${t.tagColor}`}>{t.tag}</span>}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{t.loc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Logbook */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
            <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
              <PackageSearch size={20} className="text-purple-500" />
              Inventory Logbook
            </h2>
            <div className="flex gap-3">
              <div className="relative">
                <PackageSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search supplies..."
                  className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                />
              </div>
              <button className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm">
                <Filter size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3">Item Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock Level</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Restocked</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inventory.map((item, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          {item.cat === 'Gardening' ? <TreePine size={14} className="text-emerald-600" /> : <Wrench size={14} className="text-gray-500" />}
                        </div>
                        <span className="font-bold text-sm text-[#0f2336] group-hover:text-blue-600 transition-colors">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">{item.cat}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${item.status === 'LOW STOCK' ? 'text-red-500' : item.status === 'REORDER SOON' ? 'text-orange-500' : 'text-[#0f2336]'}`}>
                      {item.stock}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{item.date}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${item.status === 'OPTIMAL' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        item.status === 'LOW STOCK' ? 'bg-red-500 text-white shadow-sm' :
                          'bg-orange-400 text-white shadow-sm'
                        }`}>
                        {item.status}
                      </span>
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
