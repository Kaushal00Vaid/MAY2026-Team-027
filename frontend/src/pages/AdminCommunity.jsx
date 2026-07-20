import { useState } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Search,
  MessageSquare,
  Megaphone,
  Heart,
  MoreHorizontal,
  Plus
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: false, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: true, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
];

const discussions = [
  { id: 1, title: "Diwali Decoration Ideas", author: "Ananya S. (A-402)", replies: 24, likes: 12, time: "2h ago", tag: "Events", tagColor: "orange" },
  { id: 2, title: "Pool Maintenance Schedule", author: "Admin", replies: 5, likes: 8, time: "1d ago", tag: "Notice", tagColor: "blue" },
  { id: 3, title: "Car Pooling to IT Park?", author: "Rahul M. (C-104)", replies: 15, likes: 3, time: "2d ago", tag: "General", tagColor: "emerald" },
];

const residents = [
  { id: 1, name: "Ananya Singh", unit: "A-402", role: "Resident", status: "Active", join: "Oct 2022" },
  { id: 2, name: "Rahul Mehta", unit: "C-104", role: "Owner", status: "Active", join: "Jan 2020" },
  { id: 3, name: "Priya Desai", unit: "B-201", role: "Tenant", status: "Pending", join: "New" },
  { id: 4, name: "Vikram R.", unit: "A-101", role: "Owner", status: "Active", join: "Mar 2018" },
];

export default function AdminCommunity() {
  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Community Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Manage resident directory, notices, and community forums.</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95">
              <Megaphone size={16} />
              Broadcast Notice
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d87943] hover:bg-[#c66a39] text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95">
              <Plus size={16} />
              Add Resident
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Discussion Forums */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-bl-full -z-10"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#0f2336] flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#d87943]" />
                  Active Discussions
                </h3>
              </div>
              
              <div className="space-y-4">
                {discussions.map((post) => (
                  <div key={post.id} className="p-4 rounded-2xl bg-gray-50/50 hover:bg-gray-50 border border-gray-100 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        post.tagColor === 'orange' ? 'bg-orange-100 text-orange-600' :
                        post.tagColor === 'blue' ? 'bg-blue-100 text-blue-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {post.tag}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{post.time}</span>
                    </div>
                    <h4 className="font-bold text-[#0f2336] group-hover:text-[#d87943] transition-colors mb-1">{post.title}</h4>
                    <p className="text-xs text-gray-500 mb-4">By {post.author}</p>
                    
                    <div className="flex items-center gap-4 text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs font-semibold group-hover:text-blue-500 transition-colors">
                        <MessageSquare size={14} /> {post.replies}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold group-hover:text-pink-500 transition-colors">
                        <Heart size={14} /> {post.likes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-6 py-3 border border-dashed border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
                View All Forums
              </button>
            </div>
          </div>

          {/* Resident Directory */}
          <div className="xl:col-span-7 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
              
              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-[#0f2336]">Resident Directory</h3>
                
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search residents or units..." 
                    className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#d87943]/20 focus:border-[#d87943] outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1 p-2">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Resident</th>
                      <th className="px-6 py-3">Unit</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {residents.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              {r.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-[#0f2336] group-hover:text-indigo-600 transition-colors">{r.name}</div>
                              <div className="text-[10px] text-gray-400">Joined {r.join}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs">{r.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">{r.role}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${
                            r.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                          }`}>
                            {r.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
