import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, CalendarCheck, CheckCircle2, ChevronLeft,
  ChevronRight, Download, FileText, Headset, LayoutDashboard, Loader2,
  ShieldCheck, UserCog, Users, WalletCards, X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import {
  downloadAnnualAudit, financeError, generateBulkInvoices, getAdminFinance,
  getFinanceLedger, saveBlob,
} from "@/features/finance/api";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: true, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, href: "/admin/amenities" },
  { label: "Community", icon: Users, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, href: "/admin/users" },
];

const defaultForm = () => {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  return { period, purpose: "Monthly Maintenance", amount: "1200", due_date: `${period}-15` };
};

export default function AdminFinance() {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState({ items: [], total: 0, page: 1, page_size: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, ledgerResponse] = await Promise.all([
        getAdminFinance(), getFinanceLedger(page, 10),
      ]);
      setSummary(summaryResponse.data);
      setLedger(ledgerResponse.data);
    } catch (requestError) {
      setError(financeError(requestError, "Unable to load financial records."));
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Data fetching intentionally initializes screen state from the API.

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(["finance"], load);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const audit = async () => {
    setBusy(true);
    try {
      saveBlob(await downloadAnnualAudit(), "societysync-annual-audit.pdf");
      setToast("Annual audit downloaded.");
    } catch (requestError) { setError(financeError(requestError, "Audit download failed.")); }
    finally { setBusy(false); }
  };

  const submitBulk = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await generateBulkInvoices({
        period: form.period, purpose: form.purpose.trim(),
        amount_paise: Math.round(Number(form.amount) * 100), due_date: form.due_date,
      }, crypto.randomUUID());
      setShowBulk(false);
      setToast(`${response.data.created_count} invoice(s) generated successfully.`);
      setForm(defaultForm());
      setPage(1);
      await load();
    } catch (requestError) { setError(financeError(requestError, "Invoice generation failed.")); }
    finally { setBusy(false); }
  };

  const pages = Math.max(1, Math.ceil(ledger.total / ledger.page_size));
  const allocations = summary?.allocations || [];
  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        {toast && <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"><CheckCircle2 className="text-emerald-400" size={20}/><span className="font-bold text-sm">{toast}</span><button onClick={() => setToast("")}><X size={16}/></button></div>}
        {showBulk && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={submitBulk} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="flex justify-between"><div><h2 className="text-2xl font-extrabold text-[#0f2336]">Generate Bulk Invoices</h2><p className="text-sm text-gray-500">Creates one invoice per active resident flat.</p></div><button type="button" onClick={() => setShowBulk(false)}><X/></button></div>
            <label className="block text-sm font-semibold">Billing period<input required type="month" value={form.period} onChange={(e) => setForm({...form, period:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Purpose<input required maxLength={150} value={form.purpose} onChange={(e) => setForm({...form, purpose:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Amount (INR)<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({...form, amount:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Due date<input required type="date" value={form.due_date} onChange={(e) => setForm({...form, due_date:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            {error && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}
            <button disabled={busy} className="w-full py-3 bg-[#0f2336] text-white rounded-xl font-bold disabled:opacity-50">{busy ? "Generating…" : "Generate invoices"}</button>
          </form>
        </div>}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div><h1 className="text-3xl font-extrabold text-[#0f2336]">Financial Management</h1><p className="text-sm text-gray-500 mt-1">Comprehensive ledger and fund allocation oversight.</p></div>
          <div className="flex gap-3"><button disabled={busy} onClick={audit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border rounded-xl text-sm font-semibold"><Download size={16}/>Download Annual Audit</button><button onClick={() => { setError(""); setShowBulk(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-semibold"><FileText size={16}/>Generate Bulk Invoices</button></div>
        </div>
        {error && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 flex justify-between"><span>{error}</span><button onClick={load} className="font-bold">Retry</button></div>}
        {loading ? <div className="h-72 flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/>Loading finance data…</div> : <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 bg-white p-6 md:p-8 rounded-3xl border shadow-sm">
            <h3 className="text-xl font-bold text-[#0f2336]">Society Transparency Report</h3>
            <div className="h-[280px] relative"><ResponsiveContainer><PieChart><Pie data={allocations} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value">{allocations.map((entry) => <Cell key={entry.name} fill={entry.color}/>)}</Pie><Tooltip formatter={(value) => [`${value}%`, "Allocation"]}/></PieChart></ResponsiveContainer><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-[11px] font-bold text-gray-400 uppercase">Total Reserve</span><span className="text-2xl font-extrabold text-[#0f2336]">{summary?.total_reserve_display}</span></div></div>
            <div className="grid grid-cols-2 gap-3 mb-5"><div className="bg-orange-50 rounded-xl p-3"><div className="text-xs text-gray-500">Outstanding</div><b>{summary?.outstanding_display}</b></div><div className="bg-red-50 rounded-xl p-3"><div className="text-xs text-gray-500">Overdue invoices</div><b>{summary?.defaulter_count}</b></div></div>
            {allocations.map((item) => <div key={item.name} className="flex justify-between py-2"><span className="flex items-center gap-2"><i className="w-3 h-3 rounded-sm" style={{background:item.color}}/>{item.name}</span><b>{item.value}%</b></div>)}
          </div>
          <div className="xl:col-span-8 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b"><h3 className="text-xl font-bold text-[#0f2336]">Master Ledger</h3><p className="text-sm text-gray-500">Collected this month: {summary?.collected_this_month_display}</p></div>
            <div className="overflow-x-auto flex-1"><table className="w-full text-sm text-left whitespace-nowrap"><thead className="text-[11px] uppercase bg-gray-50"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Txn ID</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Unit</th><th className="px-6 py-4 text-right">Debit</th><th className="px-6 py-4 text-right">Credit</th></tr></thead><tbody className="divide-y">{ledger.items.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-6 py-5">{new Date(row.date).toLocaleDateString("en-IN")}</td><td className="px-6 py-5 font-mono text-xs">{row.reference}</td><td className="px-6 py-5"><b>{row.description}</b><div className="text-xs text-gray-400">{row.category}</div></td><td className="px-6 py-5">{row.unit || "—"}</td><td className="px-6 py-5 text-right">{row.direction === "debit" ? row.amount_display : "—"}</td><td className="px-6 py-5 text-right text-emerald-600 font-bold">{row.direction === "credit" ? row.amount_display : "—"}</td></tr>)}{!ledger.items.length && <tr><td colSpan="6" className="p-12 text-center text-gray-500">No ledger entries yet. Generate invoices to begin.</td></tr>}</tbody></table></div>
            <div className="p-4 border-t flex justify-between"><span className="text-sm text-gray-500">{ledger.total} entries</span><div className="flex items-center gap-2"><button aria-label="Previous page" disabled={page===1} onClick={() => setPage(page-1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft size={16}/></button><span className="text-sm">Page {page} of {pages}</span><button aria-label="Next page" disabled={page>=pages} onClick={() => setPage(page+1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight size={16}/></button></div></div>
          </div>
        </div>}
      </div>
    </DashboardLayout>
  );
}
