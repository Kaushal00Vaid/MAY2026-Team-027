import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { Download, AlertTriangle, CreditCard, Filter, CheckCircle2, X } from "lucide-react";

const transactions = [
  { id: "TX-101", date: "2023-10-01", desc: "October HOA Assessment", category: "Maintenance", amount: -1200.00, status: "UNPAID" },
  { id: "TX-102", date: "2023-10-01", desc: "Late Fee Assessment", category: "Penalty", amount: -45.00, status: "UNPAID" },
  { id: "TX-103", date: "2023-09-15", desc: "Payment Received - ACH", category: "Payment", amount: 1200.00, status: "CLEARED" },
  { id: "TX-104", date: "2023-09-01", desc: "September HOA Assessment", category: "Maintenance", amount: -1200.00, status: "SETTLED" },
  { id: "TX-105", date: "2023-08-20", desc: "Clubhouse Reservation Fee", category: "Amenities", amount: -150.00, status: "SETTLED" },
  { id: "TX-106", date: "2023-08-15", desc: "Payment Received - Credit Card", category: "Payment", amount: 1350.00, status: "CLEARED" },
];

export default function ResidentFinancials() {
  const [filter, setFilter] = useState("all");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const handlePayment = () => {
    setPaymentSuccess(true);
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentSuccess(false);
      setShowToast(true);
    }, 1500);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "UNPAID": return "bg-red-100 text-red-700 border border-red-200";
      case "CLEARED": return "bg-blue-100 text-blue-700 border border-blue-200";
      case "SETTLED": return "bg-gray-100 text-gray-700 border border-gray-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/finance")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Action Successful</span>
              <span className="text-xs text-gray-300">Your request has been processed.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              
              {!paymentSuccess ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                    <CreditCard size={32} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-[#0f2336] mb-2">Make a Payment</h2>
                  <p className="text-gray-500 text-sm mb-6">You are about to pay the current outstanding balance.</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center mb-6">
                    <span className="font-semibold text-gray-600">Total Due</span>
                    <span className="text-2xl font-extrabold text-[#0f2336]">$1,245.00</span>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <label className="flex items-center gap-3 p-4 border-2 border-blue-500 bg-blue-50 rounded-xl cursor-pointer">
                      <input type="radio" name="payment" defaultChecked className="w-4 h-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[#0f2336]">Bank Account (ACH)</span>
                        <span className="text-xs text-gray-500">Checking ending in 9901</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border-2 border-gray-100 hover:border-gray-300 bg-white rounded-xl cursor-pointer transition-colors">
                      <input type="radio" name="payment" className="w-4 h-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[#0f2336]">Credit Card</span>
                        <span className="text-xs text-gray-500">Visa ending in 4242 (+ 2.9% fee)</span>
                      </div>
                    </label>
                  </div>
                  
                  <button onClick={handlePayment} className="w-full py-4 bg-[#0f2336] hover:bg-[#1a365d] text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                    Confirm Payment of $1,245.00
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in-90">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-[#0f2336] mb-2">Payment Successful!</h2>
                  <p className="text-gray-500 text-sm">Your payment of $1,245.00 has been processed.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Ledger & Billing</h1>
            <p className="text-gray-500 mt-2">Manage your unit's financial standing and payment history.</p>
          </div>
          <button onClick={() => setShowToast(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95">
            <Download size={16} /> Statement
          </button>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          
          {/* Balance Card */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110"></div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Balance Due</h3>
                <AlertTriangle size={18} className="text-red-500 animate-pulse" />
              </div>
              <div className="text-4xl font-extrabold text-[#0f2336] mb-2">$1,245.00</div>
              <p className="text-sm text-gray-500">Includes $45.00 late fee from prior cycle.</p>
            </div>
            
            <div className="mt-8 flex items-center justify-between">
              <span className="text-sm font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100">Due: Oct 15</span>
              <button onClick={() => setShowPaymentModal(true)} className="px-5 py-2.5 bg-[#0f2336] hover:bg-[#1a365d] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2">
                <CreditCard size={16} /> Pay Now
              </button>
            </div>
          </div>

          {/* Allocation/Chart Card */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Expense Allocation (YTD)</h3>
                <button className="text-gray-400 hover:text-gray-700">...</button>
             </div>
             
             {/* Creative visual representation instead of generic bar chart */}
             <div className="flex h-32 items-end gap-3 px-2">
                {[
                  { label: "Maintenance", val: 80, color: "bg-blue-500" },
                  { label: "Amenities", val: 20, color: "bg-emerald-400" },
                  { label: "Utilities", val: 45, color: "bg-purple-400" },
                  { label: "Sp. Assmnt", val: 60, color: "bg-orange-400" },
                  { label: "Parking", val: 30, color: "bg-gray-400" }
                ].map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="w-full relative rounded-t-xl bg-gray-50 flex items-end justify-center overflow-hidden h-full group-hover:bg-gray-100 transition-colors">
                      <div className={`w-full rounded-t-xl ${item.color} transition-all duration-1000 ease-out group-hover:opacity-80`} style={{ height: `${item.val}%` }}></div>
                      <span className="absolute bottom-2 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{item.val}%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-500 tracking-wider truncate w-full text-center">{item.label}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
            <h2 className="text-lg font-bold text-[#0f2336]">Transaction Ledger</h2>
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none min-w-[180px] shadow-sm cursor-pointer"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="payments">Payments Only</option>
                <option value="charges">Charges Only</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{tx.date}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#0f2336] group-hover:text-primary transition-colors">{tx.desc}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tx.category}</td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${tx.amount > 0 ? 'text-emerald-600' : 'text-[#0f2336]'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination mockup */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 bg-gray-50/30">
            <span>Showing 1 to 6 of 24 entries</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50">Prev</button>
              <button className="px-3 py-1 rounded-md bg-primary text-white font-medium shadow-sm">1</button>
              <button className="px-3 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50">2</button>
              <button className="px-3 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
