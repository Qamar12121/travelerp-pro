import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Calendar,
  ChartBar,
  Printer,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layout } from "../components/Layout";
import {
  useClientLedgerSummaries,
  useClients,
  useDailyLedgerSummary,
  useLedger,
  useRunningBalance,
  useSuppliers,
  useWeeklyLedgerSummary,
} from "../hooks/useBackend";
import type {
  ClientLedgerSummary,
  DailyLedgerSummary,
  LedgerEntry,
  WeeklyLedgerSummary,
} from "../types";

// ─── Constants ─────────────────────────────────────────────────────────────────

const GOLD = "oklch(0.75 0.15 82)";
const GOLD_DIM = "oklch(0.75 0.15 82 / 0.12)";
const DEBIT_COLOR = "oklch(0.65 0.22 22)";
const CREDIT_COLOR = "oklch(0.7 0.18 150)";
const TABS = [
  "Detailed Ledger",
  "Daily Summary",
  "Weekly Summary",
  "Client Summary",
] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tsToDate(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

function get3MonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    .toISOString()
    .slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

function dateToNanoTs(dateStr: string, endOfDay = false): bigint {
  const d = new Date(dateStr);
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return BigInt(d.getTime()) * BigInt(1_000_000);
}

// ─── Shared Input Style ────────────────────────────────────────────────────────

const inputStyle = {
  background: "oklch(0.14 0 0)",
  border: "1px solid oklch(0.2 0 0)",
  color: "oklch(0.9 0 0)",
};

// ─── Voucher Type Badge ────────────────────────────────────────────────────────

const VOUCHER_COLORS: Record<string, string> = {
  receipt: "oklch(0.65 0.18 230)",
  payment: "oklch(0.72 0.18 55)",
  journal: "oklch(0.65 0.2 295)",
  contra: "oklch(0.68 0.16 185)",
  booking: "oklch(0.75 0.15 82)",
};

function VoucherTypeBadge({ type }: { type: string }) {
  const shortMap: Record<string, string> = {
    receipt: "RV",
    payment: "PV",
    journal: "JV",
    contra: "CV",
    booking: "BK",
  };
  const color = VOUCHER_COLORS[type] ?? "oklch(0.52 0 0)";
  return (
    <span
      className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color, background: color.replace(")", " / 0.12)") }}
    >
      {shortMap[type] ?? type.toUpperCase()}
    </span>
  );
}

// ─── Tab Header ───────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: { active: Tab; onChange: (t: Tab) => void }) {
  const icons: Record<Tab, React.ReactNode> = {
    "Detailed Ledger": <BookOpen className="w-3.5 h-3.5" />,
    "Daily Summary": <Calendar className="w-3.5 h-3.5" />,
    "Weekly Summary": <ChartBar className="w-3.5 h-3.5" />,
    "Client Summary": <Users className="w-3.5 h-3.5" />,
  };
  return (
    <div
      className="flex gap-1 p-1 rounded-2xl"
      style={{
        background: "oklch(0.12 0 0)",
        border: "1px solid oklch(0.2 0 0)",
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
          style={
            active === tab
              ? {
                  background: GOLD,
                  color: "oklch(0.085 0 0)",
                  boxShadow: `0 0 16px ${GOLD.replace(")", " / 0.25)")}`,
                }
              : { color: "oklch(0.52 0 0)" }
          }
          data-ocid={`tab-${tab.toLowerCase().replace(/ /g, "-")}`}
        >
          {icons[tab]}
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <label
          htmlFor="dr-from"
          className="text-xs text-muted-foreground whitespace-nowrap"
        >
          From
        </label>
        <input
          id="dr-from"
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          data-ocid="date-range-from"
        />
      </div>
      <div className="flex items-center gap-2">
        <label
          htmlFor="dr-to"
          className="text-xs text-muted-foreground whitespace-nowrap"
        >
          To
        </label>
        <input
          id="dr-to"
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
          data-ocid="date-range-to"
        />
      </div>
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

const SKELETON_ROW_COLS = [0, 1, 2, 3, 4, 5, 6, 7];
const SKELETON_ROW_IDS = [
  "r0",
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6",
  "r7",
  "r8",
  "r9",
];

function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  const colKeys = SKELETON_ROW_COLS.slice(0, cols);
  const rowKeys = SKELETON_ROW_IDS.slice(0, rows);
  return (
    <>
      {rowKeys.map((rk) => (
        <tr
          key={`sk-${rk}`}
          style={{ borderBottom: "1px solid oklch(0.16 0 0)" }}
        >
          {colKeys.map((ck) => (
            <td key={`sk-${rk}-c${ck}`} className="px-4 py-3">
              <Skeleton className="h-3.5 w-full max-w-28 bg-muted/30" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Table Header ─────────────────────────────────────────────────────────────

function Th({
  children,
  right,
}: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className="px-4 py-3 text-xs font-mono uppercase tracking-widest whitespace-nowrap"
      style={{ color: GOLD, textAlign: right ? "right" : "left" }}
    >
      {children}
    </th>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="glass-card p-16 flex flex-col items-center gap-4 text-center"
      data-ocid="ledger-empty-state"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: GOLD_DIM }}
      >
        <span style={{ color: GOLD }}>{icon}</span>
      </div>
      <div>
        <p
          className="font-display text-lg font-semibold"
          style={{ color: "oklch(0.6 0 0)" }}
        >
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

// ─── Summary Stats Row ────────────────────────────────────────────────────────

function SummaryStats({
  debit,
  credit,
  balance,
}: { debit: number; credit: number; balance: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        {
          label: "Total Debit",
          value: debit,
          color: DEBIT_COLOR,
          icon: <TrendingDown className="w-4 h-4" />,
        },
        {
          label: "Total Credit",
          value: credit,
          color: CREDIT_COLOR,
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          label: "Net Balance",
          value: balance,
          color: GOLD,
          icon: <Wallet className="w-4 h-4" />,
        },
      ].map(({ label, value, color, icon }) => (
        <div key={label} className="glass-card p-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color.replace(")", " / 0.12)")}` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div
              className="font-mono font-bold text-base tabular-nums"
              style={{ color }}
            >
              ${fmt(Math.abs(value))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Entity Select ────────────────────────────────────────────────────────────

interface EntityOption {
  id: string;
  name: string;
  phone?: string;
  openingBalance?: number;
}

function EntitySelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: EntityOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = options.filter((o) =>
    `${o.name} ${o.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-smooth"
        style={{
          ...inputStyle,
          border: open
            ? `1px solid ${GOLD.replace(")", " / 0.5)")}`
            : "1px solid oklch(0.22 0 0)",
          color: selected ? "oklch(0.93 0 0)" : "oklch(0.45 0 0)",
        }}
        data-ocid="entity-select-trigger"
      >
        <span>
          {selected ? (
            <span className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: GOLD_DIM, color: GOLD }}
              >
                {selected.name.charAt(0).toUpperCase()}
              </span>
              {selected.name}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="text-muted-foreground text-xs">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: "oklch(0.13 0 0)",
            border: "1px solid oklch(0.22 0 0)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }}
        >
          <div className="p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "oklch(0.1 0 0)",
                border: "1px solid oklch(0.2 0 0)",
                color: "oklch(0.9 0 0)",
              }}
            />
          </div>
          <div className="max-h-60 overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No results
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full px-4 py-2.5 cursor-pointer transition-smooth flex items-center justify-between text-left"
                  style={
                    value === o.id
                      ? { color: GOLD, background: GOLD_DIM }
                      : { color: "oklch(0.85 0 0)" }
                  }
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: GOLD_DIM, color: GOLD }}
                    >
                      {o.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{o.name}</div>
                      {o.phone && (
                        <div className="text-xs text-muted-foreground">
                          {o.phone}
                        </div>
                      )}
                    </div>
                  </span>
                  {o.openingBalance !== undefined && o.openingBalance !== 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      OB: {fmt(o.openingBalance)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 1: Detailed Ledger ───────────────────────────────────────────────────

function DetailedLedgerTab({ jumpToEntity }: { jumpToEntity?: string }) {
  const [entityType, setEntityType] = useState<"client" | "supplier">("client");
  const [selectedId, setSelectedId] = useState(jumpToEntity ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: ledgerEntries = [], isLoading: ledgerLoading } =
    useLedger(selectedId);
  const { data: runningBalance = 0 } = useRunningBalance(selectedId);

  const entityOptions: EntityOption[] =
    entityType === "client"
      ? clients.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          openingBalance: c.openingBalance,
        }))
      : suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          openingBalance: s.openingBalance,
        }));

  const filtered = ledgerEntries.filter((e) => {
    const ms =
      typeof e.date === "bigint" ? Number(e.date) / 1_000_000 : Number(e.date);
    if (fromDate && ms < new Date(fromDate).getTime()) return false;
    if (toDate && ms > new Date(toDate).setHours(23, 59, 59, 999)) return false;
    return true;
  });

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);
  const selectedEntity = entityOptions.find((e) => e.id === selectedId);
  const openingBalance = selectedEntity?.openingBalance ?? 0;

  const openingEntry: LedgerEntry | null =
    openingBalance !== 0
      ? {
          id: "opening",
          entityId: selectedId,
          entityType: entityType as unknown as LedgerEntry["entityType"],
          date: BigInt(0) as LedgerEntry["date"],
          voucherType: "booking" as unknown as LedgerEntry["voucherType"],
          voucherNo: "OB",
          description: "Opening Balance",
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          balance: openingBalance,
        }
      : null;

  const allRows = openingEntry ? [openingEntry, ...filtered] : filtered;
  const isEntityLoading = clientsLoading || suppliersLoading;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm font-medium" style={{ color: GOLD }}>
            Select Account
          </span>
          <div
            className="flex p-1 gap-1 rounded-xl"
            style={{
              background: "oklch(0.14 0 0)",
              border: "1px solid oklch(0.2 0 0)",
            }}
          >
            {(["client", "supplier"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setEntityType(t);
                  setSelectedId("");
                }}
                className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-smooth"
                style={
                  entityType === t
                    ? { background: GOLD, color: "oklch(0.085 0 0)" }
                    : { color: "oklch(0.52 0 0)" }
                }
                data-ocid={`entity-type-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <EntitySelect
          options={entityOptions}
          value={selectedId}
          onChange={setSelectedId}
          placeholder={isEntityLoading ? "Loading…" : `Search ${entityType}…`}
        />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <DateRangePicker
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-smooth"
            style={{
              background: GOLD_DIM,
              color: GOLD,
              border: `1px solid ${GOLD.replace(")", " / 0.2)")}`,
            }}
            data-ocid="print-ledger"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {!selectedId ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7" />}
          title="No account selected"
          description="Select a client or supplier above to view their ledger"
        />
      ) : (
        <>
          <SummaryStats
            debit={totalDebit}
            credit={totalCredit}
            balance={runningBalance as unknown as number}
          />
          <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: GOLD_DIM, color: GOLD }}
                >
                  {selectedEntity?.name.charAt(0).toUpperCase()}
                </span>
                <span className="font-medium text-sm">
                  {selectedEntity?.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {allRows.length} entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
                    <Th>Date</Th>
                    <Th>Voucher No</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th right>Debit</Th>
                    <Th right>Credit</Th>
                    <Th right>Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    <TableSkeleton cols={7} />
                  ) : allRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <BookOpen className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No entries for this period</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allRows.map((entry, idx) => {
                      const isOB = idx === 0 && !!openingEntry;
                      const bal = entry.balance;
                      const balColor = isOB
                        ? "oklch(0.52 0 0)"
                        : bal >= 0
                          ? CREDIT_COLOR
                          : DEBIT_COLOR;
                      return (
                        <tr
                          key={entry.id}
                          className="data-row transition-smooth"
                          style={
                            isOB
                              ? { background: "oklch(0.75 0.15 82 / 0.04)" }
                              : undefined
                          }
                        >
                          <td className="px-4 py-3 text-sm text-foreground/80 whitespace-nowrap">
                            {tsToDate(entry.date)}
                          </td>
                          <td
                            className="px-4 py-3 text-xs font-mono whitespace-nowrap"
                            style={{ color: GOLD }}
                          >
                            {entry.voucherNo}
                          </td>
                          <td className="px-4 py-3">
                            <VoucherTypeBadge
                              type={entry.voucherType as unknown as string}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground/70 max-w-48 truncate">
                            {entry.description}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                            style={{ color: DEBIT_COLOR }}
                          >
                            {entry.debit > 0 ? fmt(entry.debit) : "—"}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                            style={{ color: CREDIT_COLOR }}
                          >
                            {entry.credit > 0 ? fmt(entry.credit) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className="font-mono font-bold text-sm tabular-nums"
                              style={{ color: balColor }}
                            >
                              {bal < 0 ? "(" : ""}
                              {fmt(Math.abs(bal))}
                              {bal < 0 ? ")" : ""}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {allRows.length > 0 && !ledgerLoading && (
                  <tfoot>
                    <tr
                      style={{
                        borderTop: "1px solid oklch(0.75 0.15 82 / 0.2)",
                        background: "oklch(0.75 0.15 82 / 0.04)",
                      }}
                    >
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        Closing Totals
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: DEBIT_COLOR }}
                      >
                        {fmt(totalDebit)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: CREDIT_COLOR }}
                      >
                        {fmt(totalCredit)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: GOLD }}
                      >
                        {fmt(Math.abs(runningBalance as unknown as number))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── TAB 2: Daily Summary ─────────────────────────────────────────────────────

function DailySummaryTab() {
  const defaultRange = getMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const startTs = from ? dateToNanoTs(from) : BigInt(0);
  const endTs = to
    ? dateToNanoTs(to, true)
    : BigInt(Date.now()) * BigInt(1_000_000);

  const { data: rows = [], isLoading } = useDailyLedgerSummary(startTs, endTs);
  const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const netBalance = totalCredit - totalDebit;

  return (
    <div className="space-y-5">
      <div className="glass-card p-5 flex items-center justify-between flex-wrap gap-4">
        <span className="text-sm font-medium" style={{ color: GOLD }}>
          Date Range
        </span>
        <DateRangePicker
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {rows.length > 0 && !isLoading && (
        <SummaryStats
          debit={totalDebit}
          credit={totalCredit}
          balance={netBalance}
        />
      )}

      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
        >
          <span className="text-sm font-medium" style={{ color: GOLD }}>
            Daily Breakdown
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {rows.length} days
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
                <Th>Date</Th>
                <Th right>Total Debit</Th>
                <Th right>Total Credit</Th>
                <Th right>Net Balance</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={4} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    No data for selected range
                  </td>
                </tr>
              ) : (
                rows.map((r: DailyLedgerSummary) => (
                  <tr key={r.date} className="data-row transition-smooth">
                    <td className="px-4 py-3 text-sm text-foreground/80 whitespace-nowrap font-mono">
                      {r.date}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                      style={{ color: DEBIT_COLOR }}
                    >
                      ${fmt(r.totalDebit)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                      style={{ color: CREDIT_COLOR }}
                    >
                      ${fmt(r.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-mono font-bold text-sm tabular-nums"
                        style={{
                          color: r.netBalance >= 0 ? CREDIT_COLOR : DEBIT_COLOR,
                        }}
                      >
                        {r.netBalance < 0 ? "(" : ""}$
                        {fmt(Math.abs(r.netBalance))}
                        {r.netBalance < 0 ? ")" : ""}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && !isLoading && (
              <tfoot>
                <tr
                  style={{
                    borderTop: "1px solid oklch(0.75 0.15 82 / 0.2)",
                    background: "oklch(0.75 0.15 82 / 0.04)",
                  }}
                >
                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Totals
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{ color: DEBIT_COLOR }}
                  >
                    ${fmt(totalDebit)}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{ color: CREDIT_COLOR }}
                  >
                    ${fmt(totalCredit)}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{
                      color: netBalance >= 0 ? CREDIT_COLOR : DEBIT_COLOR,
                    }}
                  >
                    ${fmt(Math.abs(netBalance))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

interface ChartTooltipPayload {
  name: string;
  value: number;
  color: string;
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 space-y-1"
      style={{
        background: "oklch(0.16 0 0)",
        border: "1px solid oklch(0.25 0 0)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <p className="text-xs font-mono text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="text-xs" style={{ color: p.color }}>
            {p.name}
          </span>
          <span
            className="text-xs font-mono font-bold"
            style={{ color: p.color }}
          >
            ${fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 3: Weekly Summary ────────────────────────────────────────────────────

function WeeklySummaryTab() {
  const defaultRange = get3MonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const startTs = from ? dateToNanoTs(from) : BigInt(0);
  const endTs = to
    ? dateToNanoTs(to, true)
    : BigInt(Date.now()) * BigInt(1_000_000);

  const { data: rows = [], isLoading } = useWeeklyLedgerSummary(startTs, endTs);
  const totalDebit = rows.reduce((s, r) => s + r.totalDebit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0);
  const netBalance = totalCredit - totalDebit;

  const chartData = rows.map((r: WeeklyLedgerSummary) => ({
    week: r.weekLabel,
    Debit: r.totalDebit,
    Credit: r.totalCredit,
  }));

  return (
    <div className="space-y-5">
      <div className="glass-card p-5 flex items-center justify-between flex-wrap gap-4">
        <span className="text-sm font-medium" style={{ color: GOLD }}>
          Date Range
        </span>
        <DateRangePicker
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      {rows.length > 0 && !isLoading && (
        <>
          <SummaryStats
            debit={totalDebit}
            credit={totalCredit}
            balance={netBalance}
          />
          {/* Bar Chart */}
          <div className="glass-card p-5">
            <p className="text-sm font-medium mb-4" style={{ color: GOLD }}>
              Weekly Debit vs Credit
            </p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.2 0 0)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "oklch(0.52 0 0)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.52 0 0)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "oklch(0.75 0.15 82 / 0.05)" }}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span style={{ color: "oklch(0.7 0 0)", fontSize: 12 }}>
                        {value}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="Debit"
                    fill={DEBIT_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Credit"
                    fill={CREDIT_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
        >
          <span className="text-sm font-medium" style={{ color: GOLD }}>
            Weekly Breakdown
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {rows.length} weeks
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
                <Th>Week</Th>
                <Th>Period</Th>
                <Th right>Total Debit</Th>
                <Th right>Total Credit</Th>
                <Th right>Net Balance</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={5} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    No data for selected range
                  </td>
                </tr>
              ) : (
                rows.map((r: WeeklyLedgerSummary) => (
                  <tr key={r.weekLabel} className="data-row transition-smooth">
                    <td
                      className="px-4 py-3 text-sm font-semibold whitespace-nowrap"
                      style={{ color: GOLD }}
                    >
                      {r.weekLabel}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                      style={{ color: DEBIT_COLOR }}
                    >
                      ${fmt(r.totalDebit)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                      style={{ color: CREDIT_COLOR }}
                    >
                      ${fmt(r.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-mono font-bold text-sm tabular-nums"
                        style={{
                          color: r.netBalance >= 0 ? CREDIT_COLOR : DEBIT_COLOR,
                        }}
                      >
                        {r.netBalance < 0 ? "(" : ""}$
                        {fmt(Math.abs(r.netBalance))}
                        {r.netBalance < 0 ? ")" : ""}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && !isLoading && (
              <tfoot>
                <tr
                  style={{
                    borderTop: "1px solid oklch(0.75 0.15 82 / 0.2)",
                    background: "oklch(0.75 0.15 82 / 0.04)",
                  }}
                >
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    Totals
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{ color: DEBIT_COLOR }}
                  >
                    ${fmt(totalDebit)}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{ color: CREDIT_COLOR }}
                  >
                    ${fmt(totalCredit)}
                  </td>
                  <td
                    className="px-4 py-3 text-right font-mono font-bold text-sm"
                    style={{
                      color: netBalance >= 0 ? CREDIT_COLOR : DEBIT_COLOR,
                    }}
                  >
                    ${fmt(Math.abs(netBalance))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4: Client Summary ────────────────────────────────────────────────────

function ClientSummaryTab({
  onJumpToEntity,
}: { onJumpToEntity: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: summaries = [], isLoading } = useClientLedgerSummaries();

  const filtered = summaries.filter((s: ClientLedgerSummary) =>
    s.entityName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients and suppliers…"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          data-ocid="client-summary-search"
        />
      </div>

      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
        >
          <span className="text-sm font-medium" style={{ color: GOLD }}>
            All Accounts
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} accounts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
                <Th>Client / Supplier</Th>
                <Th right>Opening Balance</Th>
                <Th right>Total Debit</Th>
                <Th right>Total Credit</Th>
                <Th right>Closing Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    No accounts found
                  </td>
                </tr>
              ) : (
                filtered.map((s: ClientLedgerSummary) => {
                  const isDebitBalance = s.closingBalance > 0;
                  const statusColor = isDebitBalance
                    ? DEBIT_COLOR
                    : CREDIT_COLOR;
                  const statusLabel = isDebitBalance
                    ? "Debit (Owes Us)"
                    : "Credit (We Owe)";
                  const entityId = s.entityId as unknown as string;
                  return (
                    <tr
                      key={entityId}
                      className="data-row transition-smooth"
                      data-ocid="client-summary-row"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left w-full"
                          onClick={() => onJumpToEntity(entityId)}
                          aria-label={`View detailed ledger for ${s.entityName}`}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: GOLD_DIM, color: GOLD }}
                          >
                            {s.entityName.charAt(0).toUpperCase()}
                          </span>
                          <span
                            className="font-medium text-sm hover:underline"
                            style={{ color: GOLD }}
                          >
                            {s.entityName}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap text-foreground/60">
                        ${fmt(s.openingBalance)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                        style={{ color: DEBIT_COLOR }}
                      >
                        ${fmt(s.totalDebit)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
                        style={{ color: CREDIT_COLOR }}
                      >
                        ${fmt(s.totalCredit)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className="font-mono font-bold text-sm tabular-nums"
                          style={{ color: statusColor }}
                        >
                          {s.closingBalance < 0 ? "(" : ""}$
                          {fmt(Math.abs(s.closingBalance))}
                          {s.closingBalance < 0 ? ")" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: `${statusColor.replace(")", " / 0.12)")}`,
                            color: statusColor,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Detailed Ledger");
  const [jumpEntityId, setJumpEntityId] = useState<string | undefined>(
    undefined,
  );

  const handleJumpToEntity = useCallback((id: string) => {
    setJumpEntityId(id);
    setActiveTab("Detailed Ledger");
  }, []);

  return (
    <Layout title="Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-semibold text-accent">
            Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Running balances, daily/weekly summaries, and client account
            overview
          </p>
        </div>

        {/* Tab bar — scrollable on mobile */}
        <div className="overflow-x-auto pb-1">
          <TabBar
            active={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              if (t !== "Detailed Ledger") setJumpEntityId(undefined);
            }}
          />
        </div>

        {/* Tab content */}
        {activeTab === "Detailed Ledger" && (
          <DetailedLedgerTab jumpToEntity={jumpEntityId} />
        )}
        {activeTab === "Daily Summary" && <DailySummaryTab />}
        {activeTab === "Weekly Summary" && <WeeklySummaryTab />}
        {activeTab === "Client Summary" && (
          <ClientSummaryTab onJumpToEntity={handleJumpToEntity} />
        )}
      </div>
    </Layout>
  );
}
