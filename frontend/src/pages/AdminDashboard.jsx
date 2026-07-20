import { useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Download,
  AlertTriangle,
  Building,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
];

const revenueData = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 },
  { name: 'May', value: 6000 },
  { name: 'Jun', value: 5500 },
  { name: 'Jul', value: 7000 },
];

const transactions = [
  { id: 1, unit: "A-102", category: "Maintenance", amount: "+$240.00", type: "income", date: "Today, 10:30 AM" },
  { id: 2, unit: "Vendor-04", category: "Plumbing Repair", amount: "-$120.00", type: "expense", date: "Today, 09:15 AM" },
  { id: 3, unit: "C-305", category: "Late Fee", amount: "+$25.00", type: "income", date: "Yesterday" },
  { id: 4, unit: "Vendor-12", category: "Lift AMC", amount: "-$850.00", type: "expense", date: "Yesterday" },
  { id: 5, unit: "B-401", category: "Maintenance", amount: "+$240.00", type: "income", date: "Oct 12" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === "income") return t.type === "income";
    if (activeTab === "expenses") return t.type === "expense";
    return true;
  });

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Society Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time metrics for Green Valley Residency.</p>
          </div>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm text-gray-700 text-sm font-semibold rounded-xl transition-all active:scale-95">
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Collections</div>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Building size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#0f2336]">$124k</div>
              <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                <TrendingUp size={14} />
                +8.2% vs last month
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Complaints</div>
              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-extrabold text-[#0f2336]">12</div>
              <div className="mb-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse border border-red-100">
                2 High Priority
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visitors at Gate</div>
              <div className="p-2 bg-purple-50 text-purple-500 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <UserCheck size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#0f2336]">5</div>
              <div className="text-xs text-purple-600 font-bold mt-2 bg-purple-50 w-fit px-2 py-1 rounded-md">
                Awaiting Approval
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full -z-10"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider z-10">Clubhouse Occupancy</div>
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors z-10">
                <CalendarCheck size={18} />
              </div>
            </div>
            <div className="z-10">
              <div className="text-3xl font-extrabold text-[#0f2336] flex items-baseline gap-2">
                80% <span className="text-sm font-medium text-gray-400">/ 100 max</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: "80%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Alert */}
        <div className="bg-[#1e1e24] rounded-2xl shadow-lg p-1 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
          <div className="bg-[#2a2a32]/90 backdrop-blur-sm rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border border-white/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                <AlertTriangle className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">SLA Breach Alert</h3>
                <p className="text-sm text-gray-400 mt-0.5">2 tickets require immediate attention.</p>
                
                <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-[320px]">
                  <div>
                    <div className="text-xs font-mono text-gray-400">#TK-8924</div>
                    <div className="text-sm font-semibold text-gray-200 mt-0.5">Water Leakage in Block B</div>
                  </div>
                  <div className="px-3 py-1.5 bg-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider rounded border border-red-500/30 animate-pulse">
                    OVERDUE BY 45M
                  </div>
                </div>
              </div>
            </div>
            <button className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors self-start sm:self-center">
              Resolve Now
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Financial Snapshot - RECHARTS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0f2336]">Revenue Trend</h3>
                  <p className="text-xs text-gray-500 mt-1">Monthly collection overview (last 6 months)</p>
                </div>
                <select className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                  <option>This Year</option>
                  <option>Last 6 Months</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      itemStyle={{ color: '#0f2336', fontWeight: 600 }}
                      formatter={(value) => [`$${value}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Transactions with Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[#0f2336]">Recent Transactions</h3>
                
                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                  {["all", "income", "expenses"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                        activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Unit / Vendor</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group cursor-default">
                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {tx.type === 'income' ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                          </div>
                          {tx.unit}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{tx.category}</td>
                        <td className="px-6 py-4 text-gray-400 text-xs">{tx.date}</td>
                        <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.amount}
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          No transactions found for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Activity Feed Sidebar */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit sticky top-24">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-[#0f2336]">Activity Feed</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 group">
                View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
              <div className="relative pl-6 group">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-500 group-hover:scale-125 transition-transform"></span>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Just Now</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-900">Main Gate</span> approved visitor entry for Unit B-204.
                </div>
              </div>

              <div className="relative pl-6 group">
                <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={10} className="text-white" />
                </span>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">20 mins ago</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-900">Helpdesk</span> resolved ticket #TK-8920 (Electrical).
                </div>
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                  "Replaced hallway bulb on 4th floor."
                </div>
              </div>

              <div className="relative pl-6 group">
                <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white bg-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle size={10} className="text-white" />
                </span>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">1 hour ago</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <span className="font-semibold text-red-600">System Alert:</span> SLA breached for ticket #TK-8924.
                </div>
              </div>

              <div className="relative pl-6 group">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-gray-300 group-hover:scale-125 transition-transform"></span>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">3 hours ago</div>
                <div className="text-sm text-gray-700 leading-relaxed">
                  Clubhouse booking confirmed for Unit A-101.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
