import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCheck,
  Info,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Layout } from "../components/Layout";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useBackend";
import { NotificationType } from "../types";
import type { InAppNotification } from "../types";

// ─── Type metadata ────────────────────────────────────────────────────────────

interface TypeMeta {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  borderColor: string;
  label: string;
  filterKey: FilterTab;
}

type FilterTab = "all" | "unread" | "payments" | "refunds" | "system";

const TYPE_META: Record<string, TypeMeta> = {
  [NotificationType.payment]: {
    icon: Receipt,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
    borderColor: "border-l-emerald-400/60",
    label: "Payment",
    filterKey: "payments",
  },
  [NotificationType.invoice]: {
    icon: AlertCircle,
    iconColor: "text-red-400",
    iconBg: "bg-red-400/10",
    borderColor: "border-l-red-400/60",
    label: "Overdue",
    filterKey: "system",
  },
  [NotificationType.booking]: {
    icon: Calendar,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
    borderColor: "border-l-blue-400/60",
    label: "Booking",
    filterKey: "all",
  },
  [NotificationType.voucher]: {
    icon: RotateCcw,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-400/10",
    borderColor: "border-l-orange-400/60",
    label: "Refund",
    filterKey: "refunds",
  },
  [NotificationType.agent]: {
    icon: Info,
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
    borderColor: "border-l-accent/60",
    label: "Agent",
    filterKey: "all",
  },
  [NotificationType.system]: {
    icon: Info,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted/60",
    borderColor: "border-l-muted-foreground/40",
    label: "System",
    filterKey: "system",
  },
};

const FALLBACK_META: TypeMeta = {
  icon: Bell,
  iconColor: "text-muted-foreground",
  iconBg: "bg-muted/60",
  borderColor: "border-l-muted-foreground/40",
  label: "Notification",
  filterKey: "all",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "payments", label: "Payments" },
  { key: "refunds", label: "Refunds" },
  { key: "system", label: "System" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "Yesterday";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTypeMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? FALLBACK_META;
}

function filterNotifications(
  notifications: NotificationBackendShape[],
  tab: FilterTab,
): NotificationBackendShape[] {
  if (tab === "all") return notifications;
  if (tab === "unread") return notifications.filter((n) => !n.isRead);
  return notifications.filter((n) => {
    const meta = getTypeMeta(n.notificationType);
    return meta.filterKey === tab;
  });
}

// ─── Backend shape (as returned from useNotifications) ───────────────────────

interface NotificationBackendShape {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: bigint;
  entityId?: string;
  entityType?: string;
}

// ─── Notification row ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  notification: NotificationBackendShape;
  onMarkRead: (id: string) => void;
  isMarkingRead: boolean;
  activeId: string | null;
  onToggleExpand: (id: string) => void;
}

function NotificationRow({
  notification: n,
  onMarkRead,
  isMarkingRead,
  activeId,
  onToggleExpand,
}: NotificationRowProps) {
  const meta = getTypeMeta(n.notificationType);
  const Icon = meta.icon;
  const isExpanded = activeId === n.id;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.2 }}
      className={[
        "group relative flex gap-4 p-4 transition-colors duration-200 cursor-pointer",
        "border-l-2",
        !n.isRead
          ? `${meta.borderColor} bg-accent/[0.025]`
          : "border-l-transparent",
        "hover:bg-muted/30",
      ].join(" ")}
      onClick={() => {
        if (!n.isRead) onMarkRead(n.id);
        onToggleExpand(n.id);
      }}
      data-ocid={`notification-row-${n.id}`}
    >
      {/* Type icon circle */}
      <div
        className={[
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          meta.iconBg,
        ].join(" ")}
      >
        <Icon className={`w-5 h-5 ${meta.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p
              className={[
                "text-sm truncate",
                !n.isRead
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/75",
              ].join(" ")}
            >
              {n.title}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 border flex-shrink-0 ${meta.iconColor} border-current/30`}
            >
              {meta.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(n.createdAt)}
            </span>
            {!n.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1 break-words leading-relaxed">
          {n.message}
        </p>

        <AnimatePresence>
          {isExpanded && n.entityId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  <span className="text-accent font-medium">
                    {n.entityType ?? "Reference"}:{" "}
                  </span>
                  <span className="font-mono text-foreground/70">
                    {n.entityId}
                  </span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Hover mark-read button */}
      {!n.isRead && (
        <button
          type="button"
          className={[
            "absolute right-4 top-1/2 -translate-y-1/2",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent",
            "px-2 py-1 rounded-md hover:bg-accent/10 border border-transparent hover:border-accent/20",
          ].join(" ")}
          aria-label="Mark as read"
          disabled={isMarkingRead}
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(n.id);
          }}
          data-ocid={`mark-read-btn-${n.id}`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Mark read</span>
        </button>
      )}
    </motion.li>
  );
}

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="divide-y divide-border/30">
      {(["a", "b", "c", "d", "e", "f"] as const).map((id) => (
        <div key={`skel-${id}`} className="flex gap-4 p-4">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ activeTab }: { activeTab: FilterTab }) {
  const labels: Record<FilterTab, string> = {
    all: "No notifications yet",
    unread: "All caught up!",
    payments: "No payment notifications",
    refunds: "No refund notifications",
    system: "No system alerts",
  };
  const subtexts: Record<FilterTab, string> = {
    all: "You're all set. Notifications will appear here when there's activity.",
    unread: "You've read all your notifications.",
    payments: "Payment receipts and confirmations will appear here.",
    refunds: "Refund updates and status changes will appear here.",
    system: "System alerts and important notices will appear here.",
  };
  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-4"
      data-ocid="notifications-empty"
    >
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
        <Bell className="w-8 h-8 text-accent/50" />
      </div>
      <div className="text-center">
        <p className="text-foreground font-semibold text-sm">
          {labels[activeTab]}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {subtexts[activeTab]}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: rawNotifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cast to our local shape (notificationType is string from backend)
  const notifications = rawNotifications as NotificationBackendShape[];

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const filtered = filterNotifications(notifications, activeTab);

  const tabCounts: Record<FilterTab, number> = {
    all: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    payments: notifications.filter(
      (n) => getTypeMeta(n.notificationType).filterKey === "payments",
    ).length,
    refunds: notifications.filter(
      (n) => getTypeMeta(n.notificationType).filterKey === "refunds",
    ).length,
    system: notifications.filter(
      (n) => getTypeMeta(n.notificationType).filterKey === "system",
    ).length,
  };

  function handleMarkRead(id: string) {
    markRead.mutate(id);
  }

  function handleToggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <Layout title="Notifications">
      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold text-foreground leading-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} unread notification
                  {unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/40 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              data-ocid="mark-all-read"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/30 overflow-x-auto"
          data-ocid="notification-filter-tabs"
        >
          {FILTER_TABS.map(({ key, label }) => {
            const count = tabCounts[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0",
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                data-ocid={`tab-${key}`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={[
                      "text-[10px] px-1 py-0.5 rounded-full font-semibold leading-none",
                      isActive && key === "unread"
                        ? "bg-blue-400/20 text-blue-400"
                        : isActive
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications card */}
        <div className="glass-card overflow-hidden rounded-xl border border-border/30">
          {isLoading ? (
            <SkeletonRows />
          ) : filtered.length === 0 ? (
            <EmptyState activeTab={activeTab} />
          ) : (
            <motion.ul
              layout
              className="divide-y divide-border/20"
              data-ocid="notifications-list"
            >
              <AnimatePresence initial={false}>
                {filtered.map((notif) => (
                  <NotificationRow
                    key={notif.id}
                    notification={notif}
                    onMarkRead={handleMarkRead}
                    isMarkingRead={markRead.isPending}
                    activeId={expandedId}
                    onToggleExpand={handleToggleExpand}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>

        {/* Footer hint */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground/50 text-center">
            Click a notification to expand details. Unread notifications are
            marked automatically on click.
          </p>
        )}
      </div>
    </Layout>
  );
}
