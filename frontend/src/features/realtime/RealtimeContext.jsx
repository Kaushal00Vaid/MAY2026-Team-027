import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import * as realtimeApi from "./api";

const RealtimeContext = createContext(null);

const wsUrl = (ticket) => {
  const api = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const url = new URL(api, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = new URLSearchParams({ ticket }).toString();
  return url.toString();
};

export function RealtimeProvider({ children }) {
  const { isAuthenticated, accessToken } = useAuthContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const reconnectRef = useRef(null);
  const retriesRef = useRef(0);
  const generationRef = useRef(0);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError("");
    try {
      const { data } = await realtimeApi.getNotifications({ page: 1, page_size: 30 });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Notifications could not be loaded.");
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    let stopped = false;

    const cleanupSocket = () => {
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) socket.close(1000, "Session changed");
    };

    if (!isAuthenticated || !accessToken) {
      cleanupSocket();
      queueMicrotask(() => {
        if (generation === generationRef.current) {
          setNotifications([]);
          setUnreadCount(0);
          setError("");
        }
      });
      return cleanupSocket;
    }

    queueMicrotask(() => refreshNotifications().catch(() => undefined));

    const connect = async () => {
      if (stopped || generation !== generationRef.current) return;
      try {
        const { data } = await realtimeApi.createWebSocketTicket();
        if (stopped || generation !== generationRef.current) return;
        const socket = new WebSocket(wsUrl(data.ticket));
        socketRef.current = socket;
        socket.onopen = () => { retriesRef.current = 0; };
        socket.onmessage = (message) => {
          let event;
          try { event = JSON.parse(message.data); } catch { return; }
          if (event.type !== "notification.created") return;
          const item = event.notification;
          setNotifications((current) => [item, ...current.filter((old) => old.id !== item.id)].slice(0, 30));
          setUnreadCount((count) => count + (item.is_read ? 0 : 1));
          window.dispatchEvent(new CustomEvent("societysync:realtime", { detail: item }));
        };
        socket.onclose = (closeEvent) => {
          if (stopped || closeEvent.code === 1000) return;
          const delay = Math.min(30000, 1000 * (2 ** retriesRef.current));
          retriesRef.current += 1;
          reconnectRef.current = window.setTimeout(connect, delay);
        };
      } catch {
        if (!stopped) {
          const delay = Math.min(30000, 1000 * (2 ** retriesRef.current));
          retriesRef.current += 1;
          reconnectRef.current = window.setTimeout(connect, delay);
        }
      }
    };
    connect();
    return () => { stopped = true; cleanupSocket(); };
  }, [accessToken, isAuthenticated, refreshNotifications]);

  const markRead = useCallback(async (id) => {
    const { data } = await realtimeApi.markNotificationRead(id);
    setNotifications((items) => items.map((item) => item.id === id ? data : item));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await realtimeApi.markAllNotificationsRead();
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  }, []);

  return <RealtimeContext.Provider value={{ notifications, unreadCount, isLoading, error, refreshNotifications, markRead, markAllRead }}>{children}</RealtimeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used inside RealtimeProvider");
  return context;
}
