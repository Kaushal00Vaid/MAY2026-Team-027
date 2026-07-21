import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { PackageSearch, Filter, Plus, FileText, TreePine, Wrench, X, CheckCircle2, Package, Search } from "lucide-react";

export default function StaffInventory() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: "", cat: "Gardening", stock: "", status: "OPTIMAL" });
  const [showToast, setShowToast] = useState(false);

  const [inventory, setInventory] = useState([
    { id: 1, name: "NPK Fertilizer 20-20-20", cat: "Gardening", stock: "45 kg", date: "01 Mar 2024", status: "OPTIMAL" },
    { id: 2, name: "Heavy Duty Bleach", cat: "Janitorial", stock: "2 Gal", date: "15 Feb 2024", status: "LOW STOCK" },
    { id: 3, name: "Pruning Shears", cat: "Tools", stock: "12 units", date: "10 Nov 2023", status: "OPTIMAL" },
    { id: 4, name: "Pesticide Spray", cat: "Gardening", stock: "5 Ltr", date: "20 Feb 2024", status: "REORDER SOON" },
  ]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemForm.name || !newItemForm.stock) return;
    
    const newItem = {
      id: Date.now(),
      name: newItemForm.name,
      cat: newItemForm.cat,
      stock: newItemForm.stock,
      date: "Just Now",
      status: newItemForm.status
    };
    
    setInventory([newItem, ...inventory]);
    setNewItemForm({ name: "", cat: "Gardening", stock: "", status: "OPTIMAL" });
    setShowAddModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/inventory")} userRole="Inventory Management" userName="A. Smith">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Item Added</span>
              <span className="text-xs text-gray-300">The inventory log has been updated.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <h3 className="font-bold text-[#0f2336] text-xl mb-6 flex items-center gap-2">
                <Package size={22} className="text-blue-500" /> Add New Item
              </h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Work Gloves"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Category</label>
                    <select 
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                      value={newItemForm.cat}
                      onChange={(e) => setNewItemForm({...newItemForm, cat: e.target.value})}
                    >
                      <option>Gardening</option>
                      <option>Janitorial</option>
                      <option>Tools</option>
                      <option>Maintenance</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Quantity</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50 Pairs"
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                      value={newItemForm.stock}
                      onChange={(e) => setNewItemForm({...newItemForm, stock: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Initial Status</label>
                  <select 
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    value={newItemForm.status}
                    onChange={(e) => setNewItemForm({...newItemForm, status: e.target.value})}
                  >
                    <option value="OPTIMAL">Optimal</option>
                    <option value="REORDER SOON">Reorder Soon</option>
                    <option value="LOW STOCK">Low Stock</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#0f2336] hover:bg-[#1a365d] text-white text-sm font-bold rounded-xl transition-all shadow-md mt-6 flex items-center justify-center gap-2">
                  <Plus size={18} /> Add to Inventory
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] mb-2 tracking-tight relative inline-block">
              Inventory Control
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q20,10 40,5 T80,5 T100,5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </h1>
            <p className="text-gray-500 mt-2">Track supplies, manage vendors, and generate purchase orders.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-bold hover:bg-[#1a365d] transition-all shadow-lg shadow-[#0f2336]/20 active:scale-95">
              <Plus size={16} /> Add Item
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95">
              <FileText size={16} /> Export
            </button>
          </div>
        </div>

        {/* Inventory Logbook */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
          <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-gray-50/50 to-white relative overflow-hidden">
             {/* Background decorative blob */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60"></div>
             
            <h2 className="text-xl font-bold text-[#0f2336] flex items-center gap-3 relative z-10">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <PackageSearch size={20} />
              </div>
              Master Inventory
            </h2>
            <div className="flex gap-3 relative z-10 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search supplies..."
                  className="pl-10 pr-4 py-2.5 w-full sm:w-72 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm transition-all"
                />
              </div>
              <button className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm flex items-center gap-2">
                <Filter size={16} /> <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest w-1/3">Item Details</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Stock Level</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Last Updated</th>
                  <th className="px-8 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/20 transition-colors group/row cursor-pointer">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                           item.cat === 'Gardening' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                           item.cat === 'Janitorial' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                           'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                          {item.cat === 'Gardening' ? <TreePine size={18} /> : <Wrench size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-base text-[#0f2336] group-hover/row:text-purple-700 transition-colors mb-0.5">{item.name}</div>
                          <div className="text-xs text-gray-400 font-mono">ID: {item.id.toString().padStart(5, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg">{item.cat}</span>
                    </td>
                    <td className={`px-8 py-5 text-base font-bold ${item.status === 'LOW STOCK' ? 'text-red-500' : item.status === 'REORDER SOON' ? 'text-orange-500' : 'text-[#0f2336]'}`}>
                      {item.stock}
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-medium flex items-center gap-2">
                       {item.date}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider ${item.status === 'OPTIMAL' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        item.status === 'LOW STOCK' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' :
                          'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <span className="text-sm font-semibold text-gray-500">Showing {inventory.length} items</span>
             <div className="flex gap-1">
                <button className="px-3 py-1 text-sm font-bold text-gray-400 hover:text-[#0f2336]">Prev</button>
                <button className="px-3 py-1 text-sm font-bold text-[#0f2336] bg-white border border-gray-200 rounded-md shadow-sm">1</button>
                <button className="px-3 py-1 text-sm font-bold text-gray-400 hover:text-[#0f2336]">Next</button>
             </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
