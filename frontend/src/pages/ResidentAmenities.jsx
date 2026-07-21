import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { CalendarDays, Clock, ArrowRight, X } from "lucide-react";

const amenities = [
  {
    id: 1,
    name: "Fitness Center",
    desc: "Fully equipped cardio and strength training zones.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    status: "Open",
    statusColor: "bg-emerald-100 text-emerald-700",
    capacity: "12/30",
    nextAvailable: "Now"
  },
  {
    id: 2,
    name: "Lap Pool",
    desc: "25-meter temperature-controlled indoor pool.",
    image: "https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=1470&auto=format&fit=crop",
    status: "Open",
    statusColor: "bg-emerald-100 text-emerald-700",
    capacity: "4/15",
    nextAvailable: "Now"
  },
  {
    id: 3,
    name: "Tennis Court 1",
    desc: "Championship-grade hard court. Booking required.",
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1472&auto=format&fit=crop",
    status: "Fully Booked Today",
    statusColor: "bg-gray-100 text-gray-700",
    capacity: "N/A",
    nextAvailable: "Tomorrow"
  }
];

export default function ResidentAmenities() {
  const [selectedFacility, setSelectedFacility] = useState("Fitness Center");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleConfirmBooking = () => {
    setShowConfirm(false);
    setShowToast(true);
  };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/amenities")} userRole="Resident Portal" userName="Ananya">
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        {/* Header & Quota */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Amenities Booking</h1>
            <p className="text-gray-500 mt-2">Reserve facilities and view real-time availability.</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm min-w-[280px]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Weekly Household Quota</span>
              <span className="font-bold text-[#0f2336]">3 / 5 Used</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#0f2336] rounded-full w-[60%]"></div>
            </div>
            <div className="text-[10px] text-gray-400 font-medium text-right uppercase tracking-wider">Resets Sunday at midnight</div>
          </div>
        </div>

        {/* Amenity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {amenities.map(a => (
            <div 
              key={a.id} 
              className={`bg-white rounded-3xl overflow-hidden border transition-all cursor-pointer group ${selectedFacility === a.name ? 'border-primary ring-4 ring-primary/10 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
              onClick={() => setSelectedFacility(a.name)}
            >
              <div className="h-48 w-full relative overflow-hidden">
                <img src={a.image} alt={a.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
                  <span className={`w-2 h-2 rounded-full ${a.status === 'Open' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                  {a.status}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-[#0f2336] mb-2">{a.name}</h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-2">{a.desc}</p>
                
                <div className="flex items-end justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Capacity</div>
                    <div className="font-semibold text-gray-700">{a.capacity}</div>
                  </div>
                  <button className="text-sm font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors">
                    View Calendar <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Availability Calendar */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-[#0f2336] flex items-center gap-2">
              Quick Availability: <span className="text-primary">{selectedFacility}</span>
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div> Available</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div> Booked</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 relative">
            <div className="overflow-x-auto no-scrollbar">
              <div className="min-w-[700px]">
                {/* Header Row */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center self-end pb-2">Time</div>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center font-bold text-gray-600 text-sm">{day}</div>
                  ))}
                </div>

                {/* Time Slots */}
                {['06:00 AM', '07:00 AM', '08:00 AM'].map(time => (
                  <div key={time} className="grid grid-cols-8 gap-2 mb-2 items-center">
                    <div className="text-xs font-semibold text-gray-500 text-right pr-4">{time}</div>
                    {[...Array(7)].map((_, i) => {
                      const isAvailable = Math.random() > 0.4;
                      return (
                        <div 
                          key={i} 
                          onClick={() => { if(isAvailable) setShowConfirm(true) }}
                          className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isAvailable 
                              ? 'bg-blue-50 border border-blue-100 hover:bg-blue-500 hover:border-blue-500 text-transparent hover:text-white hover:shadow-md' 
                              : 'bg-gray-50 border border-gray-100 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-bold">+</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Booking Modal Overlay */}
            {showConfirm && (
              <div className="absolute top-8 right-8 z-20 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-6 w-80 relative">
                  <button onClick={() => setShowConfirm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                  <h3 className="font-bold text-[#0f2336] text-lg mb-4">Confirm Booking</h3>
                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">Facility:</span>
                      <span className="font-semibold text-gray-800">{selectedFacility}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-semibold text-gray-800">Wed, 06:00 AM</span>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-gray-500">Cost:</span>
                      <span className="font-semibold text-emerald-600">Free (Quota limits apply)</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleConfirmBooking} className="flex-1 py-2 bg-[#0f2336] hover:bg-[#1a365d] text-white font-semibold rounded-xl shadow-md transition-colors">Confirm</button>
                  </div>
                </div>
              </div>
            )}

            {/* Success Toast */}
            {showToast && (
              <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
                <div className="text-emerald-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Booking Confirmed</span>
                  <span className="text-xs text-gray-300">{selectedFacility} at Wed, 06:00 AM.</span>
                </div>
                <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
