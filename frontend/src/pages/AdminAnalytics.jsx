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
  CheckCircle2,
  AlertCircle,
  X,
  UserCog,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Cell
} from 'recharts';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getAdminAdvancedAnalytics, downloadAnalyticsExport } from "@/api/analytics";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: true, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, active: false, href: "/admin/users" },
];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [amenityId, setAmenityId] = useState(null);
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    getAdminAdvancedAnalytics({ amenityId })
      .then(res => { setData(res.data); setError(""); })
      .catch(() => setError("Unable to load analytics."))
      .finally(() => setLoading(false));
  }, [amenityId, retryKey]);

  useEffect(() => {
    let timer;
    if (toast) {
      timer = setTimeout(() => setToast(null), 3000);
    }
    return () => clearTimeout(timer);
  }, [toast]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await downloadAnalyticsExport();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'analytics_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setToast({ type: "success", title: "Export complete", message: "Analytics report downloaded." });
    } catch {
      setToast({ type: "error", title: "Export failed", message: "Please try downloading the report again." });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="animate-spin text-[#0f2336]" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
        <div className="p-8">
          <div role="alert" className="text-red-500 font-bold">{error || "Failed to load"}</div>
          <button onClick={() => { setError(""); setLoading(true); setRetryKey((value) => value + 1); }} className="mt-4 px-4 py-2 bg-[#0f2336] text-white text-sm font-semibold rounded-lg">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 relative">
        
        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            {toast.type === "success" ? <CheckCircle2 className="text-emerald-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
            <div className="flex flex-col">
              <span className="font-bold text-sm">{toast.title}</span>
              <span className="text-xs text-gray-300">{toast.message}</span>
            </div>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)} className="ml-4 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Resource Optimization</h1>
            <p className="text-sm text-gray-500 mt-1">Analyze facility utilization and operational efficiency metrics.</p>
          </div>
          <button 
            disabled={exporting}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2336] disabled:opacity-50 hover:bg-[#16334f] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95"
          >
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Export Report
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Heatmap */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-[#0f2336]">Amenity Utilization Heatmap</h3>
              <select
                aria-label="Select amenity"
                value={amenityId ?? data.selected_amenity_id ?? ""}
                disabled={!data.amenities.length}
                onChange={(event) => { setLoading(true); setAmenityId(Number(event.target.value)); }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors disabled:cursor-not-allowed"
              >
                {!data.amenities.length && <option value="">No active amenities</option>}
                {data.amenities.map((amenity) => <option key={amenity.id} value={amenity.id}>{amenity.name}</option>)}
              </select>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-4 py-4">
              {data.heatmap.map((dayData) => (
                <div key={dayData.date} className="flex gap-4">
                  <div className="w-8 flex items-center justify-end text-xs font-bold text-gray-400">{dayData.day}</div>
                  <div className="flex-1 grid grid-cols-7 gap-2">
                    {dayData.slots.map((slot, j) => {
                      let bgColor = "bg-[#5f8787]/10";
                      if (slot.value === 1) bgColor = "bg-[#5f8787]/30";
                      if (slot.value === 2) bgColor = "bg-[#5f8787]";
                      if (slot.value >= 3) bgColor = "bg-[#0f2336]";
                      return <div key={j} title={`${dayData.day} ${slot.label}: ${slot.bookings} booking(s)`} className={`h-8 rounded-sm ${bgColor}`}></div>;
                    })}
                  </div>
                </div>
              ))}
              {!data.heatmap.length && <p className="text-sm text-gray-500 text-center py-12">No active amenity is available for utilization analytics.</p>}
            </div>
            
            <div className="flex justify-end items-center gap-2 mt-8">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Low</span>
              <div className="w-4 h-4 rounded-sm bg-[#5f8787]/10"></div>
              <div className="w-4 h-4 rounded-sm bg-[#5f8787]/30"></div>
              <div className="w-4 h-4 rounded-sm bg-[#5f8787]"></div>
              <div className="w-4 h-4 rounded-sm bg-[#0f2336]"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">High</span>
            </div>
          </div>

          {/* Financial Efficiency */}
          <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between items-center text-center">
            <h3 className="text-lg font-bold text-[#0f2336] self-start w-full text-left mb-4">Financial Efficiency</h3>
            
            <div className="w-full h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="70%" 
                  outerRadius="100%" 
                  barSize={16} 
                  data={[{ name: 'ratio', value: data.financial.ratio, fill: '#0f2336' }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar 
                    minAngle={15} 
                    background={{ fill: '#f3f4f6' }} 
                    clockWise 
                    dataKey="value" 
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-4xl font-extrabold text-[#0f2336]">{data.financial.ratio}%</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Collection Ratio</div>
              </div>
            </div>
            
            <div className="flex justify-around w-full mt-4">
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#0f2336]"></div>
                  <span className="text-xs font-bold text-gray-500">Collections</span>
                </div>
                <div className="font-bold text-sm text-[#0f2336]">{data.financial.collections}</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#5f8787]/30"></div>
                  <span className="text-xs font-bold text-gray-500">OpEx</span>
                </div>
                <div className="font-bold text-sm text-[#0f2336]">{data.financial.opex}</div>
              </div>
            </div>
          </div>

          {/* Predictive Maintenance */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-[#0f2336] mb-6">Predictive Maintenance (Pareto)</h3>
            <div className="flex-1 w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pareto} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.pareto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0f2336' : index === 1 ? '#4a6572' : index === 2 ? '#5f8787' : index === 3 ? '#a8c0c0' : '#e5e7eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Provider Performance */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0f2336]">Service Provider Performance</h3>
              {data.vendors.length > 5 && <button onClick={() => setShowAllVendors((value) => !value)} className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">{showAllVendors ? "Show Less" : "View All"}</button>}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                  <tr>
                    <th className="px-6 md:px-8 py-4">Provider Name</th>
                    <th className="px-6 md:px-8 py-4">Service Type</th>
                    <th className="px-6 md:px-8 py-4">Avg Resolution (hrs)</th>
                    <th className="px-6 md:px-8 py-4">SLA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(showAllVendors ? data.vendors : data.vendors.slice(0, 5)).map((v) => (
                    <tr key={v.id} className={`transition-colors ${
                      v.sla.includes('Warning') ? 'bg-orange-50/30' :
                      v.sla.includes('Escalated') ? 'bg-red-50/30' : 'hover:bg-gray-50/50'
                    }`}>
                      <td className="px-6 md:px-8 py-5 font-semibold text-[#0f2336]">{v.name}</td>
                      <td className="px-6 md:px-8 py-5 text-gray-500">{v.type}</td>
                      <td className={`px-6 md:px-8 py-5 font-medium ${
                        v.res === '12.5' ? 'text-red-500' :
                        v.res === '24.0+' ? 'text-red-600 font-bold' : 'text-gray-700'
                      }`}>{v.res}</td>
                      <td className="px-6 md:px-8 py-5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          v.sla === 'Within SLA' ? 'bg-blue-50 text-blue-600' :
                          v.sla.includes('Warning') ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' :
                          'bg-red-500 text-white shadow-md shadow-red-500/20'
                        }`}>
                          {v.sla}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!data.vendors.length && <tr><td colSpan="4" className="px-8 py-10 text-center text-gray-500">No assigned service providers yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
