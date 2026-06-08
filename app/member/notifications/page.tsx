"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getNotificationsByUser, markAllRead } from "@/controllers/NotificationController";
import { formatDate } from "@/utils/Formatters";

const NOTIF_CONFIG: Record<string, { icon: string; border: string; bg: string }> = {
  "📋": { icon: "📋", border: "border-l-[#4B4BF7]", bg: "bg-indigo-50" },
  "⚠️": { icon: "⚠️", border: "border-l-amber-500", bg: "bg-amber-50" },
  "✅": { icon: "✅", border: "border-l-green-500", bg: "bg-green-50" },
  "🎉": { icon: "🎉", border: "border-l-green-500", bg: "bg-green-50" },
  "❌": { icon: "❌", border: "border-l-red-500", bg: "bg-red-50" },
  "💸": { icon: "💸", border: "border-l-green-500", bg: "bg-green-50" },
  "💰": { icon: "💰", border: "border-l-amber-500", bg: "bg-amber-50" },
};

const getConfig = (title: string) => {
  const emoji = title.match(/^(📋|⚠️|✅|🎉|❌|💸|💰)/)?.[1];
  return NOTIF_CONFIG[emoji||""] || { icon: "🔔", border: "border-l-gray-300", bg: "bg-white" };
};

export default function NotificationsPage() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userProfile) return;
    (async () => {
      try {
        const data = await getNotificationsByUser(userProfile.uid);
        setNotifications(data);
        setUnread(data.filter((n: any) => !n.read).length);
        await markAllRead(userProfile.uid).catch(() => {});
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userProfile]);

  return (
    <div>
      <PageHeader title={unread > 0 ? `Notifications (${unread} new)` : "Notifications"} />
      <div className="px-4 space-y-2 pb-10">
        {loading ? <LoadingSpinner /> : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No Notifications Yet"
            subtitle="Loan updates, wallet credits and payment alerts appear here" />
        ) : notifications.map((n: any, i) => {
          const cfg = getConfig(n.title || "");
          return (
            <div key={n.notificationId || n.id || i}
              className={`rounded-2xl p-4 border-l-4 ${cfg.border} ${cfg.bg} ${!n.read ? "shadow-sm" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 text-sm">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#4B4BF7] shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDate(n.createdAt?.toDate?.() || n.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
