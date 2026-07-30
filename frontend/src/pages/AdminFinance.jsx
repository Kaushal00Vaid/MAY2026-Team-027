import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Download,
  FileText,
  ChevronDown,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: true, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
];

const allocationData = [
  { name: 'Security', value: 40, color: '#0f2336' },
  { name: 'Maintenance', value: 30, color: '#5f8787' },
  { name: 'Reserves', value: 20, color: '#d87943' },
  { name: 'Events', value: 10, color: '#fbcb97' },
];

const ledgerData = [
  { id: "#TRX-9901", date: "Oct 12", desc: "Monthly HOA Dues - Unit 4B", category: "Revenue", debit: null, credit: "+$450.00", balance: "$124,550.00" },
  { id: "#TRX-9900", date: "Oct 11", desc: "Landscaping Services (Vendor)", category: "Expense", debit: "-$1,200.00", credit: null, balance: "$124,100.00" },
  { id: "#TRX-9899", date: "Oct 10", desc: "Sep Maintenance - Unit 12A", note: "+ Staggered Penalty ($50.25) applied", category: "Receivable", debit: null, credit: null, balance: "$125,300.00", highlight: true },
  { id: "#TRX-9898", date: "Oct 09", desc: "Pool Maintenance Q3", category: "Expense", debit: "-$850.00", credit: null, balance: "$125,300.00" },
  { id: "#TRX-9897", date: "Oct 08", desc: "Clubhouse Booking - Smith", category: "Revenue", debit: null, credit: "+$150.00", balance: "$126,150.00" },
  { id: "#TRX-9896", date: "Oct 07", desc: "Monthly HOA Dues - Unit 2C", category: "Revenue", debit: null, credit: "+$450.00", balance: "$126,000.00" },
];

export default function AdminFinance() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: "", desc: "" });

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleAction = (title, desc) => {
    setToastMessage({ title, desc });
    setShowToast(true);
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        
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

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Financial Management</h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive ledger and fund allocation oversight.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleAction("Download Started", "Audit report is downloading.")} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95">
              <Download size={16} />
              Download Annual Audit
            </button>
            <button onClick={() => handleAction("Generating Invoices", "Bulk generation process has started.")} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2336] hover:bg-[#16334f] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95">
              <FileText size={16} />
              Generate Bulk Invoices
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Col: Transparency Report (Donut) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110"></div>
              
              <div className="flex items-center justify-between mb-8 z-10">
                <h3 className="text-xl font-bold text-[#0f2336]">Society Transparency Report</h3>
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-50 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] relative z-10">
                <div className="w-full h-[280px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        stroke="none"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            style={{
                              filter: activeIndex === index ? `drop-shadow(0px 0px 8px ${entry.color}60)` : 'none',
                              transform: activeIndex === index ? 'scale(1.02)' : 'scale(1)',
                              transformOrigin: 'center',
                              transition: 'all 0.3s ease'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#0f2336', fontWeight: 600 }}
                        formatter={(value) => [`${value}%`, 'Allocation']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Reserve</div>
                    <div className="text-3xl font-extrabold text-[#0f2336]">$1.24M</div>
                  </div>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="space-y-4 mt-8 z-10">
                {allocationData.map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-[#0f2336]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Master Ledger */}
          <div className="xl:col-span-8 flex flex-col">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                <h3 className="text-xl font-bold text-[#0f2336]">Master Ledger</h3>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                    <span className="text-sm font-medium text-gray-700">This Month</span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                  <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm">
                    <Filter size={16} />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Txn ID</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Debit</th>
                      <th className="px-6 py-4 text-right">Credit</th>
                      <th className="px-6 py-4 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ledgerData.map((row, i) => (
                      <tr 
                        key={i} 
                        className={`transition-colors group ${
                          row.highlight 
                            ? 'bg-red-50/30 hover:bg-red-50/50 relative' 
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <td className="px-6 py-5 text-gray-500 font-medium relative">
                          {row.highlight && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                          )}
                          {row.date}
                        </td>
                        <td className="px-6 py-5 font-mono text-gray-400 text-xs">{row.id}</td>
                        <td className="px-6 py-5">
                          <div className={`font-semibold ${row.highlight ? 'text-red-600 flex items-center gap-1.5' : 'text-gray-900'}`}>
                            {row.highlight && <AlertTriangle size={14} />}
                            {row.desc}
                          </div>
                          {row.note && <div className="text-[11px] text-red-500 mt-1 font-medium">{row.note}</div>}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            row.category === 'Revenue' ? 'bg-gray-100 text-gray-600' :
                            row.category === 'Expense' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-medium text-gray-500">
                          {row.debit || '-'}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-emerald-600">
                          {row.credit || '-'}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-[#0f2336]">
                          {row.balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white mt-auto">
                <span className="text-sm text-gray-500 font-medium pl-2">Showing 1-6 of 248 entries</span>
                <div className="flex gap-1">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f2336] text-white font-semibold text-sm">
                    1
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 text-gray-600 font-medium text-sm transition-colors">
                    2
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 text-gray-600 font-medium text-sm transition-colors">
                    3
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
