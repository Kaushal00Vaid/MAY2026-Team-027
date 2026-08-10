import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useRealtime } from "./RealtimeContext";

const relativeTime = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function NotificationMenu() {
  const { notifications, unreadCount, isLoading, error, refreshNotifications, markRead, markAllRead } = useRealtime();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button type="button" aria-label={`Notifications, ${unreadCount} unread`} onClick={() => setOpen((value) => !value)} className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all">
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] max-h-[28rem] overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div><p className="font-semibold text-sm">Notifications</p><p className="text-xs text-gray-500">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button type="button" onClick={() => markAllRead().catch(() => undefined)} className="text-xs font-medium text-primary flex items-center gap-1"><CheckCheck size={14} /> Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {error && notifications.length === 0 ? <div className="p-6 text-center"><p role="alert" className="text-sm text-red-600">{error}</p><button type="button" onClick={() => refreshNotifications().catch(() => undefined)} className="mt-3 text-xs font-semibold text-primary">Retry</button></div> : isLoading && notifications.length === 0 ? <div className="p-8 flex justify-center"><LoaderCircle className="animate-spin text-gray-400" /></div> : notifications.length === 0 ? <p className="p-8 text-sm text-center text-gray-500">No notifications yet.</p> : notifications.map((item) => (
              <button key={item.id} type="button" onClick={() => !item.is_read && markRead(item.id).catch(() => undefined)} className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${item.is_read ? "bg-white" : "bg-primary/[0.04]"}`}>
                <div className="flex gap-2"><span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${item.is_read ? "bg-transparent" : "bg-primary"}`} /><div><p className="text-sm font-semibold text-gray-800">{item.title}</p><p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.message}</p><p className="text-[10px] text-gray-400 mt-1">{relativeTime(item.created_at)}</p></div></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
