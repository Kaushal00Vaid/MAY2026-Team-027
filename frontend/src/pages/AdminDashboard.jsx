import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  TrendingUp,
  ArrowRight,
  UserCog,
  Loader2
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getFinanceLedger } from "@/features/finance/api";
import { downloadAnalyticsExport, getAdminAnalytics } from "@/api/analytics";
import { useAuth } from "@/hooks/useAuth";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, active: false, href: "/admin/users" },
];

function RevenueChart({ data }) {
  if (!data?.length) return <div className="h-full grid place-items-center text-sm text-gray-400">No revenue data available.</div>;

  const width = 600;
  const height = 190;
  const padding = 24;
  const maximum = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (data.length - 1);
    const y = height - padding - ((Number(item.value) || 0) / maximum) * (height - padding * 2);
    return { ...item, x, y };
  });
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;

  return (
    <div className="h-full flex flex-col" role="img" aria-label="Monthly revenue trend">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full flex-1" preserveAspectRatio="none">
        <defs><linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity="0.3"/><stop offset="95%" stopColor="#4f46e5" stopOpacity="0"/></linearGradient></defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => <line key={ratio} x1={padding} x2={width - padding} y1={height - padding - ratio * (height - padding * 2)} y2={height - padding - ratio * (height - padding * 2)} stroke="#f3f4f6" strokeDasharray="4 4"/>)}
        <polygon points={area} fill="url(#revenueArea)"/>
        <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((point) => <circle key={point.name} cx={point.x} cy={point.y} r="5" fill="#4f46e5"><title>{point.name}: ₹{Number(point.value).toLocaleString("en-IN")}</title></circle>)}
      </svg>
      <div className="flex justify-between px-2 text-xs text-gray-500">{data.map((item) => <span key={item.name}>{item.name}</span>)}</div>
    </div>
  );
}




export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState(null);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [months, setMonths] = useState(6);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const visibleSidebarItems = sidebarItems.filter((item) => item.href !== "/admin/users" || isSuperAdmin);
  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : userRoles.includes("admin")
      ? "Residential Admin"
      : "Committee Member";

  useEffect(() => {
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError("");

    getAdminAnalytics({ months })
      .then((res) => {
        if (active) setAnalytics(res.data);
      })
      .catch(() => {
        if (active) setAnalyticsError("Unable to load dashboard analytics.");
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });

    return () => { active = false; };
  }, [months]);

  const exportReport = async () => {
    if (exporting) return;
    setExporting(true); setExportMessage("");
    try {
      const response = await downloadAnalyticsExport();
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "societysync-analytics.csv";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setExportMessage("Analytics report downloaded.");
    } catch {
      setExportMessage("Report download failed. Please try again.");
    } finally { setExporting(false); }
  };

  useEffect(() => {
    let active = true;
    setTxLoading(true);
    setTxError(null);

    setTransactions([]);
    const direction = activeTab === "all" ? undefined : activeTab;
    getFinanceLedger(1, 10, direction)
      .then((res) => {
        if (!active) return;
        const mapped = res.data.items.map((tx) => ({
          id: tx.id,
          unit: tx.unit || tx.description,
          category: tx.category,
          direction: tx.direction,
          amount: `${tx.direction === "credit" ? "Cr" : "Dr"} ${tx.amount_display}`,
          date: new Date(tx.date).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }));
        setTransactions(mapped);
      })
      .catch(() => {
        if (active) setTxError("Failed to load transactions.");
      })
      .finally(() => {
        if (active) setTxLoading(false);
      });

    return () => { active = false; };
  }, [activeTab]);

  return (
    <DashboardLayout sidebarItems={visibleSidebarItems} userRole={roleLabel}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Society Overview</h1>
          </div>
          <button disabled={exporting} onClick={exportReport} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 text-gray-700 text-sm font-semibold rounded-xl transition-all active:scale-95">
            {exporting ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />}
            {exporting ? "Exporting…" : "Export Report"}
          </button>
        </div>

        {analyticsError && <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm font-semibold text-red-600">{analyticsError}</div>}
        {exportMessage && <div role="status" className={`p-4 rounded-xl border text-sm font-semibold ${exportMessage.includes("failed") ? "bg-red-50 border-red-100 text-red-600" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>{exportMessage}</div>}
        {analyticsLoading && <div role="status" className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={16}/>Refreshing dashboard metrics…</div>}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <button type="button" onClick={() => navigate("/admin/finance")} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between text-left">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Collections</div>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Building size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#0f2336]">₹{analytics?.stats?.current_collections?.amount?.toLocaleString("en-IN") || 0}</div>
              <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1 bg-emerald-50 w-fit px-2 py-1 rounded-md">
                <TrendingUp size={14} />
                {(analytics?.stats?.current_collections?.percentage_change || 0) > 0 ? "+" : ""}{analytics?.stats?.current_collections?.percentage_change?.toFixed(1) || 0}% vs last month
              </div>
            </div>
          </button>

          {/* Card 2 */}
          <button type="button" onClick={() => navigate("/admin/helpdesk")} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between text-left">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Complaints</div>
              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-extrabold text-[#0f2336]">{analytics?.stats?.active_complaints?.total || 0}</div>
              <div className="mb-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse border border-red-100">
                {analytics?.stats?.active_complaints?.high_priority || 0} High Priority
              </div>
            </div>
          </button>

          {/* Card 3 */}
          <button type="button" onClick={() => navigate("/admin/security")} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between text-left">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visitors at Gate</div>
              <div className="p-2 bg-purple-50 text-purple-500 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <UserCheck size={18} />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#0f2336]">{analytics?.stats?.visitors_at_gate?.awaiting_approval || 0}</div>
              <div className="text-xs text-purple-600 font-bold mt-2 bg-purple-50 w-fit px-2 py-1 rounded-md">
                Awaiting Approval
              </div>
            </div>
          </button>

          {/* Card 4 */}
          <button type="button" onClick={() => navigate("/admin/amenities")} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col justify-between relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full -z-10"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider z-10">Amenity Utilization</div>
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors z-10">
                <CalendarCheck size={18} />
              </div>
            </div>
            <div className="z-10">
              <div className="text-3xl font-extrabold text-[#0f2336] flex items-baseline gap-2">
                {Math.round(analytics?.stats?.clubhouse_occupancy?.percentage || 0)}% <span className="text-sm font-medium text-gray-400">{analytics?.stats?.clubhouse_occupancy?.booked || 0}/{analytics?.stats?.clubhouse_occupancy?.capacity || 0} slots</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${analytics?.stats?.clubhouse_occupancy?.percentage || 0}%` }}></div>
              </div>
            </div>
          </button>
        </div>

        {/* SLA Alert */}
        {analytics?.sla_alerts?.length > 0 && (
          <div className="bg-[#1e1e24] rounded-2xl shadow-lg p-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
            <div className="bg-[#2a2a32]/90 backdrop-blur-sm rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border border-white/5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                  <AlertTriangle className="text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">SLA Breach Alert</h3>
                  <p className="text-sm text-gray-300 mt-0.5">{analytics.sla_alerts.length} open complaint(s) have passed their resolution deadline.</p>
                  
                  <div className="mt-4 flex flex-col gap-2">
                    {analytics.sla_alerts.map((alert) => (
                      <div key={alert.ticket_id} className="p-3 bg-black/40 rounded-lg border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-[320px]">
                        <div>
                          <div className="text-xs font-mono text-gray-400">{alert.ticket_id}</div>
                          <div className="text-sm font-semibold text-gray-200 mt-0.5">{alert.title}</div>
                        </div>
                        <div className="px-3 py-1.5 bg-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider rounded border border-red-500/30 animate-pulse">
                          OVERDUE BY {alert.overdue_by_mins}M
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => navigate("/admin/helpdesk")} className="text-sm font-semibold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors self-start sm:self-center">
                Resolve Now
              </button>
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Financial Snapshot - RECHARTS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0f2336]">Revenue Trend</h3>
                  <p className="text-xs text-gray-500 mt-1">Monthly collection overview (last {months} months)</p>
                </div>
                <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                  <option value={12}>Last 12 Months</option>
                  <option value={6}>Last 6 Months</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <RevenueChart data={analytics?.revenue_trend || []}/>
              </div>
            </div>

            {/* Recent Transactions with Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[#0f2336]">Recent Transactions</h3>
                
                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                  {["all", "credit", "debit"].map((tab) => (
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
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group cursor-default">
                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.direction === "credit" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                            {tx.direction === "credit" ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                          </div>
                          {tx.unit}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{tx.category}</td>
                        <td className="px-6 py-4 text-gray-400 text-xs">{tx.date}</td>
                        <td className={`px-6 py-4 text-right font-bold ${tx.direction === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                          {tx.amount}
                        </td>
                      </tr>
                    ))}
                    {txLoading && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm animate-pulse">
                          Loading transactions…
                        </td>
                      </tr>
                    )}
                    {txError && !txLoading && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-red-500 text-sm">
                          {txError}
                        </td>
                      </tr>
                    )}
                    {!txLoading && !txError && transactions.length === 0 && (
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
              {(analytics?.activity_feed?.length || 0) > 4 && (
                <button onClick={() => setShowAllActivity((value) => !value)} aria-expanded={showAllActivity} className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1 group">
                  {showAllActivity ? "Show Recent" : "View All"} <ArrowRight size={14} className={`transition-transform ${showAllActivity ? "rotate-90" : "group-hover:translate-x-1"}`} />
                </button>
              )}
            </div>
            
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
              {analytics?.activity_feed?.slice(0, showAllActivity ? analytics.activity_feed.length : 4).map((item, idx) => (
                <div key={idx} className="relative pl-6 group">
                  {item.type === 'security' && (
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-blue-500 group-hover:scale-125 transition-transform"></span>
                  )}
                  {item.type === 'helpdesk' && (
                    <span className="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={10} className="text-white" />
                    </span>
                  )}
                  {item.type === 'amenities' && (
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white bg-gray-300 group-hover:scale-125 transition-transform"></span>
                  )}
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{item.time_ago}</div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">{item.title}</span> {item.description}
                  </div>
                </div>
              ))}
              {(!analytics?.activity_feed || analytics.activity_feed.length === 0) && (
                <div className="text-sm text-gray-500 pl-6">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
