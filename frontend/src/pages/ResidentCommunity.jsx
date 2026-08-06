import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import { communityError, getActivePoll, listEvents, listNotices, listVolunteers, markNoticeRead, signupVolunteer, updateRsvp, votePoll, withdrawVolunteer } from "@/features/community/api";
import { Megaphone, BarChart3, Calendar, HeartHandshake, ChevronLeft, ChevronRight, Clock, MapPin, X, CheckCircle2 } from "lucide-react";

export default function ResidentCommunity() {
  const { user } = useAuth();
  const [pollVoted, setPollVoted] = useState(false);
  const [poll, setPoll] = useState(null);
  const [pollOptions, setPollOptions] = useState([]);
  const [signedUp, setSignedUp] = useState(false);
  const [opportunity, setOpportunity] = useState(null);
  const [showNoticesModal, setShowNoticesModal] = useState(false);
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const applyPoll = (data) => {
    setPoll(data); setPollVoted(Boolean(data?.selected_option_id));
    setPollOptions((data?.options || []).map((option) => ({ id: option.id, label: option.label, val: option.percentage, bg: option.id === data.selected_option_id ? "bg-blue-400" : "bg-gray-200" })));
  };
  const load = async () => {
    setLoading(true); setError("");
    try {
      const [{ data: noticeData }, { data: eventData }, { data: pollData }, { data: volunteerData }] = await Promise.all([listNotices(), listEvents(), getActivePoll(), listVolunteers()]);
      setNotices(noticeData.items.map((item, index) => ({ ...item, target: item.target_label, time: new Date(item.published_at).toLocaleString(), desc: item.body, color: ["bg-blue-100 text-blue-700 border-blue-500", "bg-emerald-100 text-emerald-700 border-emerald-500", "bg-orange-100 text-orange-700 border-orange-500"][index % 3] })));
      setEvents(eventData.map((item, index) => { const start = new Date(item.starts_at); const end = new Date(item.ends_at); return { ...item, month: start.toLocaleString(undefined, { month: "short" }).toUpperCase(), day: String(start.getDate()).padStart(2, "0"), time: `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, loc: item.location, color: index % 2 ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600" }; }));
      applyPoll(pollData); const first = volunteerData[0] || null; setOpportunity(first); setSignedUp(Boolean(first?.signed_up));
    } catch (requestError) { setError(communityError(requestError, "Unable to load Community Hub.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void Promise.resolve().then(load); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async (id) => {
    if (pollVoted || !poll || saving) return; setSaving(true); setError("");
    try { const { data } = await votePoll(poll.id, id); applyPoll(data); setToast("Vote recorded. Votes are final."); }
    catch (requestError) { setError(communityError(requestError, "Unable to record your vote.")); }
    finally { setSaving(false); }
  };

  const toggleVolunteer = async () => {
    if (!opportunity || saving) return; setSaving(true); setError("");
    try { const { data } = signedUp ? await withdrawVolunteer(opportunity.id) : await signupVolunteer(opportunity.id); setOpportunity(data); setSignedUp(data.signed_up); setToast(data.signed_up ? "Volunteer signup confirmed." : "Volunteer signup withdrawn."); }
    catch (requestError) { setError(communityError(requestError, "Unable to update volunteer signup.")); }
    finally { setSaving(false); }
  };

  const toggleRsvp = async (event) => {
    if (saving) return; setSaving(true); setError("");
    try { const { data } = await updateRsvp(event.id, event.my_status === "going" ? "not_going" : "going"); setEvents((items) => items.map((item) => item.id === event.id ? { ...item, ...data } : item)); setToast(data.my_status === "going" ? "RSVP confirmed." : "RSVP cancelled."); }
    catch (requestError) { setError(communityError(requestError, "Unable to update RSVP.")); }
    finally { setSaving(false); }
  };

  const openNotices = async () => { setShowNoticesModal(true); const unread = notices.filter((item) => !item.is_read); await Promise.allSettled(unread.map((item) => markNoticeRead(item.id))); setNotices((items) => items.map((item) => ({ ...item, is_read: true }))); };

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/community")} userRole="Resident Portal" userName={user ? `${user.first_name} ${user.last_name}` : "Resident"}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">

        {toast && <div className="fixed bottom-6 right-6 z-[60] bg-[#0f2336] text-white px-5 py-3 rounded-xl text-sm font-bold">{toast}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">{error}</div>}
        {/* Notices Modal */}
        {showNoticesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
              <button onClick={() => setShowNoticesModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <div className="mb-6 shrink-0">
                <h2 className="text-2xl font-extrabold text-[#0f2336] flex items-center gap-2">
                  <Megaphone size={24} className="text-blue-500" />
                  All Notices
                </h2>
                <p className="text-gray-500 text-sm mt-1">Complete history of community announcements.</p>
              </div>
              <div className="overflow-y-auto pr-2 space-y-4">
                {notices.map((n, i) => (
                  <div key={i} className={`relative pl-6 border-l-[3px] py-2 ${n.color}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-[#0f2336]`}>{n.target}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{n.time}</span>
                    </div>
                    <h3 className="font-bold text-[#0f2336] text-base mb-1">{n.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 relative inline-block">
          {/* Faint swoosh decoration behind title */}
          <div className="absolute -top-4 -left-6 w-32 h-16 border-t-2 border-l-2 border-primary/20 rounded-tl-[60px] rounded-br-[60px] -z-10 rotate-[-15deg]"></div>
          <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Community Hub</h1>
          <p className="text-gray-500 mt-2">Connect, participate, and stay informed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

          {/* Notice Board */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Megaphone size={20} className="text-blue-500" />
                Notice Board
              </h2>
              <button onClick={openNotices} className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">View All</button>
            </div>

            {loading && <p className="text-sm text-gray-500">Loading notices…</p>}{!loading && notices.length === 0 && <p className="text-sm text-gray-500">No active notices.</p>}<div className="space-y-6 pl-2">
              {notices.slice(0, 2).map((n, i) => (
                <div key={i} className={`relative pl-6 border-l-[3px] ${n.color}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md bg-white border border-gray-200 text-[#0f2336]`}>{n.target}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{n.time}</span>
                  </div>
                  <h3 className="font-bold text-[#0f2336] text-base mb-1">{n.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Poll */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-emerald-500" />
              Active Poll
            </h2>

            <div className="flex-1">
              <h3 className="font-bold text-[#0f2336] mb-1">{poll?.question || "No active poll"}</h3>
              <p className="text-xs text-gray-500 mb-6">{poll?.description || "Check back for the next community poll."}</p>

              <div className="space-y-3 mb-6">
                {pollOptions.map((opt) => (
                  <div 
                    key={opt.id} 
                    onClick={() => handleVote(opt.id)}
                    className={`relative h-8 bg-gray-50 rounded-lg overflow-hidden flex items-center px-3 border border-gray-100/50 group ${pollVoted ? 'cursor-default' : 'cursor-pointer hover:border-blue-300'}`}
                  >
                    <div className={`absolute top-0 left-0 h-full ${opt.bg} opacity-50 transition-all duration-500`} style={{ width: `${opt.val}%` }}></div>
                    <span className="relative z-10 text-xs font-semibold text-gray-700 flex-1">{opt.label}</span>
                    {pollVoted && <span className="relative z-10 text-xs font-bold text-gray-700">{opt.val}%</span>}
                  </div>
                ))}
              </div>
            </div>
            
            {pollVoted ? (
              <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Vote Recorded
              </div>
            ) : (
              <button className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#0f2336] font-bold text-sm rounded-xl transition-colors shadow-sm cursor-not-allowed opacity-50">
                Select an Option
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Upcoming Events */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#0f2336] flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Upcoming Events
              </h2>
              <div className="flex gap-2">
                <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"><ChevronLeft size={16} /></button>
                <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {events.map((ev, i) => (
                <button key={i} onClick={() => toggleRsvp(ev)} className="text-left min-w-[240px] p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-4 hover:shadow-sm hover:border-gray-200 transition-all cursor-pointer group">
                  <div className={`w-14 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${ev.color}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{ev.month}</span>
                    <span className="text-xl font-extrabold leading-none">{ev.day}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="font-bold text-[#0f2336] text-sm mb-1 group-hover:text-primary transition-colors">{ev.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5"><Clock size={12} /> {ev.time}</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><MapPin size={12} className="opacity-0 w-0 h-0" /> <span className="ml-0.5">• {ev.loc}{ev.my_status === "going" ? " • Going" : ""}</span></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Volunteer Board */}
          <div className="lg:col-span-6 bg-[#0f2336] p-6 rounded-3xl shadow-lg relative overflow-hidden group">
            {/* Background design elements */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex items-start justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HeartHandshake size={20} className="text-primary" />
                Volunteer Board
              </h2>
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider shadow-sm">{opportunity ? `${opportunity.spots_remaining} Needed` : "None Open"}</span>
            </div>

            <p className="text-sm text-gray-400 mb-6 relative z-10">Give back to the community. Join one of our active resident committees.</p>

            <div className={`bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative z-10 flex items-center justify-between gap-4 transition-colors ${signedUp ? 'bg-emerald-500/20 border-emerald-500/50' : 'group-hover:bg-white/10'}`}>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{opportunity?.title || "No active opportunity"}</h3>
                <p className="text-xs text-gray-400">{opportunity?.description || "New volunteer opportunities will appear here."}</p>
              </div>
              {signedUp ? (
                <button disabled={saving} onClick={toggleVolunteer} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-colors shrink-0 backdrop-blur-sm flex items-center gap-1">
                  <CheckCircle2 size={14} /> Signed Up
                </button>
              ) : (
                <button disabled={!opportunity || saving || opportunity.spots_remaining === 0} onClick={toggleVolunteer} className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shrink-0 backdrop-blur-sm">
                  Sign Up
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
