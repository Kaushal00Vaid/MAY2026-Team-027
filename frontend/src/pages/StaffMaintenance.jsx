import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  completeMaintenanceTask,
  errorMessage,
  getDutyState,
  listMaintenanceTasks,
  setDutyState,
} from "@/features/helpdesk/api";
import { Camera, MapPin, User, Clock, CheckCircle2, AlertTriangle, Image as ImageIcon, X } from "lucide-react";

const FILTERS = [
  ["All Tasks", "all"],
  ["Urgent", "urgent"],
  ["Plumbing", "plumbing"],
  ["Electrical", "electrical"],
];

const taskType = (task) => {
  if (["Critical", "High"].includes(task.priority)) return "Urgent";
  return task.priority === "Normal" ? "Routine" : task.priority;
};

export default function StaffMaintenance() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dutyStatus, setDutyStatusValue] = useState(true);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [checkedSteps, setCheckedSteps] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const loadTasks = async (activeFilter = filter) => {
    setLoading(true);
    setError("");
    try {
      const [{ data: taskData }, { data: dutyData }] = await Promise.all([
        listMaintenanceTasks(activeFilter),
        getDutyState(),
      ]);
      setTasks(taskData.items);
      setDutyStatusValue(dutyData.on_duty);
      setSelectedTask((current) =>
        taskData.items.find((item) => item.id === current?.id) || taskData.items[0] || null,
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to load assigned maintenance tasks."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(() => loadTasks(filter)); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const selectTask = (task) => {
    setSelectedTask(task);
    setNotes(task.resolution_notes || "");
    setPhoto(null);
    setCheckedSteps({});
    setError("");
  };

  const toggleDuty = async () => {
    const next = !dutyStatus;
    setDutyStatusValue(next);
    try {
      await setDutyState(next);
    } catch (requestError) {
      setDutyStatusValue(!next);
      setError(errorMessage(requestError, "Unable to update duty status."));
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask || saving) return;
    const allChecked = selectedTask.instructions.every((_, index) => checkedSteps[index]);
    if (!allChecked) return setError("Complete every required step before resolving the task.");
    if (!notes.trim()) return setError("Technician notes are required.");
    if (!photo) return setError("Upload a proof-of-work photo before resolving the task.");
    setSaving(true);
    setError("");
    try {
      await completeMaintenanceTask(selectedTask.id, notes, photo);
      setToastMessage(`Task TK-${selectedTask.complaint_id} marked as complete.`);
      setNotes(""); setPhoto(null); setCheckedSteps({});
      await loadTasks(filter);
    } catch (requestError) {
      setError(errorMessage(requestError, "Unable to complete the task."));
    } finally {
      setSaving(false);
    }
  };

  const selectedType = selectedTask ? taskType(selectedTask) : "Routine";
  const userName = user ? `${user.first_name} ${user.last_name}` : "Maintenance Staff";

  return (
    <DashboardLayout sidebarItems={getGateSidebarItems("/gate/maintenance")} userRole="Maintenance Dept." userName={userName}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
          <h1 className="text-xl font-extrabold text-[#0f2336] flex items-center gap-3">Task Queue
            <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">{tasks.length} Pending</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-600">Duty Status</span>
            <button type="button" aria-label="Toggle duty status" onClick={toggleDuty} className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${dutyStatus ? "bg-blue-600" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform ${dutyStatus ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-gray-50/50">
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-white shrink-0">
            <div className="p-4 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.map(([label, value]) => (
                <button key={value} onClick={() => setFilter(value)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${filter === value ? "bg-[#0f2336] text-white border-[#0f2336]" : "bg-white text-gray-600 border-gray-200"}`}>{label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && <div className="text-sm text-gray-500 p-4">Loading assigned tasks…</div>}
              {!loading && tasks.length === 0 && <div className="text-sm text-gray-500 p-4">No assigned tasks. You are all caught up!</div>}
              {tasks.map((task) => {
                const type = taskType(task);
                return <button type="button" key={task.id} onClick={() => selectTask(task)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedTask?.id === task.id ? (type === "Urgent" ? "border-orange-500 bg-orange-50/30" : "border-[#0f2336] bg-blue-50/30") : "border-transparent bg-gray-50 hover:bg-gray-100"}`}>
                  <div className="flex justify-between mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${type === "Urgent" ? "bg-orange-500 text-white" : "bg-amber-400 text-[#0f2336]"}`}>{type}</span><span className="text-xs font-mono font-bold text-gray-400">TK-{task.complaint_id}</span></div>
                  <h3 className="font-bold text-sm mb-2 text-[#0f2336]">{task.title}</h3>
                  <div className="text-xs text-gray-500 space-y-1"><span className="flex gap-1"><MapPin size={12}/>{task.location || "Location not specified"}</span><span className="flex gap-1"><Clock size={12}/>{new Date(task.created_at).toLocaleString()}</span></div>
                </button>;
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 relative">
            {toastMessage && <div className="fixed bottom-6 right-6 bg-[#0f2336] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"><CheckCircle2 className="text-emerald-400" size={20}/><span className="text-sm font-bold">{toastMessage}</span><button onClick={() => setToastMessage("")}><X size={16}/></button></div>}
            {selectedTask ? <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-6">
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex gap-3 mb-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase ${selectedType === "Urgent" ? "bg-orange-500 text-white" : "bg-amber-400"}`}>{selectedType}</span><span className="text-sm font-bold text-gray-400">TK-{selectedTask.complaint_id}</span></div>
                <h2 className="text-3xl font-extrabold text-[#0f2336] mb-4">{selectedTask.title}</h2>
                <div className="flex flex-wrap gap-6 text-sm text-gray-500"><span className="flex gap-2"><MapPin size={16}/>{selectedTask.location || "Location not specified"}</span><span className="flex gap-2"><User size={16}/>Reported by: {selectedTask.reporter_name}</span></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><h3 className="font-bold text-[#0f2336] text-sm flex gap-2 mb-3"><AlertTriangle size={16} className="text-blue-500"/>Description</h3><p className="text-sm text-gray-600 leading-relaxed">{selectedTask.description}</p></div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><h3 className="font-bold text-[#0f2336] text-sm flex gap-2 mb-4"><CheckCircle2 size={16} className="text-emerald-500"/>Required Steps</h3><div className="space-y-3">{selectedTask.instructions.map((step, index) => <label key={step} className="flex gap-3 p-3 rounded-xl border bg-gray-50 cursor-pointer"><input type="checkbox" checked={Boolean(checkedSteps[index])} onChange={(event) => setCheckedSteps((current) => ({...current, [index]: event.target.checked}))}/><span className="text-sm text-gray-700 font-medium">{step}</span></label>)}</div></div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><h3 className="font-bold text-[#0f2336] text-sm mb-3">Technician Notes</h3><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm" placeholder="Add diagnosis, parts used, and repair details…"/></div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"><h3 className="font-bold text-[#0f2336] text-sm flex gap-2 mb-2"><Camera size={16} className="text-purple-500"/>Proof of Work</h3><p className="text-xs text-gray-500 mb-4">Upload at least one photo before closing the task.</p><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] || null)}/><button type="button" onClick={() => fileRef.current?.click()} className={`w-full border-2 border-dashed ${photo ? "border-emerald-400 bg-emerald-50/30" : "border-gray-300 bg-gray-50/50"} rounded-2xl p-8 flex flex-col items-center`}><ImageIcon size={20}/><span className="text-sm font-bold mt-3">{photo?.name || "Tap to take photo or upload"}</span></button>{error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}<button disabled={saving} onClick={handleCompleteTask} className="w-full mt-6 py-4 bg-[#0f2336] disabled:opacity-50 text-white text-sm font-bold rounded-2xl flex justify-center gap-2"><CheckCircle2 size={18}/>{saving ? "Completing…" : "Mark Task Complete"}</button></div>
            </div> : !loading && <div className="flex items-center justify-center h-full text-gray-400 font-semibold">No tasks available. You are all caught up!</div>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
