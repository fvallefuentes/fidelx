"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Bell, Check, CheckCheck } from "lucide-react";

type NotificationType =
  | "CLIENT_SIGNUP"
  | "CLIENT_FIRST_REWARD"
  | "CLIENT_BIRTHDAY_SOON"
  | "CLIENT_BIRTHDAY_TODAY"
  | "CAMPAIGN_SENT"
  | "PLAN_LIMIT_WARNING"
  | "PLAN_LIMIT_REACHED"
  | "SYSTEM";

type Notif = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_COLOR: Record<NotificationType, string> = {
  CLIENT_SIGNUP: "#d4ff4e",
  CLIENT_FIRST_REWARD: "#ffd66b",
  CLIENT_BIRTHDAY_SOON: "#ff9aef",
  CLIENT_BIRTHDAY_TODAY: "#ff7a6b",
  CAMPAIGN_SENT: "#7aa2ff",
  PLAN_LIMIT_WARNING: "#ffd66b",
  PLAN_LIMIT_REACHED: "#ff7a6b",
  SYSTEM: "#c9ccc3",
};

const POLL_INTERVAL_MS = 60_000; // 60s

export function NotificationsBell() {
  const t = useTranslations("Dashboard.notifications");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const res = await fetch("/api/merchants/notifications?limit=50");
        if (!res.ok) return;
        const data = await res.json();
        setNotifs(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {
        // silent fail
      }
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAsRead(id: string) {
    setNotifs((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/merchants/notifications/${id}/read`, {
        method: "POST",
      });
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    setLoading(true);
    try {
      await fetch(`/api/merchants/notifications/read-all`, {
        method: "POST",
      });
      const now = new Date().toISOString();
      setNotifs((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || now }))
      );
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unreadCount > 0
            ? t("unread", { count: unreadCount })
            : t("title")
        }
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown" role="dialog" aria-label={t("title")}>
          <div className="notif-dropdown-head">
            <span className="notif-dropdown-title">
              {t("title")}
              {unreadCount > 0 && (
                <span className="notif-dropdown-count">{unreadCount}</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={loading}
                className="notif-dropdown-mark-all"
              >
                <CheckCheck size={12} /> {t("markAll")}
              </button>
            )}
          </div>

          <div className="notif-dropdown-list">
            {notifs.length === 0 ? (
              <div className="notif-empty">
                <Bell size={20} />
                <p>{t("empty")}</p>
                <span>{t("emptyHint")}</span>
              </div>
            ) : (
              notifs.map((n) => {
                const isUnread = !n.readAt;
                const item = (
                  <>
                    <span
                      className="notif-item-dot"
                      style={{ background: TYPE_COLOR[n.type] }}
                      aria-hidden="true"
                    />
                    <div className="notif-item-body">
                      <div className="notif-item-title">{n.title}</div>
                      {n.body && (
                        <div className="notif-item-text">{n.body}</div>
                      )}
                      <div className="notif-item-time">
                        {timeAgo(new Date(n.createdAt), t, locale)}
                      </div>
                    </div>
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="notif-item-read-btn"
                        aria-label={t("markRead")}
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </>
                );
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      if (isUnread) markAsRead(n.id);
                      setOpen(false);
                    }}
                    className={`notif-item${isUnread ? " unread" : ""}`}
                  >
                    {item}
                  </Link>
                ) : (
                  <div
                    key={n.id}
                    className={`notif-item${isUnread ? " unread" : ""}`}
                  >
                    {item}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(
  date: Date,
  t: ReturnType<typeof useTranslations>,
  locale: string
): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return t("time.now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("time.minute", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time.hour", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("time.day", { count: days });
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}
