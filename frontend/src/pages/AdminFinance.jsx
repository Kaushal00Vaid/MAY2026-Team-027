import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3, CalendarCheck, CheckCircle2, ChevronLeft,
  ChevronRight, Download, FileText, Headset, LayoutDashboard, Loader2,
  ShieldCheck, UserCog, Users, WalletCards, X, AlertTriangle, Plus,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import {
  createExpense, downloadAnnualAudit, financeError, generateBulkInvoices,
  getAdminFinance, getFinanceLedger, saveBlob,
} from "@/features/finance/api";
import { useAuth } from "@/hooks/useAuth";

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

export const defaultForm = (now = new Date()) => {
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  return { period, purpose: "Monthly Maintenance", amount: "1200", due_date: `${period}-15` };
};

const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const defaultExpenseForm = () => ({ vendor: "", category: "", description: "", amount: "", expense_date: localDate() });

export default function AdminFinance() {
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState({ items: [], total: 0, page: 1, page_size: 10 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [showBulk, setShowBulk] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [bulkError, setBulkError] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const loadRequest = useRef(0);
  const bulkRequest = useRef(null);
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const visibleSidebarItems = sidebarItems.filter((item) => item.href !== "/admin/users" || isSuperAdmin);
  const roleLabel = isSuperAdmin ? "Super Admin" : userRoles.includes("admin") ? "Residential Admin" : "Committee Member";

  const load = useCallback(async (targetPage = page) => {
    const requestId = ++loadRequest.current;
    setLoading(true);
    setError("");
    try {
      const [summaryResponse, ledgerResponse] = await Promise.all([
        getAdminFinance(), getFinanceLedger(targetPage, 10),
      ]);
      if (requestId !== loadRequest.current) return;
      setSummary(summaryResponse.data);
      setLedger(ledgerResponse.data);
    } catch (requestError) {
      if (requestId === loadRequest.current) setError(financeError(requestError, "Unable to load financial records."));
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [page]);

  // Data fetching intentionally initializes screen state from the API.

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { loadRequest.current += 1; }, []);
  useRealtimeRefresh(["finance"], load);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const audit = async () => {
    const year = new Date().getFullYear();
    setAuditBusy(true);
    setError("");
    try {
      saveBlob(await downloadAnnualAudit(year), `societysync-annual-audit-${year}.pdf`);
      setToastTone("success");
      setToast(`${year} annual audit downloaded.`);
    } catch (requestError) { setError(financeError(requestError, "Audit download failed.")); }
    finally { setAuditBusy(false); }
  };

  const submitBulk = async (event) => {
    event.preventDefault();
    setBusy(true);
    setBulkError("");
    try {
      const payload = {
        period: form.period, purpose: form.purpose.trim(),
        amount_paise: Math.round(Number(form.amount) * 100), due_date: form.due_date,
      };
      const fingerprint = JSON.stringify(payload);
      if (bulkRequest.current?.fingerprint !== fingerprint) {
        bulkRequest.current = { fingerprint, key: crypto.randomUUID() };
      }
      const response = await generateBulkInvoices(payload, bulkRequest.current.key);
      bulkRequest.current = null;
      setShowBulk(false);
      setToastTone(response.data.created_count > 0 ? "success" : "warning");
      setToast(response.data.message || `${response.data.created_count} invoice(s) generated.`);
      setForm(defaultForm());
      if (page === 1) await load(1);
      else setPage(1);
    } catch (requestError) { setBulkError(financeError(requestError, "Invoice generation failed.")); }
    finally { setBusy(false); }
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setBusy(true);
    setExpenseError("");
    try {
      await createExpense({
        vendor: expenseForm.vendor.trim(),
        category: expenseForm.category.trim(),
        description: expenseForm.description.trim(),
        amount_paise: Math.round(Number(expenseForm.amount) * 100),
        expense_date: expenseForm.expense_date,
      });
      setShowExpense(false);
      setExpenseForm(defaultExpenseForm());
      setToastTone("success");
      setToast("Expense recorded in the Master Ledger.");
      if (page === 1) await load(1);
      else setPage(1);
    } catch (requestError) { setExpenseError(financeError(requestError, "Expense recording failed.")); }
    finally { setBusy(false); }
  };

  const changePeriod = (period) => {
    const earliest = `${period}-01`;
    setForm((current) => ({
      ...current,
      period,
      due_date: current.due_date < earliest ? `${period}-15` : current.due_date,
    }));
  };

  const pages = Math.max(1, Math.ceil(ledger.total / ledger.page_size));
  const allocations = summary?.allocations || [];
  return (
    <DashboardLayout sidebarItems={visibleSidebarItems} userRole={roleLabel}>
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        {toast && <div role="status" className={`fixed bottom-6 right-6 max-w-md text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 ${toastTone === "warning" ? "bg-amber-700" : "bg-[#0f2336]"}`}>{toastTone === "warning" ? <AlertTriangle className="text-amber-200" size={20}/> : <CheckCircle2 className="text-emerald-400" size={20}/>}<span className="font-bold text-sm">{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={16}/></button></div>}
        {showExpense && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="expense-title">
          <form onSubmit={submitExpense} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="flex justify-between gap-4"><h2 id="expense-title" className="text-2xl font-extrabold text-[#0f2336]">Record Expense</h2><button type="button" aria-label="Close expense form" disabled={busy} onClick={() => setShowExpense(false)}><X/></button></div>
            <label className="block text-sm font-semibold">Vendor<input required maxLength={150} disabled={busy} value={expenseForm.vendor} onChange={(e) => setExpenseForm({...expenseForm, vendor:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Category<input required maxLength={100} disabled={busy} value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Description<textarea required maxLength={2000} disabled={busy} value={expenseForm.description} onChange={(e) => setExpenseForm({...expenseForm, description:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3 min-h-24"/></label>
            <label className="block text-sm font-semibold">Amount (INR)<input required min="0.01" step="0.01" type="number" disabled={busy} value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Expense date<input required type="date" disabled={busy} value={expenseForm.expense_date} onChange={(e) => setExpenseForm({...expenseForm, expense_date:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            {expenseError && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{expenseError}</p>}
            <button disabled={busy} className="w-full py-3 bg-[#0f2336] text-white rounded-xl font-bold disabled:opacity-50">{busy ? "Recording…" : "Record expense"}</button>
          </form>
        </div>}
        {showBulk && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={submitBulk} className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-5" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
            <div className="flex justify-between gap-4"><h2 id="bulk-title" className="text-2xl font-extrabold text-[#0f2336]">Generate Bulk Invoices</h2><button type="button" aria-label="Close bulk invoice form" disabled={busy} onClick={() => setShowBulk(false)}><X/></button></div>
            <label className="block text-sm font-semibold">Billing period<input required type="month" disabled={busy} value={form.period} onChange={(e) => changePeriod(e.target.value)} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Purpose<input required maxLength={150} disabled={busy} value={form.purpose} onChange={(e) => setForm({...form, purpose:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Amount (INR)<input required min="0.01" step="0.01" type="number" disabled={busy} value={form.amount} onChange={(e) => setForm({...form, amount:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            <label className="block text-sm font-semibold">Due date<input required min={`${form.period}-01`} type="date" disabled={busy} value={form.due_date} onChange={(e) => setForm({...form, due_date:e.target.value})} className="mt-2 w-full border rounded-xl px-4 py-3"/></label>
            {bulkError && <p role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{bulkError}</p>}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900"><b>Review before generating:</b> This posts receivable debits to the Master Ledger. The operation cannot be undone from this screen.</div>
            <button disabled={busy} className="w-full py-3 bg-[#0f2336] text-white rounded-xl font-bold disabled:opacity-50">{busy ? "Generating…" : "Generate invoices"}</button>
          </form>
        </div>}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-[#0f2336]">Financial Management</h1>
          <div className="flex flex-wrap gap-3"><button disabled={auditBusy} onClick={audit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border rounded-xl text-sm font-semibold disabled:opacity-50">{auditBusy ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>} {auditBusy ? "Preparing Audit…" : `Download ${new Date().getFullYear()} Annual Audit`}</button><button disabled={busy} onClick={() => { setExpenseError(""); setShowExpense(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border rounded-xl text-sm font-semibold disabled:opacity-50"><Plus size={16}/>Record Expense</button><button disabled={busy} onClick={() => { setBulkError(""); setShowBulk(true); }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-semibold disabled:opacity-50"><FileText size={16}/>Generate Bulk Invoices</button></div>
        </div>
        {error && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 flex justify-between"><span>{error}</span><button onClick={() => load(page)} className="font-bold">Retry</button></div>}
        {loading ? <div className="h-72 flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/>Loading finance data…</div> : <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-4 bg-white p-6 md:p-8 rounded-3xl border shadow-sm">
            <h3 className="text-xl font-bold text-[#0f2336]">Society Transparency Report</h3>
            <div className="h-[280px] relative">{allocations.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocations} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value">{allocations.map((entry) => <Cell key={entry.name} fill={entry.color}/>)}</Pie><Tooltip formatter={(value) => [`${value}%`, "Allocation"]}/></PieChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-gray-400">No fund allocations configured.</div>}<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">{allocations.length > 0 && <><span className="text-[11px] font-bold text-gray-400 uppercase">Total Reserve</span><span className="text-2xl font-extrabold text-[#0f2336]">{summary?.total_reserve_display}</span></>}</div></div>
            <div className="grid grid-cols-2 gap-3 mb-5"><div className="bg-orange-50 rounded-xl p-3"><div className="text-xs text-gray-500">Outstanding</div><b>{summary?.outstanding_display}</b></div><div className="bg-red-50 rounded-xl p-3"><div className="text-xs text-gray-500">Overdue invoices</div><b>{summary?.defaulter_count}</b></div></div>
            {!allocations.length && <p className="text-sm text-gray-500 text-center py-2">No fund allocations configured.</p>}
            {allocations.map((item) => <div key={item.name} className="flex justify-between py-2"><span className="flex items-center gap-2"><i className="w-3 h-3 rounded-sm" style={{background:item.color}}/>{item.name}</span><b>{item.value}%</b></div>)}
          </div>
          <div className="xl:col-span-8 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b"><h3 className="text-xl font-bold text-[#0f2336]">Master Ledger</h3><p className="text-sm font-semibold text-gray-600 mt-2">Collected this month: {summary?.collected_this_month_display}</p></div>
            <div className="overflow-x-auto flex-1"><table className="w-full text-sm text-left whitespace-nowrap"><thead className="text-[11px] uppercase bg-gray-50"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Txn ID</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Unit</th><th className="px-6 py-4 text-right">Debit</th><th className="px-6 py-4 text-right">Credit</th></tr></thead><tbody className="divide-y">{ledger.items.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-6 py-5">{new Date(row.date).toLocaleDateString("en-IN")}</td><td className="px-6 py-5 font-mono text-xs">{row.reference}</td><td className="px-6 py-5"><b>{row.description}</b><div className="text-xs text-gray-400">{row.category}</div></td><td className="px-6 py-5">{row.unit || "—"}</td><td className="px-6 py-5 text-right">{row.direction === "debit" ? row.amount_display : "—"}</td><td className="px-6 py-5 text-right text-emerald-600 font-bold">{row.direction === "credit" ? row.amount_display : "—"}</td></tr>)}{!ledger.items.length && <tr><td colSpan="6" className="p-12 text-center text-gray-500">No ledger entries yet. Generate invoices to begin.</td></tr>}</tbody></table></div>
            <div className="p-4 border-t flex justify-between"><span className="text-sm text-gray-500">{ledger.total} entries</span><div className="flex items-center gap-2"><button aria-label="Previous page" disabled={page===1} onClick={() => setPage(page-1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronLeft size={16}/></button><span className="text-sm">Page {page} of {pages}</span><button aria-label="Next page" disabled={page>=pages} onClick={() => setPage(page+1)} className="p-2 border rounded-lg disabled:opacity-40"><ChevronRight size={16}/></button></div></div>
          </div>
        </div>}
      </div>
    </DashboardLayout>
  );
}
