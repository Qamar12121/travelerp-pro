import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Building2,
  DollarSign,
  FileText,
  LogIn,
  LogOut,
  Plane,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { createActor } from "../backend";
import type {
  ActivityLogEntry,
  Agency,
  AgencyStats,
  PlatformStats,
} from "../backend.d";
import { useAuthStore } from "../store/auth";

// ─── Admin theme constants ────────────────────────────────────────────────────
const CR = "oklch(0.55 0.22 22)";
const CR_DIM = "oklch(0.55 0.22 22 / 0.10)";
const CR_BORDER = "oklch(0.55 0.22 22 / 0.35)";
const CR_GLOW = "0 0 30px oklch(0.55 0.22 22 / 0.15)";

// ─── Backend hooks ────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
}

function useAllAgencies() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["admin", "agencies"],
    queryFn: async () => {
      const result = await actor!.getAllAgencies();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

function usePlatformStats() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<PlatformStats>({
    queryKey: ["admin", "platformStats"],
    queryFn: async () => {
      const result = await actor!.getPlatformStats();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 120_000,
  });
}

function useAgencyStats(agencyId: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["admin", "agencyStats", agencyId],
    queryFn: async () => {
      const result = await actor!.getAgencyStats(agencyId!);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!agencyId,
  });
}

function useAgencyActivityLog(agencyId: string | null) {
  const { actor, isFetching } = useBackendActor();
  return useQuery<ActivityLogEntry[]>({
    queryKey: ["admin", "activityLog", agencyId],
    queryFn: async () => {
      const result = await actor!.getAgencyActivityLog(agencyId!);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!agencyId,
  });
}

function useUpdateAgencyStatus() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agencyId,
      isActive,
    }: { agencyId: string; isActive: boolean }) => {
      const result = await actor!.updateAgencyStatus(agencyId, isActive);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agencies"] });
    },
  });
}

// ─── Helper utils ─────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtDate(ts: bigint | undefined) {
  if (!ts) return "—";
  return new Date(Number(ts / 1_000_000n)).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRelative(ts: bigint | undefined) {
  if (!ts) return "Never";
  const ms = Number(ts / 1_000_000n);
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Event type icon + color ──────────────────────────────────────────────────

function getEventMeta(eventType: string): {
  icon: React.ElementType;
  color: string;
  label: string;
} {
  const map: Record<
    string,
    { icon: React.ElementType; color: string; label: string }
  > = {
    invoiceCreated: {
      icon: FileText,
      color: "oklch(0.75 0.15 82)",
      label: "Invoice Created",
    },
    refundCreated: {
      icon: RefreshCw,
      color: "oklch(0.65 0.22 22)",
      label: "Refund Created",
    },
    paymentRecorded: {
      icon: DollarSign,
      color: "oklch(0.75 0.18 150)",
      label: "Payment Recorded",
    },
    agentAdded: {
      icon: UserPlus,
      color: "oklch(0.6 0.17 240)",
      label: "Agent Added",
    },
    agentRemoved: { icon: UserMinus, color: CR, label: "Agent Removed" },
    login: { icon: LogIn, color: "oklch(0.7 0.15 300)", label: "Login" },
  };
  return (
    map[eventType] ?? {
      icon: Activity,
      color: "oklch(0.6 0 0)",
      label: eventType,
    }
  );
}

// ─── Platform Stat Card ───────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading?: boolean;
  delay?: number;
  sub?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  delay = 0,
  sub,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl p-5 transition-smooth"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${CR_BORDER}`,
        backdropFilter: "blur(12px)",
        boxShadow: CR_GLOW,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: CR_DIM }}
        >
          <Icon className="w-4 h-4" style={{ color: CR }} />
        </div>
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-28"
          style={{ background: "oklch(0.16 0 0)" }}
        />
      ) : (
        <>
          <p className="font-display text-2xl font-semibold text-foreground">
            {value}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </motion.div>
  );
}

// ─── Agency Status Badge ──────────────────────────────────────────────────────

function AgencyStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <Badge
        className="text-xs font-medium px-2 py-0.5"
        style={{
          color: "oklch(0.7 0.18 150)",
          background: "oklch(0.7 0.18 150 / 0.12)",
          border: "1px solid oklch(0.7 0.18 150 / 0.3)",
        }}
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      className="text-xs font-medium px-2 py-0.5"
      style={{
        color: CR,
        background: CR_DIM,
        border: `1px solid ${CR_BORDER}`,
      }}
    >
      Inactive
    </Badge>
  );
}

// ─── Activity Log Side Panel ──────────────────────────────────────────────────

interface ActivityPanelProps {
  agency: Agency;
  onClose: () => void;
}

function ActivityPanel({ agency, onClose }: ActivityPanelProps) {
  const { data: log, isLoading } = useAgencyActivityLog(agency.id);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col"
        style={{
          background: "oklch(0.09 0 0)",
          borderLeft: `1px solid ${CR_BORDER}`,
          boxShadow: `-24px 0 80px rgba(0,0,0,0.5), ${CR_GLOW}`,
        }}
        aria-label={`Activity log for ${agency.agencyName}`}
      >
        {/* Panel header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${CR_BORDER}` }}
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Activity Log
            </p>
            <h3 className="font-display text-base font-semibold text-foreground">
              {agency.agencyName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close activity panel"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
            style={{ background: "oklch(0.14 0 0)" }}
            data-ocid="activity-panel-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {isLoading ? (
            Array.from({ length: 8 }, (_, i) => `sk-log-${i}`).map((key) => (
              <div key={key} className="flex gap-3 items-start py-2">
                <Skeleton
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ background: "oklch(0.16 0 0)" }}
                />
                <div className="flex-1 space-y-1.5">
                  <Skeleton
                    className="h-3.5 w-3/4"
                    style={{ background: "oklch(0.16 0 0)" }}
                  />
                  <Skeleton
                    className="h-3 w-1/3"
                    style={{ background: "oklch(0.13 0 0)" }}
                  />
                </div>
              </div>
            ))
          ) : !log || log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Activity className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            log.slice(0, 20).map((entry, i) => {
              const meta = getEventMeta(entry.eventType);
              const EventIcon = meta.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex gap-3 items-start py-2.5 px-3 rounded-xl transition-smooth"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  data-ocid={`activity-log-entry-${entry.id}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `color-mix(in oklch, ${meta.color} 12%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${meta.color} 30%, transparent)`,
                    }}
                  >
                    <EventIcon
                      className="w-3.5 h-3.5"
                      style={{ color: meta.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {entry.description || meta.label}
                    </p>
                    {entry.actorId && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                        by {entry.actorId.slice(0, 12)}…
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtRelative(entry.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

// ─── Agency Stats Modal ───────────────────────────────────────────────────────

interface StatsModalProps {
  agency: Agency;
  onClose: () => void;
}

function AgencyStatsModal({ agency, onClose }: StatsModalProps) {
  const { data: stats, isLoading } = useAgencyStats(agency.id);

  return (
    <dialog
      open
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 w-full h-full max-w-none max-h-none m-0 border-0"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          background: "oklch(0.10 0 0)",
          border: `1px solid ${CR_BORDER}`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), ${CR_GLOW}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">
              {agency.agencyName}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Agency statistics &amp; details
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth"
            style={{ background: "oklch(0.15 0 0)" }}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => `sk-modal-${i}`).map((key) => (
              <Skeleton
                key={key}
                className="h-12 w-full"
                style={{ background: "oklch(0.14 0 0)" }}
              />
            ))}
          </div>
        ) : stats ? (
          <StatsContent agency={agency} stats={stats} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Could not load statistics.
          </p>
        )}
      </motion.div>
    </dialog>
  );
}

function StatsContent({
  agency,
  stats,
}: { agency: Agency; stats: AgencyStats }) {
  const rows = [
    { label: "Total Bookings", value: stats.totalBookings.toString() },
    { label: "Total Revenue", value: fmt(stats.totalRevenue) },
    { label: "Total Profit", value: fmt(stats.totalProfit) },
    { label: "Active Agents", value: stats.activeAgents.toString() },
    { label: "Last Activity", value: fmtRelative(stats.lastActivityAt) },
    {
      label: "Owner Principal",
      value: `${agency.ownerPrincipal.toText().slice(0, 20)}…`,
    },
    { label: "Agency Created", value: fmtDate(agency.createdAt) },
    { label: "Status", value: agency.isActive ? "Active" : "Inactive" },
  ];

  return (
    <div className="space-y-2">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="flex items-center justify-between px-3 py-2.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  agencyName: string;
  action: "deactivate" | "activate";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({
  agencyName,
  action,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  const isDeactivate = action === "deactivate";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "oklch(0.10 0 0)",
          border: `1px solid ${isDeactivate ? CR_BORDER : "oklch(0.7 0.18 150 / 0.3)"}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          {isDeactivate ? "Deactivate Agency?" : "Activate Agency?"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {isDeactivate
            ? `This will deactivate "${agencyName}". Their agents will lose access.`
            : `This will reactivate "${agencyName}" and restore agent access.`}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-9 text-sm font-semibold"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: isDeactivate ? CR : "oklch(0.6 0.18 150)",
              color: "#fff",
            }}
            data-ocid="admin-confirm-status-button"
          >
            {loading ? "Updating…" : isDeactivate ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Agency Table Row ─────────────────────────────────────────────────────────

interface AgencyRowProps {
  agency: Agency;
  index: number;
  onViewStats: () => void;
  onViewActivity: () => void;
  onToggleStatus: () => void;
  updating: boolean;
}

function AgencyRow({
  agency,
  index,
  onViewStats,
  onViewActivity,
  onToggleStatus,
  updating,
}: AgencyRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="transition-smooth"
      style={{ borderBottom: "1px solid oklch(0.13 0 0)" }}
      data-ocid={`admin-agency-row-${agency.id}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: CR_DIM, color: CR }}
          >
            {agency.agencyName[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="font-medium text-foreground truncate max-w-[140px]">
            {agency.agencyName}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
        {agency.ownerPrincipal.toText().slice(0, 12)}…
      </td>
      <td className="px-4 py-3 text-foreground text-right pr-6">
        {agency.totalAgents.toString()}
      </td>
      <td className="px-4 py-3">
        <AgencyStatusBadge isActive={agency.isActive} />
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">
        {fmtDate(agency.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewStats}
            className="h-7 px-2.5 text-xs"
            style={{
              border: `1px solid ${CR_BORDER}`,
              color: CR,
              background: CR_DIM,
            }}
            data-ocid={`admin-view-stats-${agency.id}`}
          >
            Stats
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onViewActivity}
            className="h-7 px-2.5 text-xs flex items-center gap-1"
            style={{
              border: `1px solid ${CR_BORDER}`,
              color: CR,
              background: CR_DIM,
            }}
            data-ocid={`admin-view-activity-${agency.id}`}
          >
            Activity
            <ArrowRight className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleStatus}
            disabled={updating}
            className="h-7 px-2.5 text-xs"
            style={{
              border: agency.isActive
                ? "1px solid oklch(0.55 0.22 22 / 0.3)"
                : "1px solid oklch(0.7 0.18 150 / 0.3)",
              color: agency.isActive ? CR : "oklch(0.7 0.18 150)",
              background: agency.isActive
                ? CR_DIM
                : "oklch(0.7 0.18 150 / 0.08)",
            }}
            data-ocid={`admin-toggle-status-${agency.id}`}
          >
            {updating ? "…" : agency.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { clear } = useInternetIdentity();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [activityAgency, setActivityAgency] = useState<Agency | null>(null);
  const [confirmAgency, setConfirmAgency] = useState<Agency | null>(null);
  const [confirmAction, setConfirmAction] = useState<"activate" | "deactivate">(
    "deactivate",
  );

  const { data: agencies, isLoading } = useAllAgencies();
  const { data: platformStats, isLoading: statsLoading } = usePlatformStats();
  const updateStatus = useUpdateAgencyStatus();

  const filtered = useMemo(() => {
    if (!agencies) return [];
    const q = search.toLowerCase().trim();
    if (!q) return agencies;
    return agencies.filter((a) => a.agencyName.toLowerCase().includes(q));
  }, [agencies, search]);

  function handleLogout() {
    clear();
    logout();
    navigate({ to: "/admin/login" });
  }

  function handleToggleStatus(agency: Agency) {
    setConfirmAgency(agency);
    setConfirmAction(agency.isActive ? "deactivate" : "activate");
  }

  function handleConfirm() {
    if (!confirmAgency) return;
    updateStatus.mutate(
      { agencyId: confirmAgency.id, isActive: !confirmAgency.isActive },
      { onSuccess: () => setConfirmAgency(null) },
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.06 0 0)" }}>
      {/* Admin topbar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 h-14"
        style={{
          background: "oklch(0.09 0 0)",
          borderBottom: `1px solid ${CR_BORDER}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: CR_DIM, border: `1px solid ${CR_BORDER}` }}
          >
            <Plane className="w-4 h-4" style={{ color: CR }} />
          </div>
          <span className="font-display font-semibold text-foreground">
            TravelERP Admin
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              color: CR,
              background: CR_DIM,
              border: `1px solid ${CR_BORDER}`,
            }}
          >
            Super Admin
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground h-8 text-xs"
          data-ocid="admin-logout-button"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </Button>
      </header>

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" style={{ color: CR }} />
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Platform Overview
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor all agencies, agents, and platform revenue.
          </p>
        </motion.div>

        {/* Platform stats from API */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Total Agencies"
            value={
              statsLoading
                ? "—"
                : (platformStats?.totalAgencies?.toString() ?? "—")
            }
            loading={statsLoading}
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="Active Agencies"
            value={
              statsLoading
                ? "—"
                : (platformStats?.activeAgencies?.toString() ?? "—")
            }
            loading={statsLoading}
            delay={0.06}
            sub={
              platformStats
                ? `${Math.round((Number(platformStats.activeAgencies) / Number(platformStats.totalAgencies)) * 100) || 0}% of total`
                : undefined
            }
          />
          <StatCard
            icon={DollarSign}
            label="YTD Revenue"
            value={
              statsLoading
                ? "—"
                : platformStats
                  ? fmt(platformStats.totalRevenue)
                  : "—"
            }
            loading={statsLoading}
            delay={0.12}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Refunds"
            value={
              statsLoading
                ? "—"
                : platformStats
                  ? fmt(platformStats.totalRefunds)
                  : "—"
            }
            loading={statsLoading}
            delay={0.18}
            sub={
              platformStats
                ? `${((platformStats.refundRate ?? 0) * 100).toFixed(1)}% refund rate`
                : undefined
            }
          />
        </div>

        {/* Agencies table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${CR_BORDER}`,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Table toolbar */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: CR }} />
              <h2 className="font-display text-lg font-semibold text-foreground">
                All Agencies
              </h2>
              {agencies && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: CR_DIM, color: CR }}
                >
                  {agencies.length}
                </span>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search agencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
                style={{
                  background: "oklch(0.12 0 0)",
                  border: "1px solid oklch(0.2 0 0)",
                }}
                data-ocid="admin-agency-search"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.15 0 0)" }}>
                  {[
                    "Agency Name",
                    "Owner",
                    "Agents",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }, (_, i) => `sk-row-${i}`).map(
                    (rowKey) => (
                      <tr
                        key={rowKey}
                        style={{ borderBottom: "1px solid oklch(0.13 0 0)" }}
                      >
                        {Array.from(
                          { length: 6 },
                          (__, j) => `sk-cell-${rowKey}-${j}`,
                        ).map((cellKey) => (
                          <td key={cellKey} className="px-4 py-3">
                            <Skeleton
                              className="h-4 w-full max-w-[120px]"
                              style={{ background: "oklch(0.14 0 0)" }}
                            />
                          </td>
                        ))}
                      </tr>
                    ),
                  )
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground text-sm"
                    >
                      {search
                        ? "No agencies match your search."
                        : "No agencies registered yet."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((agency, i) => (
                    <AgencyRow
                      key={agency.id}
                      agency={agency}
                      index={i}
                      onViewStats={() => setSelectedAgency(agency)}
                      onViewActivity={() => setActivityAgency(agency)}
                      onToggleStatus={() => handleToggleStatus(agency)}
                      updating={
                        updateStatus.isPending &&
                        updateStatus.variables?.agencyId === agency.id
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* Agency stats modal */}
      {selectedAgency && (
        <AgencyStatsModal
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
        />
      )}

      {/* Activity log side panel */}
      {activityAgency && (
        <ActivityPanel
          agency={activityAgency}
          onClose={() => setActivityAgency(null)}
        />
      )}

      {/* Confirm dialog */}
      {confirmAgency && (
        <ConfirmDialog
          agencyName={confirmAgency.agencyName}
          action={confirmAction}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAgency(null)}
          loading={updateStatus.isPending}
        />
      )}
    </div>
  );
}
