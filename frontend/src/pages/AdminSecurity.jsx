import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  WalletCards,
  Headset,
  ShieldCheck,
  CalendarCheck,
  Users,
  BarChart3,
  Search,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Radio,
  UserCog
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: false, href: "/admin" },
  { label: "Finance", icon: WalletCards, active: false, href: "/admin/finance" },
  { label: "Helpdesk", icon: Headset, active: false, href: "/admin/helpdesk" },
  { label: "Security", icon: ShieldCheck, active: true, href: "/admin/security" },
  { label: "Amenities", icon: CalendarCheck, active: false, href: "/admin/amenities" },
  { label: "Community", icon: Users, active: false, href: "/admin/community" },
  { label: "Analytics", icon: BarChart3, active: false, href: "/admin/analytics" },
  { label: "User Roles", icon: UserCog, active: false, href: "/admin/users" },
];

const liveLog = [
  { id: 1, name: "Rahul Sharma", purpose: "Delivery (Amazon)", unit: "A-204", vehicle: "MH-12-AB-3456", time: "10:45 AM", status: "Approved" },
  { id: 2, name: "Priya Desai", purpose: "Guest", unit: "Unit 501", vehicle: "-", time: "10:42 AM", status: "Pending", highlight: true },
  { id: 3, name: "Amit Singh", purpose: "Plumber", unit: "Unit 112", vehicle: "MH-14-XY-9876", time: "10:30 AM", status: "Approved" },
  { id: 4, name: "Unknown User", purpose: "Sales - General", unit: "-", vehicle: "-", time: "10:15 AM", status: "Denied" },
  { id: 5, name: "Kavita Rao", purpose: "Guest", unit: "B-305", vehicle: "MH-12-CD-1122", time: "09:50 AM", status: "Approved" },
];

export default function AdminSecurity() {
  const [showModal, setShowModal] = useState(true); // Default show for demo purposes
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleBroadcast = () => {
    setShowToast(true);
  };

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole="Residential Admin">
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 relative">

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
            <Radio className="text-white" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Alert Broadcasted</span>
              <span className="text-xs text-orange-100">Message sent to all active security gates.</span>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-orange-200 hover:text-white transition-colors">
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Security Console</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Gate: <span className="font-semibold text-gray-700">Main Entrance Alpha</span>
            </p>
          </div>
          <button
            onClick={handleBroadcast}
            className="w-fit inline-flex items-center gap-2 px-5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 border border-orange-200"
          >
            <Radio size={18} />
            Broadcast Alert
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Live Visitor Log */}
          <div className="xl:col-span-8 flex flex-col">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">

              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-[#0f2336]">Live Visitor Log</h3>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full sm:w-64 h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Purpose</th>
                      <th className="px-6 py-4">Target Unit</th>
                      <th className="px-6 py-4">Vehicle #</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {liveLog.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors cursor-pointer ${row.highlight
                            ? 'bg-orange-50/50 hover:bg-orange-50 relative'
                            : 'hover:bg-gray-50/50'
                          }`}
                        onClick={() => row.highlight && setShowModal(true)}
                      >
                        <td className="px-6 py-5 font-semibold text-gray-900 relative">
                          {row.highlight && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                          )}
                          {row.name}
                        </td>
                        <td className="px-6 py-5 text-gray-500">{row.purpose}</td>
                        <td className="px-6 py-5 font-medium text-gray-700">{row.unit}</td>
                        <td className="px-6 py-5 font-mono text-gray-400 text-xs">{row.vehicle}</td>
                        <td className="px-6 py-5 text-gray-500">{row.time}</td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit ${row.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                              row.status === 'Denied' ? 'bg-red-50 text-red-600' :
                                'bg-orange-100 text-orange-600 animate-pulse'
                            }`}>
                            {row.status === 'Approved' && <CheckCircle2 size={12} />}
                            {row.status === 'Denied' && <XCircle size={12} />}
                            {row.status === 'Pending' && <Clock size={12} />}
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Frequent Staff Today */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-[#0f2336]">Frequent Staff Today</h3>
                <div className="p-2 bg-gray-50 text-gray-400 rounded-lg">
                  <UsersIcon size={18} />
                </div>
              </div>

              <div className="space-y-6">

                {/* Staff 1 */}
                <div className="group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">L</div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">Lakshmi</div>
                        <div className="text-xs text-gray-500">Maid Service</div>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100">
                      ON DUTY
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">Unit 401</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">Unit 405</span>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100"></div>

                {/* Staff 2 */}
                <div className="group opacity-60">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">R</div>
                      <div>
                        <div className="font-bold text-sm text-gray-900">Raju</div>
                        <div className="text-xs text-gray-500">Maintenance</div>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded border border-gray-200">
                      OFF DUTY
                    </div>
                  </div>
                  <div className="flex gap-2 ml-13">
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">Unit 102</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* Modal Overlay */}
        {showModal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl z-0 animate-in fade-in" onClick={() => setShowModal(false)}></div>

            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100">

              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">New Visitor Request</h3>
                </div>
                <div className="text-xs font-mono text-gray-400">02:59</div>
              </div>

              <div className="p-6">
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center text-gray-400">
                    <User size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Priya Desai</h4>
                    <p className="text-sm text-gray-500 mb-2">Guest - Unit 501</p>
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded">
                      No Vehicle
                    </span>
                  </div>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 mb-6">
                  <p className="text-xs font-bold text-gray-500 mb-1">Resident Note (Unit 501):</p>
                  <p className="text-sm text-gray-800 italic">"Expecting her, please send her up."</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <XCircle size={18} /> Deny
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-[#5f8787] hover:bg-[#4f7373] text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 size={18} /> Approve
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
