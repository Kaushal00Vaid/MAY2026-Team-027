import { useEffect, useState } from "react";
import { Loader2, ArrowRightToLine, CheckCircle2, CalendarDays, PackageSearch, Users, Activity } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import { getStaffAnalytics } from "@/api/analytics";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await getStaffAnalytics();
        setAnalytics(response.data);
      } catch (err) {
        console.error("Failed to fetch staff analytics", err);
        setError("Unable to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const userName = user ? `${user.first_name} ${user.last_name}` : "Staff Member";

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/dashboard")} userRole="Staff Portal" userName={userName}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f2336] tracking-tight">Staff Overview</h1>
            <p className="text-gray-500 mt-2 text-base">Daily operational analytics and active status.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="h-72 flex justify-center items-center">
            <Loader2 className="animate-spin text-gray-500" size={32} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            
            {/* Gate Activity */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Gate Activity</h3>
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <ArrowRightToLine size={20} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#0f2336] mb-2">{analytics?.gate_activity.total_entries_today}</div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md font-bold">{analytics?.gate_activity.pending_approvals}</span> pending approvals
                </div>
              </div>
            </div>

            {/* Roster Coverage */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Roster Coverage</h3>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Users size={20} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#0f2336] mb-2">{analytics?.roster.checked_in_now}</div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  of <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">{analytics?.roster.active_staff_today}</span> staff on shift today
                </div>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Inventory Status</h3>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <PackageSearch size={20} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#0f2336] mb-2">{analytics?.inventory.total_items}</div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-md font-bold ${analytics?.inventory.low_stock_items > 0 ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                    {analytics?.inventory.low_stock_items}
                  </span> low stock alerts
                </div>
              </div>
            </div>

            {/* Event Preparation */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Event Prep</h3>
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <CalendarDays size={20} />
                </div>
              </div>
              <div>
                <div className="text-4xl font-extrabold text-[#0f2336] mb-2">{analytics?.events.length}</div>
                <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  upcoming events to prepare
                </div>
              </div>
            </div>

          </div>
        )}

        {!loading && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Event Participation Details */}
            <div className="lg:col-span-12 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0f2336] flex items-center gap-2">
                  <Activity className="text-purple-500" size={20} />
                  Upcoming Event Participation
                </h2>
              </div>
              <div className="p-6">
                {analytics.events.length === 0 ? (
                  <p className="text-gray-500 italic">No upcoming events scheduled.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {analytics.events.map((e) => (
                      <div key={e.id} className="p-5 rounded-xl bg-purple-50/50 border border-purple-100">
                        <div className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">
                          {new Date(e.starts_at).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <h4 className="text-lg font-bold text-[#0f2336] mb-4">{e.title}</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-3">
                            {[...Array(Math.min(3, e.rsvp_count || 1))].map((_, i) => (
                              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-purple-200 flex items-center justify-center text-xs font-bold text-purple-700">
                                <Users size={12} />
                              </div>
                            ))}
                          </div>
                          <div className="text-sm font-bold text-gray-600">
                            {e.rsvp_count} Confirmed Guests
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
