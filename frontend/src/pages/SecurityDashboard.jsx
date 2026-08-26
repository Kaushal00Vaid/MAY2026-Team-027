import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRightToLine,
  ArrowLeftFromLine,
  CheckCircle2,
  ScanLine,
  Truck,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { getGateSidebarItems } from "@/components/gate/GateSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  createVisitor,
  listAllVisitors,
  listAccessLogs,
  manualResidentEntry,
  securityError,
  verifyGuestPin,
  verifyResidentId,
  visitorEntry,
  visitorExit,
} from "@/features/security/api";

const EMPTY = {
  visitor_name: "",
  target_unit: "",
  phone_number: "",
  purpose: "Guest / Friend",
  vehicle_number: "",
};
export default function SecurityDashboard() {
  const { user } = useAuth();
  const [pin, setPin] = useState("");
  const [residentToken, setResidentToken] = useState("");
  const [visitors, setVisitors] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [manualUnit, setManualUnit] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [v, { data: l }] = await Promise.all([
        listAllVisitors(),
        listAccessLogs(30),
      ]);
      setVisitors(v);
      setLogs(l);
    } catch (e) {
      setError(securityError(e, "Unable to load gate operations."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);
  useRealtimeRefresh(["security"], load);
  const submitPin = async () => {
    if (pin.length !== 4 || saving) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await verifyGuestPin(pin);
      setToast(`Access granted for ${data.guest_name}.`);
      setPin("");
      await load();
    } catch (e) {
      setError(securityError(e, "PIN verification failed."));
    } finally {
      setSaving(false);
    }
  };
  const submitResidentToken = async (event) => {
    event.preventDefault();
    if (!residentToken.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await verifyResidentId({ token: residentToken.trim() });
      setResidentToken("");
      setToast(`Resident entry recorded for ${data.subject_name}.`);
      await load();
    } catch (requestError) {
      setError(securityError(requestError, "Resident ID verification failed."));
    } finally {
      setSaving(false);
    }
  };
  const request = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await createVisitor(form);
      setForm(EMPTY);
      setToast("Resident approval requested.");
      await load();
    } catch (e) {
      setError(securityError(e, "Unable to request approval."));
    } finally {
      setSaving(false);
    }
  };
  const transition = async (item) => {
    setSaving(true);
    setError("");
    try {
      item.status === "approved"
        ? await visitorEntry(item.id)
        : await visitorExit(item.id);
      await load();
    } catch (e) {
      setError(securityError(e, "Unable to record gate event."));
    } finally {
      setSaving(false);
    }
  };
  const manual = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await manualResidentEntry(manualUnit);
      setManualUnit("");
      setShowManual(false);
      setToast("Resident entry recorded.");
      await load();
    } catch (err) {
      setError(securityError(err, "Unable to record resident entry."));
    } finally {
      setSaving(false);
    }
  };
  const pending = visitors.filter((v) => v.status === "pending"),
    actionable = visitors.filter((v) =>
      ["approved", "inside"].includes(v.status),
    );
  const userName = user ? `${user.first_name} ${user.last_name}` : "Security";
  return (
    <DashboardLayout
      sidebarItems={getGateSidebarItems("/gate")}
      userRole="Main Gate"
      userName={userName}
    >
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white p-4 rounded-xl">
            {toast}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center justify-between gap-4"
          >
            <span>{error}</span>
            <button type="button" onClick={load} className="font-bold text-sm">
              Retry
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-[#1a2d48] text-white p-6 rounded-3xl">
            <h3 className="text-lg font-bold mb-6">Pre-Approved PIN</h3>
            <div className="bg-[#0f1a2b] h-20 rounded-2xl mb-6 flex justify-center items-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${pin.length > i ? "bg-white" : "bg-white/10"}`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => pin.length < 4 && setPin(pin + n)}
                  className="h-14 bg-white/5 rounded-xl text-xl"
                >
                  {n}
                </button>
              ))}
              <button onClick={() => setPin("")} className="h-14 text-red-400">
                <XCircle />
              </button>
              <button
                onClick={() => pin.length < 4 && setPin(pin + "0")}
                className="h-14 bg-white/5 rounded-xl text-xl"
              >
                0
              </button>
              <button
                disabled={pin.length !== 4 || saving}
                onClick={submitPin}
                className="h-14 bg-emerald-500 disabled:opacity-30 rounded-xl flex justify-center items-center"
              >
                <CheckCircle2 />
              </button>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border">
            <h3 className="text-lg font-bold text-[#0f2336] mb-5">
              Resident Scanner
            </h3>
            <div className="h-36 border-2 border-dashed rounded-3xl flex items-center justify-center text-blue-500">
              <ScanLine size={72} />
            </div>
            <form onSubmit={submitResidentToken} className="mt-4 space-y-3">
              <label className="sr-only" htmlFor="resident-qr-token">
                Resident QR token
              </label>
              <input
                id="resident-qr-token"
                value={residentToken}
                onChange={(event) => setResidentToken(event.target.value)}
                placeholder="Scan or paste resident QR token"
                autoComplete="off"
                className="w-full h-11 px-3 border rounded-xl text-sm"
              />
              <button
                disabled={saving || !residentToken.trim()}
                className="w-full py-2.5 bg-blue-600 disabled:opacity-40 text-white rounded-xl font-semibold"
              >
                Verify Resident ID
              </button>
            </form>
            <button
              onClick={() => setShowManual(true)}
              className="w-full py-3 mt-5 bg-gray-50 border rounded-xl font-semibold"
            >
              Manual Unit Entry
            </button>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border p-5">
              <h3 className="font-bold mb-4">
                Pending Approvals ({pending.length})
              </h3>
              {loading && <p>Loading…</p>}
              {!loading && pending.length === 0 && (
                <p className="text-sm text-gray-400">No pending approvals.</p>
              )}
              {pending.map((v) => (
                <div key={v.id} className="p-3 bg-orange-50 rounded-xl mb-2">
                  <strong>
                    {v.unit} • {v.visitor_name}
                  </strong>
                  <p className="text-xs text-gray-600">
                    Waiting for resident • expires{" "}
                    {new Date(v.expires_at).toLocaleTimeString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-3xl border p-5">
              <h3 className="font-bold mb-4">Gate Actions</h3>
              {!loading && actionable.length === 0 && (
                <p className="text-sm text-gray-400">
                  No approved/inside visitors.
                </p>
              )}
              {actionable.map((v) => (
                <button
                  disabled={saving}
                  onClick={() => transition(v)}
                  key={v.id}
                  className="w-full p-3 mb-2 bg-gray-50 rounded-xl flex justify-between"
                >
                  <span>
                    {v.visitor_name} • {v.unit}
                  </span>
                  <span>
                    {v.status === "approved" ? (
                      <ArrowRightToLine size={18} />
                    ) : (
                      <ArrowLeftFromLine size={18} />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border">
            <h3 className="text-xl font-bold flex gap-2">
              <Truck />
              Unscheduled Visitor Check-in
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <input
                value={form.visitor_name}
                onChange={(e) =>
                  setForm({ ...form, visitor_name: e.target.value })
                }
                placeholder="Full name"
                className="h-12 px-4 border rounded-xl"
              />
              <input
                value={form.target_unit}
                onChange={(e) =>
                  setForm({ ...form, target_unit: e.target.value })
                }
                placeholder="Target unit, e.g. A-101"
                className="h-12 px-4 border rounded-xl"
              />
              <input
                value={form.phone_number}
                onChange={(e) =>
                  setForm({ ...form, phone_number: e.target.value })
                }
                placeholder="Phone (optional)"
                className="h-12 px-4 border rounded-xl"
              />
              <select
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="h-12 px-4 border rounded-xl"
              >
                <option>Guest / Friend</option>
                <option>Delivery</option>
                <option>Maintenance</option>
                <option>Other</option>
              </select>
              <input
                value={form.vehicle_number}
                onChange={(e) =>
                  setForm({ ...form, vehicle_number: e.target.value })
                }
                placeholder="Vehicle (optional)"
                className="h-12 px-4 border rounded-xl"
              />
            </div>
            <button
              disabled={
                saving || !form.visitor_name.trim() || !form.target_unit.trim()
              }
              onClick={request}
              className="mt-5 px-6 py-3 bg-blue-600 disabled:opacity-40 text-white rounded-xl font-bold flex gap-2"
            >
              <AlertTriangle size={16} />
              Request Resident Approval
            </button>
          </div>
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border">
            <h3 className="font-bold mb-4">Live Gate Feed</h3>
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && logs.length === 0 && (
              <p className="text-sm text-gray-400">No gate activity.</p>
            )}
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="p-2 border-b text-sm">
                <strong>{log.subject_name}</strong>
                <span className="block text-xs text-gray-500">
                  {log.event_type.replaceAll("_", " ")} • {log.unit || "—"} •{" "}
                  {new Date(log.occurred_at).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
        {showManual && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
            <form
              onSubmit={manual}
              className="bg-white p-6 rounded-3xl w-full max-w-sm relative"
            >
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="absolute right-4 top-4"
              >
                <XCircle />
              </button>
              <h3 className="font-bold text-lg mb-4">Manual Resident Entry</h3>
              <input
                required
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
                placeholder="Unit, e.g. A-101"
                className="w-full h-12 px-4 border rounded-xl"
              />
              <button
                disabled={saving || !manualUnit.trim()}
                className="w-full mt-4 py-3 bg-[#0f2336] text-white rounded-xl"
              >
                Log Entry
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
