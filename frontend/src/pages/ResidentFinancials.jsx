import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CreditCard, Download, Filter, Loader2, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import {
  completePayment, downloadReceipt, downloadStatement, financeError,
  getResidentFinance, saveBlob,
} from "@/features/finance/api";

export default function ResidentFinancials() {
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showPaymentModal, setShowPaymentModal] = useState(location.state?.action === "pay");
  const [method, setMethod] = useState("bank");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setSummary((await getResidentFinance()).data); }
    catch (requestError) { setError(financeError(requestError, "Unable to load your financial records.")); }
    finally { setLoading(false); }
  }, []);
  // Data fetching intentionally initializes screen state from the API.

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(["finance"], load);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const payable = summary?.invoices
    .filter((invoice) => ["issued", "overdue"].includes(invoice.status))
    .reduce((earliest, invoice) => (
      !earliest || invoice.due_date < earliest.due_date ? invoice : earliest
    ), null);
  const entries = useMemo(() => (summary?.ledger || []).filter((row) =>
    filter === "all" || (filter === "payments" ? row.direction === "credit" : row.direction === "debit")
  ), [summary, filter]);

  const pay = async () => {
    if (!payable) return;
    setBusy(true); setError("");
    try {
      const response = await completePayment({ invoice_id: payable.id, method, simulate_failure: false }, crypto.randomUUID());
      setShowPaymentModal(false);
      setToast(`Payment successful. Receipt ${response.data.receipt_number} is ready.`);
      await load();
    } catch (requestError) { setError(financeError(requestError, "Payment could not be completed.")); }
    finally { setBusy(false); }
  };
  const statement = async () => {
    setBusy(true);
    try { saveBlob(await downloadStatement(), "societysync-statement.pdf"); setToast("Statement downloaded."); }
    catch (requestError) { setError(financeError(requestError, "Statement download failed.")); }
    finally { setBusy(false); }
  };
  const receipt = async (paymentId) => {
    setBusy(true);
    try { saveBlob(await downloadReceipt(paymentId), `societysync-receipt-${paymentId}.pdf`); }
    catch (requestError) { setError(financeError(requestError, "Receipt download failed.")); }
    finally { setBusy(false); }
  };

  return <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/finance")} userRole="Resident Portal">
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      {toast && <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"><CheckCircle2 className="text-emerald-400" size={20}/><span className="font-bold text-sm">{toast}</span><button onClick={() => setToast("")}><X size={16}/></button></div>}
      {showPaymentModal && payable && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative"><button aria-label="Close payment" onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-gray-400"><X/></button><div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6"><CreditCard size={32}/></div><h2 className="text-2xl font-extrabold text-[#0f2336]">Make a Payment</h2><p className="text-gray-500 text-sm mb-6">Invoice {payable.invoice_number}</p><div className="bg-gray-50 p-4 rounded-xl flex justify-between mb-6"><span className="font-semibold">Total Due</span><b className="text-2xl">{payable.amount_display}</b></div><div className="space-y-3 mb-8"><label className={`flex gap-3 p-4 border-2 rounded-xl cursor-pointer ${method==="bank"?"border-blue-500 bg-blue-50":"border-gray-100"}`}><input type="radio" name="payment-method" checked={method==="bank"} onChange={() => setMethod("bank")}/><span><b className="block text-sm">Bank Account</b></span></label><label className={`flex gap-3 p-4 border-2 rounded-xl cursor-pointer ${method==="card"?"border-blue-500 bg-blue-50":"border-gray-100"}`}><input type="radio" name="payment-method" checked={method==="card"} onChange={() => setMethod("card")}/><span><b className="block text-sm">Credit Card</b></span></label></div>{error && <p role="alert" className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}<button disabled={busy} onClick={pay} className="w-full py-4 bg-[#0f2336] text-white rounded-xl font-bold disabled:opacity-50">{busy ? "Processing…" : `Confirm Payment of ${payable.amount_display}`}</button></div></div>}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold text-[#0f2336]">Ledger & Billing</h1><p className="text-gray-500 mt-2">Manage your unit&apos;s financial standing and payment history.</p></div><button disabled={busy} onClick={statement} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-semibold disabled:opacity-50"><Download size={16}/>Statement</button></div>
      {error && <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 flex justify-between"><span>{error}</span><button onClick={load} className="font-bold">Retry</button></div>}
      {loading ? <div role="status" className="h-72 flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/>Loading your finances…</div> : summary ? <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-between"><div><div className="flex justify-between mb-4"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Balance Due</h3>{summary.outstanding_paise > 0 && <AlertTriangle size={18} className="text-red-500"/>}</div><div className="text-4xl font-extrabold text-[#0f2336] mb-2">{summary.outstanding_display}</div><p className="text-sm text-gray-500">Includes {summary.late_fee_display} in applicable staggered late fees.</p></div><div className="mt-8 flex items-center justify-between"><span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">{summary.next_due_date ? `Due: ${new Date(`${summary.next_due_date}T00:00:00`).toLocaleDateString("en-IN")}` : "No payment due"}</span><button disabled={!payable} onClick={() => { setError(""); setShowPaymentModal(true); }} className="px-5 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-semibold disabled:opacity-40"><CreditCard size={16} className="inline mr-2"/>Pay Now</button></div></div>
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border shadow-sm"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Expense Allocation</h3>{summary.allocations.length ? <div className="flex h-32 items-end gap-3 px-2">{summary.allocations.map((item) => <div key={item.name} className="flex-1 flex flex-col items-center gap-2 h-full"><div className="w-full bg-gray-50 rounded-t-xl flex items-end h-full"><div className="w-full rounded-t-xl" style={{height:`${item.value}%`,backgroundColor:item.color}}/></div><span className="text-[10px] font-semibold text-gray-500 truncate w-full text-center">{item.name}</span></div>)}</div> : <div className="h-32 flex items-center justify-center text-sm text-gray-500">No allocation data available.</div>}</div>
        </div>
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden"><div className="p-6 border-b flex flex-col sm:flex-row justify-between gap-4"><h2 className="text-lg font-bold text-[#0f2336]">Transaction Ledger</h2><div className="relative"><Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><select value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9 pr-4 py-2 border rounded-xl text-sm"><option value="all">All Transactions</option><option value="payments">Payments Only</option><option value="charges">Charges Only</option></select></div></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-gray-50"><th className="px-6 py-4">Date</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Category</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4">Status</th></tr></thead><tbody className="divide-y">{entries.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm">{new Date(row.date).toLocaleDateString("en-IN")}</td><td className="px-6 py-4 font-bold">{row.description}</td><td className="px-6 py-4 text-gray-500">{row.category}</td><td className={`px-6 py-4 text-right font-bold ${row.direction==="credit"?"text-emerald-600":"text-[#0f2336]"}`}>{row.direction==="credit"?"+":"−"}{row.amount_display}</td><td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${row.direction==="credit"?"bg-blue-100 text-blue-700":"bg-gray-100"}`}>{row.direction==="credit"?"CLEARED":"CHARGED"}</span>{row.payment_id && <button disabled={busy} onClick={() => receipt(row.payment_id)} className="ml-2 text-xs text-blue-600 underline">Receipt</button>}</td></tr>)}{!entries.length && <tr><td colSpan="5" className="p-12 text-center text-gray-500">No transactions match this filter.</td></tr>}</tbody></table></div></div>
      </> : null}
    </div>
  </DashboardLayout>;
}
