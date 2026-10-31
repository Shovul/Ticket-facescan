"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, AlertCircle, Info } from "lucide-react";
import "../../styles/notifications.css";

type NotificationKind = "success" | "error" | "info";
const NotificationContext = createContext<(message: string, kind?: NotificationKind) => void>(() => {});

// Một vùng thông báo dùng chung cho các trang, tự thay nội dung và đóng sau một khoảng thời gian.
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{ message: string; kind: NotificationKind; id: number } | null>(null);
  const nextId = useRef(0);
  const notify = useCallback((message: string, kind: NotificationKind = "success") => {
    if (message.trim()) setNotification({ message, kind, id: ++nextId.current });
  }, []);
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), notification.kind === "error" ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [notification]);
  const Icon = notification?.kind === "error" ? AlertCircle : notification?.kind === "info" ? Info : Check;
  return <NotificationContext.Provider value={notify}>{children}
    {notification && <div className={`ep-notification ${notification.kind}`} role={notification.kind === "error" ? "alert" : "status"} aria-atomic="true" key={notification.id}>
      <span className="ep-notification-icon"><Icon size={14} strokeWidth={2} /></span>
      <span>{notification.message}</span>
    </div>}
  </NotificationContext.Provider>;
}

export const useNotification = () => useContext(NotificationContext);
