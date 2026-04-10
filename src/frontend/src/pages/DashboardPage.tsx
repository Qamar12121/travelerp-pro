import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  formatDistanceToNow,
  isThisMonth,
  isThisWeek,
  isToday,
  isWithinInterval,
} from "date-fns";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Building2,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "../components/Layout";
import { StatsCard } from "../components/StatsCard";
import {
  useAllAgencies,
  useBookings,
  useClients,
  useDashboardStats,
  useInvoices,
  useVouchers,
} from "../hooks/useBackend";
import { useAuthStore } from "../store/auth";
import type { Booking, Client, Invoice } from "../types";
import {
  BookingStatus,
  BookingType,
  InvoiceStatus,
  VoucherType,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) => `PKR ${n.toLocaleString()}`;
const GOLD = "#D4AF37";
const RED = "#ef4444";
const CHART_GRID = "#ffffff10";
const CHART_AXIS = "#9ca3af";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type DateFilter = "today" | "week" | "month" | "custom";

function timestampToMs(ts: bigint): number {
  // Motoko timestamps are nanoseconds
  return Number(ts) / 1_000_000;
}

function filterByDate(
  createdAt: bigint,
  filter: DateFilter,
  customFrom: string,
  customTo: string,
): boolean {
  const ms = timestampToMs(createdAt);
  const d = new Date(ms);
  if (filter === "today") return isToday(d);
  if (filter === "week") return isThisWeek(d);
  if (filter === "month") return isThisMonth(d);
  if (filter === "custom" && customFrom && customTo) {
    return isWithinInterval(d, {
      start: new Date(customFrom),
      end: new Date(`${customTo}T23:59:59`),
    });
  }
  return true;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cls =
    status === InvoiceStatus.paid
      ? "badge-paid"
      : status === InvoiceStatus.partial
        ? "badge-pending"
        : "badge-overdue";
  return (
    <span className={cls}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<string, string> = {
    [BookingStatus.confirmed]:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    [BookingStatus.cancelled]:
      "bg-red-500/15 text-red-400 border border-red-500/30",
    [BookingStatus.pending]:
      "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  };
  const label =
    String(status).charAt(0).toUpperCase() + String(status).slice(1);
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[String(status)] ?? "bg-muted/30 text-muted-foreground"}`}
    >
      {label}
    </span>
  );
}

// ─── Date Filter Bar ──────────────────────────────────────────────────────────

interface DateFilterBarProps {
  active: DateFilter;
  onChange: (f: DateFilter) => void;
  customFrom: string;
  customTo: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

function DateFilterBar({
  active,
  onChange,
  customFrom,
  customTo,
  onFromChange,
  onToChange,
}: DateFilterBarProps) {
  const FILTERS: { label: string; value: DateFilter }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "Custom", value: "custom" },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-white/10 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
      data-ocid="dashboard-date-filter"
    >
      {FILTERS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            active === value
              ? "text-[#0A0A0A] font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
          style={active === value ? { background: GOLD } : undefined}
          data-ocid={`filter-${value}`}
        >
          {label}
        </button>
      ))}
      {active === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onFromChange(e.target.value)}
            className="bg-transparent border border-white/20 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-[#D4AF37]/60"
            data-ocid="filter-custom-from"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onToChange(e.target.value)}
            className="bg-transparent border border-white/20 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-[#D4AF37]/60"
            data-ocid="filter-custom-to"
          />
        </div>
      )}
    </div>
  );
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────

function GoldTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-sm border shadow-xl"
      style={{ background: "oklch(0.13 0 0)", borderColor: `${GOLD}40` }}
    >
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

interface MonthlyDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

function buildMonthlyData(
  invoices: Invoice[],
  vouchers: { amount: number; createdAt: bigint }[],
): MonthlyDataPoint[] {
  const revenueByMonth = new Array<number>(12).fill(0);
  const expensesByMonth = new Array<number>(12).fill(0);
  for (const inv of invoices) {
    const month = new Date(timestampToMs(inv.createdAt)).getMonth();
    revenueByMonth[month] += inv.amount;
  }
  for (const v of vouchers) {
    const month = new Date(timestampToMs(v.createdAt)).getMonth();
    expensesByMonth[month] += v.amount;
  }
  return MONTHS.map((m, i) => ({
    month: m,
    revenue: Math.round(revenueByMonth[i]),
    expenses: Math.round(expensesByMonth[i]),
  }));
}

function RevenueChart({
  data,
  loading,
}: {
  data: MonthlyDataPoint[];
  loading: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <h3 className="font-display text-base font-semibold text-white mb-4">
        Monthly Revenue
      </h3>
      {loading ? (
        <Skeleton className="h-[280px] bg-white/5 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
            <YAxis
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<GoldTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={GOLD}
              strokeWidth={2}
              dot={{ fill: GOLD, r: 3 }}
              activeDot={{ r: 5, fill: GOLD }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ExpenseChart({
  data,
  loading,
}: {
  data: MonthlyDataPoint[];
  loading: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <h3 className="font-display text-base font-semibold text-white mb-4">
        Monthly Expenses
      </h3>
      {loading ? (
        <Skeleton className="h-[280px] bg-white/5 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
            <YAxis
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<GoldTooltip />} />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={GOLD}
              radius={[3, 3, 0, 0]}
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ProfitTrendChart({
  data,
  loading,
}: {
  data: MonthlyDataPoint[];
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <h3 className="font-display text-base font-semibold text-white mb-4">
        Profit Trend
      </h3>
      {loading ? (
        <Skeleton className="h-[300px] bg-white/5 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="month" tick={{ fill: CHART_AXIS, fontSize: 11 }} />
            <YAxis
              tick={{ fill: CHART_AXIS, fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<GoldTooltip />} />
            <Legend wrapperStyle={{ color: CHART_AXIS, fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={GOLD}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={RED}
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActionsPanel() {
  const actions = [
    {
      label: "+ New Client",
      to: "/clients",
      icon: Users,
      ocid: "qa-new-client",
    },
    {
      label: "+ New Booking",
      to: "/bookings",
      icon: BookOpen,
      ocid: "qa-new-booking",
    },
    {
      label: "+ New Invoice",
      to: "/invoices",
      icon: FileText,
      ocid: "qa-new-invoice",
    },
    {
      label: "+ Add Voucher",
      to: "/vouchers",
      icon: Receipt,
      ocid: "qa-add-voucher",
    },
  ];

  return (
    <div
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm h-full"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <h3 className="font-display text-base font-semibold text-white mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, to, icon: Icon, ocid }) => (
          <Link
            key={to}
            to={to}
            data-ocid={ocid}
            className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-lg border border-white/10 text-muted-foreground text-sm font-medium hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all duration-200 group"
          >
            <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "booking" | "invoice";
  description: string;
  timeAgo: string;
}

function RecentActivityPanel({
  bookings,
  invoices,
  clientMap,
  loading,
}: {
  bookings: Booking[];
  invoices: Invoice[];
  clientMap: Map<string, string>;
  loading: boolean;
}) {
  const activities: ActivityItem[] = [
    ...bookings.slice(0, 4).map((b) => ({
      id: b.id,
      type: "booking" as const,
      description: `Booking ${b.bookingType} — ${clientMap.get(b.clientId) ?? b.clientId}`,
      timeAgo: formatDistanceToNow(new Date(timestampToMs(b.createdAt)), {
        addSuffix: true,
      }),
    })),
    ...invoices.slice(0, 4).map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      description: `Invoice ${inv.invoiceNo} — ${formatCurrency(inv.amount)}`,
      timeAgo: formatDistanceToNow(new Date(timestampToMs(inv.createdAt)), {
        addSuffix: true,
      }),
    })),
  ]
    .sort((a, b) => a.timeAgo.localeCompare(b.timeAgo))
    .slice(0, 8);

  const DOT_COLORS = {
    booking: "bg-[#D4AF37]",
    invoice: "bg-blue-400",
  };

  return (
    <div
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm h-full"
      style={{ background: "oklch(0.12 0 0)" }}
    >
      <h3 className="font-display text-base font-semibold text-white mb-4">
        Recent Activity
      </h3>
      {loading ? (
        <div className="space-y-3">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((key) => (
            <div key={key} className="flex items-center gap-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 h-3 rounded bg-white/10" />
              <div className="w-16 h-3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No recent activity yet
        </p>
      ) : (
        <ul className="space-y-3" data-ocid="recent-activity-list">
          {activities.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DOT_COLORS[item.type]}`}
              />
              <p className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
                {item.description}
              </p>
              <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                {item.timeAgo}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Outstanding Balance Widget ───────────────────────────────────────────────

interface OutstandingRow {
  clientId: string;
  clientName: string;
  totalInvoiced: number;
  amountPaid: number;
  balanceDue: number;
  status: "overdue" | "pending";
}

function OutstandingBalanceWidget({
  invoices,
  clients,
  loading,
}: {
  invoices: Invoice[];
  clients: Client[];
  loading: boolean;
}) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const grouped = new Map<string, OutstandingRow>();
  for (const inv of invoices) {
    if (inv.due <= 0) continue;
    const existing = grouped.get(inv.clientId);
    if (existing) {
      existing.totalInvoiced += inv.amount;
      existing.amountPaid += inv.paid;
      existing.balanceDue += inv.due;
    } else {
      grouped.set(inv.clientId, {
        clientId: inv.clientId,
        clientName: clientMap.get(inv.clientId) ?? inv.clientId,
        totalInvoiced: inv.amount,
        amountPaid: inv.paid,
        balanceDue: inv.due,
        status: "pending",
      });
    }
  }

  const rows = Array.from(grouped.values())
    .sort((a, b) => b.balanceDue - a.balanceDue)
    .slice(0, 10);

  const totalReceivable = rows.reduce((s, r) => s + r.balanceDue, 0);
  const totalInvoiced = rows.reduce((s, r) => s + r.totalInvoiced, 0);
  const totalPaid = rows.reduce((s, r) => s + r.amountPaid, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
      data-ocid="outstanding-widget"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-white">
          Outstanding Balance
        </h3>
        <Link
          to="/reports"
          className="text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors duration-200"
          data-ocid="outstanding-view-report"
        >
          View Full Report →
        </Link>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 rounded-lg border border-white/5 bg-white/3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Invoiced</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="text-center border-x border-white/5">
          <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
          <p className="text-sm font-semibold text-emerald-400">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
          <p className="text-sm font-semibold text-red-400">
            {formatCurrency(totalReceivable)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {["a", "b", "c", "d", "e"].map((key) => (
            <Skeleton key={key} className="h-10 bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No outstanding balances
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">
                  Client
                </th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">
                  Invoiced
                </th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">
                  Paid
                </th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">
                  Balance Due
                </th>
                <th className="text-center text-xs text-muted-foreground font-medium py-2 pl-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody data-ocid="outstanding-table">
              {rows.map((row) => (
                <tr
                  key={row.clientId}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors duration-150"
                >
                  <td className="py-2 pr-3 font-medium text-foreground truncate max-w-[140px]">
                    {row.clientName}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {formatCurrency(row.totalInvoiced)}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    {formatCurrency(row.amountPaid)}
                  </td>
                  <td className="py-2 px-3 text-right text-red-400 font-medium">
                    {formatCurrency(row.balanceDue)}
                  </td>
                  <td className="py-2 pl-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ─── Recent Bookings ──────────────────────────────────────────────────────────

const BOOKING_TYPE_LABELS: Record<string, string> = {
  [BookingType.ticket]: "Ticket",
  [BookingType.visa]: "Visa",
  [BookingType.umrah]: "Umrah",
  [BookingType.tour]: "Tour",
};

function RecentBookingsTable({
  bookings,
  clientMap,
  loading,
}: {
  bookings: Booking[];
  clientMap: Map<string, string>;
  loading: boolean;
}) {
  const rows = bookings.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="rounded-xl border border-white/10 p-5 backdrop-blur-sm"
      style={{ background: "oklch(0.12 0 0)" }}
      data-ocid="recent-bookings"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-white">
          Recent Bookings
        </h3>
        <Link
          to="/bookings"
          className="text-xs text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors duration-200"
          data-ocid="bookings-view-all"
        >
          View All →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {["a", "b", "c", "d", "e"].map((key) => (
            <Skeleton key={key} className="h-11 bg-white/5" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10" data-ocid="bookings-empty">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-sm text-muted-foreground">
            No bookings yet. Create one to get started.
          </p>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-1.5 mt-4 text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Booking
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-3">
                  Booking ID
                </th>
                <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                  Client
                </th>
                <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                  Type
                </th>
                <th className="text-left text-xs text-muted-foreground font-medium py-2 px-3">
                  Sector
                </th>
                <th className="text-right text-xs text-muted-foreground font-medium py-2 px-3">
                  Sale Fare
                </th>
                <th className="text-center text-xs text-muted-foreground font-medium py-2 pl-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody data-ocid="bookings-table">
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors duration-150"
                >
                  <td className="py-2 pr-3 font-mono text-xs text-[#D4AF37] truncate max-w-[100px]">
                    {b.id.slice(0, 8)}…
                  </td>
                  <td className="py-2 px-3 font-medium text-foreground truncate max-w-[120px]">
                    {clientMap.get(b.clientId) ?? b.clientId}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground capitalize">
                    {BOOKING_TYPE_LABELS[String(b.bookingType)] ??
                      String(b.bookingType)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {b.sector ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-foreground">
                    {formatCurrency(b.saleFare)}
                  </td>
                  <td className="py-2 pl-3 text-center">
                    <BookingStatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

// ─── Admin Overview Banner ────────────────────────────────────────────────────

function AdminOverviewBanner() {
  const { data: agencies, isLoading } = useAllAgencies();

  const totalAgencies = agencies?.length ?? 0;
  const activeAgencies = agencies?.filter((a) => a.isActive).length ?? 0;
  const totalAgents =
    agencies?.reduce((s, a) => s + Number(a.totalAgents), 0) ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl border p-4 mb-6"
      style={{
        background: "oklch(0.14 0.03 22 / 0.6)",
        borderColor: "oklch(0.62 0.24 22 / 0.4)",
      }}
      data-ocid="admin-overview-banner"
    >
      <div className="flex items-center gap-3 mb-3">
        <Shield className="w-5 h-5 text-red-400" />
        <h3 className="font-display font-semibold text-white text-sm">
          Super Admin Overview
        </h3>
      </div>
      {isLoading ? (
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-28 bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Total Agencies
            </p>
            <p className="text-xl font-display font-bold text-foreground">
              {totalAgencies}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">
              Active Agencies
            </p>
            <p className="text-xl font-display font-bold text-emerald-400">
              {activeAgencies}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Agents</p>
            <p className="text-xl font-display font-bold text-[#D4AF37]">
              {totalAgents}
            </p>
          </div>
          <div className="ml-auto self-end">
            <Link
              to="/admin"
              className="text-xs px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              Admin Panel →
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role, isSuperAdmin, agencyName } = useAuthStore();

  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: allInvoices = [], isLoading: invLoading } = useInvoices();
  const { data: allBookings = [], isLoading: bookLoading } = useBookings();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: paymentVouchers = [], isLoading: vouchersLoading } =
    useVouchers(VoucherType.payment);

  const chartsLoading = invLoading || vouchersLoading;

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  // Filter by date
  const filteredInvoices = allInvoices.filter((inv) =>
    filterByDate(inv.createdAt, dateFilter, customFrom, customTo),
  );
  const filteredBookings = allBookings.filter((b) =>
    filterByDate(b.createdAt, dateFilter, customFrom, customTo),
  );

  // Derived KPI values from filtered data
  const filteredSales = filteredInvoices.reduce((s, inv) => s + inv.amount, 0);
  const filteredProfit = filteredBookings.reduce((s, b) => s + b.profit, 0);
  const todayRevenue = allInvoices
    .filter((inv) => isToday(new Date(timestampToMs(inv.createdAt))))
    .reduce((s, inv) => s + inv.amount, 0);
  const outstandingBalance = allInvoices
    .filter((inv) => inv.due > 0)
    .reduce((s, inv) => s + inv.due, 0);

  // Monthly chart data (always full year — not filtered)
  const monthlyData = buildMonthlyData(allInvoices, paymentVouchers);

  // Role-based subtitle
  const dashSubtitle =
    role === "super-admin"
      ? "Super Admin View"
      : role === "agent"
        ? "My Dashboard"
        : role === "agency-owner"
          ? `Agency Dashboard — ${agencyName ?? ""}`
          : "Dashboard";

  // Role badge
  const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
    "super-admin": {
      label: "Super Admin",
      cls: "bg-red-500/15 text-red-400 border-red-500/30",
    },
    "agency-owner": {
      label: "Owner",
      cls: "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30",
    },
    agent: {
      label: "Agent",
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    admin: {
      label: "Admin",
      cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    },
  };
  const roleBadge = role ? ROLE_BADGE[role] : null;

  const KPI_CARDS = [
    {
      title: "Total Clients",
      value: clientsLoading ? 0 : clients.length,
      icon: Users,
      color: "blue" as const,
      trendValue: `${clients.length} registered`,
      trend: "neutral" as const,
      index: 0,
    },
    {
      title: "Total Bookings",
      value: bookLoading ? 0 : filteredBookings.length,
      icon: BookOpen,
      color: "gold" as const,
      trendValue: `${allBookings.filter((b) => b.status === BookingStatus.confirmed).length} active`,
      trend: "up" as const,
      index: 1,
    },
    {
      title: "Total Sales",
      value: statsLoading ? 0 : filteredSales,
      icon: DollarSign,
      color: "green" as const,
      prefix: "PKR ",
      trendValue: "This period",
      trend: "up" as const,
      index: 2,
    },
    {
      title: "Total Profit",
      value: statsLoading ? 0 : filteredProfit,
      icon: TrendingUp,
      color: "gold" as const,
      prefix: "PKR ",
      trendValue: "Net margin",
      trend: filteredProfit >= 0 ? ("up" as const) : ("down" as const),
      index: 3,
    },
    {
      title: "Outstanding",
      value: invLoading ? 0 : outstandingBalance,
      icon: AlertCircle,
      color: "red" as const,
      prefix: "PKR ",
      trendValue: `${allInvoices.filter((i) => i.due > 0).length} invoices`,
      trend: "neutral" as const,
      index: 4,
    },
    {
      title: "Today's Revenue",
      value: invLoading ? 0 : todayRevenue,
      icon: Activity,
      color: "green" as const,
      prefix: "PKR ",
      trendValue: "Today only",
      trend: "up" as const,
      index: 5,
    },
  ];

  const anyKpiLoading =
    statsLoading || clientsLoading || invLoading || bookLoading;

  return (
    <Layout title="Dashboard">
      <div className="space-y-6 max-w-[1600px]">
        {/* Header row with title + role badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Dashboard
              </h1>
              {roleBadge && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${roleBadge.cls}`}
                >
                  {roleBadge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dashSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" />
            <span>
              {stats
                ? `${stats.todayTransactions.toString()} transactions today`
                : "Loading..."}
            </span>
          </div>
        </div>

        {/* Admin Banner */}
        {isSuperAdmin && <AdminOverviewBanner />}

        {/* 1. Date Filter Bar */}
        <DateFilterBar
          active={dateFilter}
          onChange={setDateFilter}
          customFrom={customFrom}
          customTo={customTo}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
        />

        {/* 2. KPI Cards */}
        <section data-ocid="kpi-cards">
          {anyKpiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              {["s1", "s2", "s3", "s4", "s5", "s6"].map((key) => (
                <div
                  key={key}
                  className="stat-card animate-pulse"
                  style={{ minHeight: 110 }}
                >
                  <Skeleton className="h-4 w-24 mb-3 bg-white/5" />
                  <Skeleton className="h-7 w-32 mb-2 bg-white/5" />
                  <Skeleton className="h-3 w-16 bg-white/5" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
              {KPI_CARDS.map((s) => (
                <StatsCard key={s.title} {...s} />
              ))}
            </div>
          )}
        </section>

        {/* 3. Revenue + Expense Charts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid md:grid-cols-2 gap-5"
          data-ocid="charts-row"
        >
          <RevenueChart data={monthlyData} loading={chartsLoading} />
          <ExpenseChart data={monthlyData} loading={chartsLoading} />
        </motion.section>

        {/* 4. Profit Trend Chart */}
        <ProfitTrendChart data={monthlyData} loading={chartsLoading} />

        {/* 5. Quick Actions + Recent Activity */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-5"
          data-ocid="actions-activity-row"
        >
          <QuickActionsPanel />
          <RecentActivityPanel
            bookings={allBookings}
            invoices={allInvoices}
            clientMap={clientMap}
            loading={invLoading || bookLoading}
          />
        </motion.section>

        {/* 6. Outstanding Balance Widget */}
        <OutstandingBalanceWidget
          invoices={allInvoices}
          clients={clients}
          loading={invLoading || clientsLoading}
        />

        {/* 7. Recent Bookings Table */}
        <RecentBookingsTable
          bookings={allBookings}
          clientMap={clientMap}
          loading={bookLoading}
        />

        {/* Branding footer */}
        <div className="text-center py-4 border-t border-white/5">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors duration-200"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
