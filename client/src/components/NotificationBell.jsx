import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/auth.context";
import { api } from "../lib/api";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.role !== "USER") return undefined;
    let active = true;
    const refresh = () => api.get("/user/notifications/unread-count")
      .then(({ data }) => { if (active) setUnreadCount(Number(data.unread_count) || 0); })
      .catch(() => { if (active) setUnreadCount(0); });
    refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!open || user?.role !== "USER") return;
    let active = true;
    api.get("/user/notifications")
      .then(({ data }) => { if (active) setNotifications(data.notifications || []); })
      .catch(() => { if (active) setNotifications([]); });
    return () => { active = false; };
  }, [open, user?.id, user?.role]);

  if (user?.role !== "USER") return null;

  const markRead = async (ids) => {
    if (!ids.length) return;
    try {
      await api.post("/user/notifications/read", { notification_ids: ids });
      const idSet = new Set(ids);
      setNotifications((current) => current.map((notification) => idSet.has(notification.id)
        ? { ...notification, read_at: new Date().toISOString() }
        : notification));
      setUnreadCount((current) => Math.max(0, current - notifications.filter((item) => ids.includes(item.id) && !item.read_at).length));
    } catch { /* The next poll refreshes the unread count. */ }
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) await markRead([notification.id]);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = async () => {
    const ids = notifications.filter((notification) => !notification.read_at).map((notification) => notification.id);
    await markRead(ids);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <Bell size={17} aria-hidden="true" />
        {unreadCount > 0 && <span className="absolute -end-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && <>
        <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <section aria-label="Notifications" className="absolute end-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div><p className="font-bold text-white">Notifications</p><p className="text-xs text-slate-400">{unreadCount} unread</p></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"><CheckCheck size={14} />Mark all read</button>}
          </header>
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p> : notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`w-full border-b border-white/[0.06] px-4 py-3 text-start transition-colors hover:bg-white/[0.05] ${notification.read_at ? "opacity-70" : "bg-emerald-500/[0.06]"}`}>
                <span className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-slate-600" : "bg-emerald-400"}`} /><span className="min-w-0"><span className="block text-sm font-bold text-white">{notification.title}</span><span className="mt-1 block text-xs leading-5 text-slate-300">{notification.body}</span><time className="mt-1 block text-[10px] text-slate-500">{new Date(notification.created_at).toLocaleString()}</time></span></span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setOpen(false); navigate("/my-bids"); }} className="w-full px-4 py-3 text-center text-xs font-bold text-emerald-300 hover:bg-white/[0.04]">View my bids</button>
        </section>
      </>}
    </div>
  );
};

export default NotificationBell;
