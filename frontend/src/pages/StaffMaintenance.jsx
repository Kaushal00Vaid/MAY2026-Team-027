import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { Camera, MapPin, User, Clock, CheckCircle2, ChevronRight, Filter, AlertTriangle, Image as ImageIcon, X } from "lucide-react";

const initialTasks = [
  { id: "TK-4092", title: "Major Pipe Leak", loc: "Bldg A, Floor 3, Apt 304", reporter: "Sarah Jenkins", time: "09:15 AM", type: "Urgent", status: "pending", category: "Plumbing" },
  { id: "TK-4090", title: "Flickering Hallway Lights", loc: "Bldg C, Floor 1, North Corridor", reporter: "System", time: "08:30 AM", type: "Routine", status: "pending", category: "Electrical" },
  { id: "TK-4085", title: "HVAC Filter Replacement", loc: "Clubhouse Main Hall", reporter: "Schedule", time: "Yesterday", type: "Scheduled", status: "pending", category: "Maintenance" },
];

export default function StaffMaintenance() {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTask, setSelectedTask] = useState(initialTasks[0]);
  const [dutyStatus, setDutyStatus] = useState(true);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => setShowToast(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [showToast]);

  const handleCompleteTask = () => {
    if (!selectedTask) return;
    setToastMessage(`Task ${selectedTask.id} marked as complete.`);
    setShowToast(true);
    
    const remainingTasks = tasks.filter(t => t.id !== selectedTask.id);
    setTasks(remainingTasks);
    if (remainingTasks.length > 0) {
      setSelectedTask(remainingTasks[0]);
    } else {
      setSelectedTask(null);
    }
    setPhotoUploaded(false);
  };

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/maintenance")} userRole="Maintenance Dept." userName="T. Foreman">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        
        {/* Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
          <div>
            <h1 className="text-xl font-extrabold text-[#0f2336] flex items-center gap-3 relative inline-block">
              Task Queue
              <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{tasks.length} Pending</span>
              <svg className="absolute -bottom-2 -left-2 w-32 h-3 text-blue-500/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q20,10 40,5 T80,0 T100,8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600">Duty Status</span>
            <button 
              onClick={() => setDutyStatus(!dutyStatus)}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${dutyStatus ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-300 flex items-center justify-center ${dutyStatus ? 'translate-x-6' : 'translate-x-1'}`}>
                {dutyStatus && <CheckCircle2 size={12} className="text-blue-600" />}
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-gray-50/50">
          
          {/* Left Panel: Task List */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-white shrink-0 z-0 relative">
            <div className="p-4 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
               {["All Tasks", "Urgent", "Plumbing", "Electrical"].map((f, i) => (
                 <button key={i} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${i === 0 ? 'bg-[#0f2336] text-white border-[#0f2336]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                   {f}
                 </button>
               ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedTask.id === task.id 
                      ? (task.type === 'Urgent' ? 'border-orange-500 bg-orange-50/30' : 'border-[#0f2336] bg-blue-50/30')
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      task.type === 'Urgent' ? 'bg-orange-500 text-white' : 
                      task.type === 'Routine' ? 'bg-amber-400 text-[#0f2336]' : 
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {task.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-400">{task.id}</span>
                  </div>
                  <h3 className={`font-bold text-sm mb-2 leading-tight ${selectedTask.id === task.id ? 'text-[#0f2336]' : 'text-gray-800'}`}>
                    {task.title}
                  </h3>
                  <div className="text-xs text-gray-500 flex flex-col gap-1.5 mt-2">
                    <span className="flex items-center gap-1.5"><MapPin size={12} className="opacity-70" /> {task.loc}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} className="opacity-70" /> {task.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Task Details */}
          <div className="flex-1 overflow-y-auto bg-gray-50 relative">
             
             {/* Toast Notification */}
             {showToast && (
               <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
                 <CheckCircle2 className="text-emerald-400" size={20} />
                 <div className="flex flex-col">
                   <span className="font-bold text-sm">Success</span>
                   <span className="text-xs text-gray-300">{toastMessage}</span>
                 </div>
                 <button onClick={() => setShowToast(false)} className="ml-4 text-gray-400 hover:text-white transition-colors">
                   <X size={16} />
                 </button>
               </div>
             )}

             {selectedTask ? (
               <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
                  
                  {/* Detail Header */}
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                    {selectedTask.type === 'Urgent' && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full -mt-10 -mr-10"></div>
                    )}
                    
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        selectedTask.type === 'Urgent' ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' : 
                        selectedTask.type === 'Routine' ? 'bg-amber-400 text-[#0f2336]' : 
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {selectedTask.type}
                      </span>
                      <span className="text-sm font-bold text-gray-400">{selectedTask.id}</span>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-[#0f2336] mb-4 relative z-10">{selectedTask.title}</h2>
                    
                    <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-500 relative z-10">
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" /> {selectedTask.loc}</div>
                      <div className="flex items-center gap-2"><User size={16} className="text-gray-400" /> Reported by: {selectedTask.reporter}</div>
                    </div>
                  </div>

                {/* Description Box */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-[#0f2336] text-sm flex items-center gap-2 mb-3">
                     <AlertTriangle size={16} className="text-blue-500" /> Description
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                     Water is actively leaking from the ceiling in the master bathroom. Resident reported it 10 mins ago. Stated that the water is spreading quickly to the hallway.
                     <br/><br/>
                     <span className="font-bold text-orange-600">Immediate shutoff may be required before repair begins.</span>
                  </p>
                </div>

                {/* Instructions Box */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-[#0f2336] text-sm flex items-center gap-2 mb-4">
                     <CheckCircle2 size={16} className="text-emerald-500" /> Required Steps
                  </h3>
                  <div className="space-y-3">
                     {[
                       "Locate main water shutoff valve for Apt 304 (Utility Closet B).",
                       "Assess damage to ceiling drywall and plumbing fixture.",
                       "Document leak source with clear photos before repair."
                     ].map((step, i) => (
                       <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                         <div className="relative flex items-start mt-0.5">
                           <input type="checkbox" className="peer w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 appearance-none bg-white checked:bg-blue-600 checked:border-transparent transition-all" />
                           <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                         </div>
                         <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 leading-snug select-none">{step}</span>
                       </label>
                     ))}
                  </div>
                </div>

                {/* Technician Notes */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-[#0f2336] text-sm mb-3">Technician Notes</h3>
                  <textarea 
                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Add diagnosis, parts used, or additional observations here..."
                  ></textarea>
                </div>

                {/* Proof of Work */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-[#0f2336] text-sm flex items-center gap-2 mb-2">
                    <Camera size={16} className="text-purple-500" /> Proof of Work
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">Upload at least one photo of the completed repair before closing task.</p>
                  
                  <div onClick={() => setPhotoUploaded(true)} className={`border-2 border-dashed ${photoUploaded ? 'border-emerald-400 bg-emerald-50/30' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'} rounded-2xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group`}>
                    <div className={`w-12 h-12 rounded-full shadow-sm flex items-center justify-center mb-3 transition-transform ${photoUploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 group-hover:scale-110'}`}>
                       {photoUploaded ? <CheckCircle2 size={20} /> : <ImageIcon size={20} />}
                    </div>
                    <span className={`text-sm font-bold ${photoUploaded ? 'text-emerald-700' : 'text-gray-600'}`}>
                      {photoUploaded ? 'repair_after_photo.jpg' : 'Tap to take photo or upload'}
                    </span>
                  </div>

                  <button onClick={handleCompleteTask} className="w-full mt-6 py-4 bg-[#0f2336] hover:bg-[#1a365d] text-white text-sm font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Mark Task Complete
                  </button>
                </div>
                
                {/* Spacer for scrolling */}
                <div className="h-8"></div>
             </div>
             ) : (
               <div className="flex items-center justify-center h-full text-gray-400 font-semibold">
                 No tasks available. You are all caught up!
               </div>
             )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
