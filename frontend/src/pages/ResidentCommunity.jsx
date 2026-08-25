import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRealtimeRefresh } from "@/features/realtime/useRealtimeRefresh";
import { getResidentSidebarItems } from "@/components/resident/ResidentSidebarConfig";
import { useAuth } from "@/hooks/useAuth";
import { communityError, getActivePoll, listEvents, listNotices, listVolunteers, markNoticeRead, signupVolunteer, updateRsvp, votePoll, withdrawVolunteer } from "@/features/community/api";
import { Megaphone, BarChart3, Calendar, HeartHandshake, ChevronLeft, ChevronRight, Clock, MapPin, X, CheckCircle2 } from "lucide-react";

const NOTICE_PAGE_SIZE = 20;
const SOCIETY_TIME_ZONE = "Asia/Kolkata";
const noticeColors = ["bg-blue-100 text-blue-700 border-blue-500", "bg-emerald-100 text-emerald-700 border-emerald-500", "bg-orange-100 text-orange-700 border-orange-500"];

const mapNotices = (items, offset = 0) => items.map((item, index) => ({
  ...item,
  target: item.target_label,
  time: new Date(item.published_at).toLocaleString("en-IN", { timeZone: SOCIETY_TIME_ZONE }),
  desc: item.body,
  color: noticeColors[(offset + index) % noticeColors.length],
}));

const mapEvent = (item, index) => {
  const start = new Date(item.starts_at);
  const end = new Date(item.ends_at);
  return {
    ...item,
    month: start.toLocaleString("en-IN", { month: "short", timeZone: SOCIETY_TIME_ZONE }).toUpperCase(),
    day: start.toLocaleString("en-IN", { day: "2-digit", timeZone: SOCIETY_TIME_ZONE }),
    time: `${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: SOCIETY_TIME_ZONE })} - ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: SOCIETY_TIME_ZONE })}`,
    loc: item.location,
    color: index % 2 ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-600",
  };
};

export default function ResidentCommunity() {
  const location = useLocation();
  const { user } = useAuth();
  const eventDeepLinkHandled = useRef(false);
  const [pollVoted, setPollVoted] = useState(false);
  const [poll, setPoll] = useState(null);
  const [pollOptions, setPollOptions] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [volunteerIndex, setVolunteerIndex] = useState(0);
  const [showNoticesModal, setShowNoticesModal] = useState(location.state?.view === "notices");
  const [notices, setNotices] = useState([]);
  const [noticePage, setNoticePage] = useState(1);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [events, setEvents] = useState([]);
  const [eventPage, setEventPage] = useState(0);
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
      const [{ data: noticeData }, { data: eventData }, { data: pollData }, { data: volunteerData }] = await Promise.all([listNotices({ page: 1, page_size: NOTICE_PAGE_SIZE }), listEvents(), getActivePoll(), listVolunteers()]);
      const mappedNotices = mapNotices(noticeData.items);
      if (location.state?.view === "notices") {
        await Promise.allSettled(mappedNotices.filter((item) => !item.is_read).map((item) => markNoticeRead(item.id)));
        setNotices(mappedNotices.map((item) => ({ ...item, is_read: true })));
      } else setNotices(mappedNotices);
      setNoticePage(noticeData.page); setNoticeTotal(noticeData.total);
      setEvents(eventData.map(mapEvent));
      const selectedEventIndex = !eventDeepLinkHandled.current && location.state?.eventId
        ? eventData.findIndex((item) => item.id === location.state.eventId)
        : -1;
      if (!eventDeepLinkHandled.current && location.state?.eventId) eventDeepLinkHandled.current = true;
      const lastEventPage = Math.max(0, Math.ceil(eventData.length / 2) - 1);
      setEventPage((current) => selectedEventIndex >= 0
        ? Math.floor(selectedEventIndex / 2)
        : Math.min(current, lastEventPage));
      applyPoll(pollData);
      setOpportunities(volunteerData);
      setVolunteerIndex((current) => Math.min(current, Math.max(0, volunteerData.length - 1)));
    } catch (requestError) { setError(communityError(requestError, "Unable to load Community Hub.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void Promise.resolve().then(load); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRealtimeRefresh(["community"], load);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleVote = async (id) => {
    if (pollVoted || !poll || saving) return; setSaving(true); setError("");
    try { const { data } = await votePoll(poll.id, id); applyPoll(data); setToast("Vote recorded. Votes are final."); }
    catch (requestError) { setError(communityError(requestError, "Unable to record your vote.")); }
    finally { setSaving(false); }
  };

  const toggleVolunteer = async () => {
    if (!opportunity || saving) return; setSaving(true); setError("");
    try { const { data } = opportunity.signed_up ? await withdrawVolunteer(opportunity.id) : await signupVolunteer(opportunity.id); setOpportunities((items) => items.map((item) => item.id === data.id ? data : item)); setToast(data.signed_up ? "Volunteer signup confirmed." : "Volunteer signup withdrawn."); }
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
  const loadMoreNotices = async () => {
    setSaving(true); setError("");
    try {
      const { data } = await listNotices({ page: noticePage + 1, page_size: NOTICE_PAGE_SIZE });
      const mapped = mapNotices(data.items, notices.length);
      await Promise.allSettled(mapped.filter((item) => !item.is_read).map((item) => markNoticeRead(item.id)));
      setNotices((items) => [...new Map([...items, ...mapped.map((item) => ({ ...item, is_read: true }))].map((item) => [item.id, item])).values()]);
      setNoticePage(data.page); setNoticeTotal(data.total);
    } catch (requestError) { setError(communityError(requestError, "Unable to load more notices.")); }
    finally { setSaving(false); }
  };
  const eventPageSize = 2;
  const eventPages = Math.max(1, Math.ceil(events.length / eventPageSize));
  const visibleEvents = events.slice(eventPage * eventPageSize, (eventPage + 1) * eventPageSize);
  const opportunity = opportunities[volunteerIndex] || null;
  const signedUp = Boolean(opportunity?.signed_up);

  return (
    <DashboardLayout sidebarItems={getResidentSidebarItems("/resident/community")} userRole="Resident Portal" userName={user ? `${user.first_name} ${user.last_name}` : "Resident"}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">

        {toast && <div role="status" className="fixed bottom-6 right-6 z-[60] bg-[#0f2336] text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-3"><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast("")}><X size={16}/></button></div>}
        {error && <div role="alert" className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold flex items-center justify-between gap-3"><span>{error}</span><button onClick={load} className="font-bold">Retry</button></div>}
        {/* Notices Modal */}
        {showNoticesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
              <button aria-label="Close notices" onClick={() => setShowNoticesModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
              <div className="mb-6 shrink-0">
                <h2 className="text-2xl font-extrabold text-[#0f2336] flex items-center gap-2">
                  <Megaphone size={24} className="text-blue-500" />
                  All Notices
                </h2>
              </div>
              <div className="overflow-y-auto pr-2 space-y-4">
                {notices.length === 0 && <p className="text-sm text-gray-500">No active notices.</p>}
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
                {notices.length < noticeTotal && <button disabled={saving} onClick={loadMoreNotices} className="w-full py-2.5 border rounded-xl text-sm font-bold disabled:opacity-50">{saving ? "Loading…" : "Load More Notices"}</button>}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8 relative inline-block">
          {/* Faint swoosh decoration behind title */}
          <div className="absolute -top-4 -left-6 w-32 h-16 border-t-2 border-l-2 border-primary/20 rounded-tl-[60px] rounded-br-[60px] -z-10 rotate-[-15deg]"></div>
          <h1 className="text-3xl font-extrabold text-[#0f2336] tracking-tight">Community Hub</h1>
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
              {poll?.description && <p className="text-xs text-gray-500 mb-6">{poll.description}</p>}

              <div className="space-y-3 mb-6">
                {pollOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.id} 
                    onClick={() => handleVote(opt.id)}
                    disabled={pollVoted || saving}
                    aria-pressed={opt.id === poll?.selected_option_id}
                    className={`relative w-full h-8 bg-gray-50 rounded-lg overflow-hidden flex items-center px-3 border border-gray-100/50 group text-left ${pollVoted ? 'cursor-default' : 'cursor-pointer hover:border-blue-300'}`}
                  >
                    <div className={`absolute top-0 left-0 h-full ${opt.bg} opacity-50 transition-all duration-500`} style={{ width: `${opt.val}%` }}></div>
                    <span className="relative z-10 text-xs font-semibold text-gray-700 flex-1">{opt.label}</span>
                    {pollVoted && <span className="relative z-10 text-xs font-bold text-gray-700">{opt.val}%</span>}
                  </button>
                ))}
              </div>
            </div>
            
            {!poll ? (
              <div className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl text-center">
                No Poll Open
              </div>
            ) : pollVoted ? (
              <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-xl text-center flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Vote Recorded
              </div>
            ) : (
              <div className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-500 font-bold text-sm rounded-xl text-center">
                Select an Option
              </div>
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
                <button aria-label="Previous events" disabled={eventPage === 0} onClick={() => setEventPage((page) => page - 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
                <button aria-label="Next events" disabled={eventPage >= eventPages - 1} onClick={() => setEventPage((page) => page + 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {visibleEvents.map((ev) => (
                <button key={ev.id} disabled={saving} onClick={() => toggleRsvp(ev)} className="text-left min-w-[240px] flex-1 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-4 hover:shadow-sm hover:border-gray-200 disabled:opacity-60 transition-all cursor-pointer group">
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
              {!loading && events.length === 0 && <p className="text-sm text-gray-500">No upcoming events scheduled.</p>}
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
              <div className="flex items-center gap-2"><button aria-label="Previous volunteer opportunity" disabled={volunteerIndex === 0} onClick={() => setVolunteerIndex((index) => index - 1)} className="p-1 rounded-lg border border-white/20 text-white disabled:opacity-30"><ChevronLeft size={14}/></button><button aria-label="Next volunteer opportunity" disabled={volunteerIndex >= opportunities.length - 1} onClick={() => setVolunteerIndex((index) => index + 1)} className="p-1 rounded-lg border border-white/20 text-white disabled:opacity-30"><ChevronRight size={14}/></button><span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider shadow-sm">{opportunity ? `${opportunity.spots_remaining} Needed` : "None Open"}</span></div>
            </div>

            <div className={`mt-6 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl relative z-10 flex items-center justify-between gap-4 transition-colors ${signedUp ? 'bg-emerald-500/20 border-emerald-500/50' : 'group-hover:bg-white/10'}`}>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{opportunity?.title || "No active opportunity"}</h3>
                {opportunity?.description && <p className="text-xs text-gray-400">{opportunity.description}</p>}
              </div>
              {signedUp ? (
                <button disabled={saving} onClick={toggleVolunteer} className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-colors shrink-0 backdrop-blur-sm flex items-center gap-1">
                  <CheckCircle2 size={14} /> Withdraw
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
