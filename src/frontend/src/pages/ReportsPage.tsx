import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  CheckCircle2,
  DollarSign,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
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
  useOutstandingReport,
  useProfitLossReport,
  useTrialBalance,
} from "../hooks/useBackend";
import type { OutstandingEntry, TrialBalanceEntry } from "../types";

// ─── Mock monthly breakdown (derived from P&L totals) ─────────────────────────

function buildMonthlyData(totalSales: number, totalCost: number) {
  const months = [
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
  const now = new Date().getMonth();
  return months.slice(0, now + 1).map((m, i) => {
    const factor = 0.6 + Math.sin(i * 0.8) * 0.4;
    return {
      month: m,
      Revenue: Math.round((totalSales / (now + 1)) * factor),
      Cost: Math.round((totalCost / (now + 1)) * factor),
    };
  });
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm shadow-xl"
      style={{
        background: "oklch(0.14 0 0)",
        borderColor: "oklch(0.75 0.15 82 / 0.25)",
      }}
    >
      <p className="font-mono text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">
            {p.value.toLocaleString()}
          </span>
        </p>
      ))}
    </div>
  );
}

// ─── P&L Summary Card ─────────────────────────────────────────────────────────

function PLCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-28 bg-muted/30" />
      ) : (
        <p className="text-2xl font-display font-semibold" style={{ color }}>
          {value < 0 ? "-" : ""}
          {Math.abs(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
      )}
    </div>
  );
}

// ─── Profit & Loss tab ────────────────────────────────────────────────────────

function ProfitLossTab() {
  const { data, isLoading } = useProfitLossReport();
  const totalSales = data?.totalSales ?? 0;
  const totalCost = data?.totalCost ?? 0;
  const grossProfit = data?.grossProfit ?? 0;
  const netProfit = data?.netProfit ?? 0;

  const chartData = useMemo(
    () => buildMonthlyData(totalSales, totalCost),
    [totalSales, totalCost],
  );

  const profitColor =
    netProfit >= 0 ? "oklch(0.7 0.18 150)" : "oklch(0.65 0.22 22)";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PLCard
          label="Total Revenue"
          value={totalSales}
          icon={DollarSign}
          color="oklch(0.75 0.15 82)"
          isLoading={isLoading}
        />
        <PLCard
          label="Total Cost"
          value={totalCost}
          icon={TrendingDown}
          color="oklch(0.65 0.22 22)"
          isLoading={isLoading}
        />
        <PLCard
          label="Gross Profit"
          value={grossProfit}
          icon={TrendingUp}
          color="oklch(0.7 0.18 150)"
          isLoading={isLoading}
        />
        <PLCard
          label="Net Profit"
          value={netProfit}
          icon={BarChart2}
          color={profitColor}
          isLoading={isLoading}
        />
      </div>

      {/* Bar chart */}
      <div className="glass-card p-5" data-ocid="pl-chart">
        <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
          Revenue vs Cost — Monthly
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.2 0 0)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{
                fill: "oklch(0.52 0 0)",
                fontSize: 11,
                fontFamily: "GeistMono",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: "oklch(0.52 0 0)",
                fontSize: 11,
                fontFamily: "GeistMono",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "oklch(0.75 0.15 82 / 0.05)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: "Figtree" }}
              iconType="square"
            />
            <Bar
              dataKey="Revenue"
              fill="oklch(0.75 0.15 82)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Cost"
              fill="oklch(0.65 0.22 22 / 0.7)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* P&L Statement */}
      <div className="glass-card overflow-hidden" data-ocid="pl-statement">
        <div className="px-5 py-3 border-b border-border/20">
          <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            P&amp;L Statement
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/20">
              <th className="px-5 py-2.5 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Account
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/10">
              <td className="px-5 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 pt-3">
                REVENUES
              </td>
              <td />
            </tr>
            <tr className="data-row">
              <td className="px-5 py-2.5 text-foreground/80">Total Sales</td>
              <td className="px-5 py-2.5 text-right font-mono text-xs text-foreground">
                {totalSales.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr className="border-b border-border/10">
              <td className="px-5 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 pt-3">
                COSTS
              </td>
              <td />
            </tr>
            <tr className="data-row">
              <td className="px-5 py-2.5 text-foreground/80">
                Total Net Fares
              </td>
              <td className="px-5 py-2.5 text-right font-mono text-xs text-foreground">
                {totalCost.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr
              className="border-t-2"
              style={{ borderColor: "oklch(0.75 0.15 82 / 0.3)" }}
            >
              <td className="px-5 py-3 font-semibold text-accent">
                Gross Profit
              </td>
              <td
                className="px-5 py-3 text-right font-display font-semibold text-lg"
                style={{ color: "oklch(0.75 0.15 82)" }}
              >
                {grossProfit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Trial Balance tab ────────────────────────────────────────────────────────

function TrialBalanceTab() {
  const { data: entries = [], isLoading } = useTrialBalance();

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
          Trial Balance
        </h3>
        {!isLoading &&
          (isBalanced ? (
            <Badge
              className="gap-1.5 text-xs"
              style={{
                color: "oklch(0.7 0.18 150)",
                background: "oklch(0.7 0.18 150 / 0.12)",
                border: "1px solid oklch(0.7 0.18 150 / 0.3)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Balanced
            </Badge>
          ) : (
            <Badge
              className="gap-1.5 text-xs"
              style={{
                color: "oklch(0.65 0.22 22)",
                background: "oklch(0.65 0.22 22 / 0.12)",
                border: "1px solid oklch(0.65 0.22 22 / 0.3)",
              }}
            >
              <XCircle className="w-3 h-3" />
              Unbalanced
            </Badge>
          ))}
      </div>

      <div
        className="glass-card overflow-hidden"
        data-ocid="trial-balance-table"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-5 py-3 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Account
              </th>
              <th className="px-5 py-3 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Debit
              </th>
              <th className="px-5 py-3 text-right text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }, (_, i) => `sk-${i}`).map((k) => (
                  <tr key={k} className="border-b border-border/20">
                    {[0, 1, 2].map((j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full max-w-28 bg-muted/30" />
                      </td>
                    ))}
                  </tr>
                ))
              : (entries as TrialBalanceEntry[]).map((entry, i) => (
                  <tr key={`${entry.accountName}-${i}`} className="data-row">
                    <td className="px-5 py-3 text-foreground/80">
                      {entry.accountName}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-foreground">
                      {entry.debit > 0
                        ? entry.debit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-foreground">
                      {entry.credit > 0
                        ? entry.credit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
          {!isLoading && entries.length > 0 && (
            <tfoot>
              <tr
                className="border-t-2"
                style={{ borderColor: "oklch(0.75 0.15 82 / 0.3)" }}
              >
                <td className="px-5 py-3 font-semibold text-accent text-xs font-mono uppercase">
                  TOTALS
                </td>
                <td className="px-5 py-3 text-right font-display font-semibold text-accent">
                  {totalDebit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-5 py-3 text-right font-display font-semibold text-accent">
                  {totalCredit.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ─── Outstanding tab ──────────────────────────────────────────────────────────

function OutstandingTab() {
  const { data: entries = [], isLoading } = useOutstandingReport();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      entries.filter((e) =>
        e.clientName.toLowerCase().includes(search.toLowerCase()),
      ),
    [entries, search],
  );

  const totalDue = filtered.reduce((s, e) => s + e.due, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border/40"
            data-ocid="outstanding-search"
          />
        </div>
        {!isLoading && totalDue > 0 && (
          <div
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              color: "oklch(0.75 0.15 82)",
              background: "oklch(0.75 0.15 82 / 0.1)",
              border: "1px solid oklch(0.75 0.15 82 / 0.25)",
            }}
          >
            Total Outstanding:{" "}
            <span className="font-display">
              {totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden" data-ocid="outstanding-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              {["Client", "Invoice No", "Amount", "Paid", "Due"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((k) => (
                <tr key={k} className="border-b border-border/20">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-5 py-3">
                      <Skeleton className="h-4 w-full max-w-24 bg-muted/30" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-16 text-center text-muted-foreground text-sm"
                >
                  {search
                    ? "No results for that client name."
                    : "All invoices are paid up!"}
                </td>
              </tr>
            ) : (
              (filtered as OutstandingEntry[]).map((entry, i) => (
                <tr key={`${entry.invoiceNo}-${i}`} className="data-row">
                  <td className="px-5 py-3 text-foreground/80">
                    {entry.clientName}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-accent">
                    {entry.invoiceNo}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-foreground">
                    {entry.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    className="px-5 py-3 font-mono text-xs"
                    style={{ color: "oklch(0.7 0.18 150)" }}
                  >
                    {entry.paid.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    className="px-5 py-3 font-mono text-xs font-semibold"
                    style={{
                      color:
                        entry.due > 0
                          ? "oklch(0.65 0.22 22)"
                          : "oklch(0.7 0.18 150)",
                    }}
                  >
                    {entry.due.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial analysis and summaries
          </p>
        </motion.div>

        {/* Tab navigation */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <Tabs defaultValue="pl" data-ocid="reports-tabs">
            <TabsList
              className="border border-border/30 p-1 h-auto"
              style={{ background: "oklch(0.11 0 0)" }}
            >
              <TabsTrigger
                value="pl"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-sm"
                data-ocid="reports-pl-tab"
              >
                Profit &amp; Loss
              </TabsTrigger>
              <TabsTrigger
                value="tb"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-sm"
                data-ocid="reports-tb-tab"
              >
                Trial Balance
              </TabsTrigger>
              <TabsTrigger
                value="os"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground text-sm"
                data-ocid="reports-os-tab"
              >
                Outstanding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pl" className="mt-6">
              <ProfitLossTab />
            </TabsContent>
            <TabsContent value="tb" className="mt-6">
              <TrialBalanceTab />
            </TabsContent>
            <TabsContent value="os" className="mt-6">
              <OutstandingTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </Layout>
  );
}
