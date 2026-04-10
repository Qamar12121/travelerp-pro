import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { Layout } from "../components/Layout";
import {
  useClients,
  useLedger,
  useRunningBalance,
  useSuppliers,
} from "../hooks/useBackend";
import type { LedgerEntry } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Voucher type badge ───────────────────────────────────────────────────────

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
      style={{ color, background: `${color.replace(")", " / 0.12)")}` }}
    >
      {shortMap[type] ?? type.toUpperCase()}
    </span>
  );
}

// ─── Searchable entity select ─────────────────────────────────────────────────

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
          background: "oklch(0.14 0 0)",
          border: open
            ? "1px solid oklch(0.75 0.15 82 / 0.5)"
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
                style={{
                  background: "oklch(0.75 0.15 82 / 0.12)",
                  color: "oklch(0.75 0.15 82)",
                }}
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
              placeholder="Search by name or phone..."
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
                No results found
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full px-4 py-2.5 cursor-pointer transition-smooth flex items-center justify-between text-left"
                  style={
                    value === o.id
                      ? {
                          color: "oklch(0.75 0.15 82)",
                          background: "oklch(0.75 0.15 82 / 0.06)",
                        }
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
                      style={{
                        background: "oklch(0.75 0.15 82 / 0.12)",
                        color: "oklch(0.75 0.15 82)",
                      }}
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

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  highlight,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      className="glass-card p-4 flex items-center gap-3"
      style={
        highlight
          ? {
              borderColor: "oklch(0.75 0.15 82 / 0.4)",
              boxShadow: "0 0 20px oklch(0.75 0.15 82 / 0.1)",
            }
          : undefined
      }
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: highlight
            ? "oklch(0.75 0.15 82 / 0.12)"
            : "oklch(0.16 0 0)",
        }}
      >
        <span
          style={{
            color:
              color ?? (highlight ? "oklch(0.75 0.15 82)" : "oklch(0.52 0 0)"),
          }}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className="font-mono font-bold text-base tabular-nums"
          style={{
            color:
              color ?? (highlight ? "oklch(0.75 0.15 82)" : "oklch(0.93 0 0)"),
          }}
        >
          ${fmt(Math.abs(value))}
        </div>
      </div>
    </div>
  );
}

// ─── Ledger row ───────────────────────────────────────────────────────────────

function LedgerRow({
  entry,
  isFirst,
}: {
  entry: LedgerEntry;
  isFirst: boolean;
}) {
  const balance = entry.balance;
  const balanceColor = isFirst
    ? "oklch(0.52 0 0)"
    : balance >= 0
      ? "oklch(0.7 0.18 150)"
      : "oklch(0.65 0.22 22)";

  return (
    <tr
      className="data-row transition-smooth"
      style={isFirst ? { background: "oklch(0.75 0.15 82 / 0.04)" } : undefined}
    >
      <td className="px-4 py-3 text-sm text-foreground/80 whitespace-nowrap">
        {tsToDate(entry.date)}
      </td>
      <td className="px-4 py-3">
        <VoucherTypeBadge type={entry.voucherType as unknown as string} />
      </td>
      <td className="px-4 py-3 text-xs font-mono text-accent whitespace-nowrap">
        {entry.voucherNo}
      </td>
      <td className="px-4 py-3 text-sm text-foreground/70 max-w-48 truncate">
        {entry.description}
      </td>
      <td
        className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
        style={{ color: "oklch(0.65 0.22 22)" }}
      >
        {entry.debit > 0 ? fmt(entry.debit) : "—"}
      </td>
      <td
        className="px-4 py-3 text-right font-mono text-sm whitespace-nowrap"
        style={{ color: "oklch(0.7 0.18 150)" }}
      >
        {entry.credit > 0 ? fmt(entry.credit) : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className="font-mono font-bold text-sm tabular-nums"
          style={{ color: balanceColor }}
        >
          {balance < 0 ? "(" : ""}
          {fmt(Math.abs(balance))}
          {balance < 0 ? ")" : ""}
        </span>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [entityType, setEntityType] = useState<"client" | "supplier">("client");
  const [selectedId, setSelectedId] = useState("");
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

  // Date filtering
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

  // Opening balance row
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

  function handleEntityTypeChange(t: "client" | "supplier") {
    setEntityType(t);
    setSelectedId("");
  }

  return (
    <Layout title="Ledger">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-semibold text-accent">
            Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Running balance ledger by client or supplier
          </p>
        </div>

        {/* Entity selector */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground/80">
              Select Account
            </span>
            {/* Type toggle */}
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
                  onClick={() => handleEntityTypeChange(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-smooth"
                  style={
                    entityType === t
                      ? {
                          background: "oklch(0.75 0.15 82)",
                          color: "oklch(0.085 0 0)",
                        }
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
            placeholder={
              isEntityLoading ? "Loading..." : `Search ${entityType}...`
            }
          />

          {/* Date filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="ledger-from-date"
                className="text-xs text-muted-foreground mb-1.5 block"
              >
                From Date
              </label>
              <input
                id="ledger-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "oklch(0.14 0 0)",
                  border: "1px solid oklch(0.2 0 0)",
                  color: "oklch(0.9 0 0)",
                }}
                data-ocid="ledger-from-date"
              />
            </div>
            <div>
              <label
                htmlFor="ledger-to-date"
                className="text-xs text-muted-foreground mb-1.5 block"
              >
                To Date
              </label>
              <input
                id="ledger-to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "oklch(0.14 0 0)",
                  border: "1px solid oklch(0.2 0 0)",
                  color: "oklch(0.9 0 0)",
                }}
                data-ocid="ledger-to-date"
              />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {selectedId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Debit"
              value={totalDebit}
              icon={<TrendingDown className="w-4 h-4" />}
              color="oklch(0.65 0.22 22)"
            />
            <SummaryCard
              label="Total Credit"
              value={totalCredit}
              icon={<TrendingUp className="w-4 h-4" />}
              color="oklch(0.7 0.18 150)"
            />
            <SummaryCard
              label="Current Balance"
              value={runningBalance as unknown as number}
              icon={<Wallet className="w-4 h-4" />}
              highlight
            />
          </div>
        )}

        {/* Ledger table */}
        {!selectedId ? (
          /* Empty state */
          <div
            className="glass-card p-16 flex flex-col items-center gap-4 text-center"
            data-ocid="ledger-empty-state"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "oklch(0.75 0.15 82 / 0.08)" }}
            >
              <BookOpen className="w-7 h-7 text-accent/60" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground/60">
                No account selected
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Select a client or supplier above to view their ledger
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
            {/* Table title bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "oklch(0.75 0.15 82 / 0.12)",
                    color: "oklch(0.75 0.15 82)",
                  }}
                >
                  {selectedEntity?.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm">
                  {selectedEntity?.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {allRows.length} entries
              </span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}>
                    {[
                      "Date",
                      "Type",
                      "Voucher No",
                      "Description",
                      "Debit",
                      "Credit",
                      "Balance",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-mono uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                        style={{ textAlign: i >= 4 ? "right" : "left" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading ? (
                    Array.from({ length: 5 }, (_, i) => `skel-${i}`).map(
                      (k) => (
                        <tr
                          key={k}
                          style={{ borderBottom: "1px solid oklch(0.16 0 0)" }}
                        >
                          {Array.from({ length: 7 }, (_, j) => `cell-${j}`).map(
                            (c) => (
                              <td key={c} className="px-4 py-3">
                                <Skeleton className="h-3.5 w-full max-w-24 bg-muted/30" />
                              </td>
                            ),
                          )}
                        </tr>
                      ),
                    )
                  ) : allRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <BookOpen className="w-8 h-8 opacity-30" />
                          <p className="text-sm">
                            No ledger entries found for this period
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allRows.map((entry, idx) => (
                      <LedgerRow
                        key={entry.id}
                        entry={entry}
                        isFirst={idx === 0 && !!openingEntry}
                      />
                    ))
                  )}
                </tbody>
                {/* Footer totals */}
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
                        Totals
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: "oklch(0.65 0.22 22)" }}
                      >
                        {fmt(totalDebit)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: "oklch(0.7 0.18 150)" }}
                      >
                        {fmt(totalCredit)}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-bold text-sm"
                        style={{ color: "oklch(0.75 0.15 82)" }}
                      >
                        {fmt(Math.abs(runningBalance as unknown as number))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
