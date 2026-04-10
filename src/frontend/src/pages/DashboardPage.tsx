import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  CreditCard,
  DollarSign,
  Plus,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import { StatsCard } from "../components/StatsCard";
import {
  useClients,
  useDashboardStats,
  useInvoices,
} from "../hooks/useBackend";
import type { Invoice } from "../types";
import { InvoiceStatus } from "../types";

function StatusBadge({ status }: { status: InvoiceStatus }) {
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

const INVOICE_COLS = [
  { key: "invoiceNo", header: "Invoice No", sortable: true },
  { key: "clientId", header: "Client" },
  {
    key: "amount",
    header: "Amount",
    sortable: true,
    render: (v: unknown) =>
      `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
  },
  {
    key: "paid",
    header: "Paid",
    render: (v: unknown) =>
      `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
  },
  {
    key: "due",
    header: "Due",
    sortable: true,
    render: (v: unknown) =>
      `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
  },
  {
    key: "status",
    header: "Status",
    render: (v: unknown) => <StatusBadge status={v as InvoiceStatus} />,
  },
];

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const { data: clients = [] } = useClients();

  // Map clientId → name for table
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const invoicesWithClientName = invoices.slice(0, 8).map((inv) => ({
    ...inv,
    clientId: clientMap.get(inv.clientId) ?? inv.clientId,
  })) as unknown as Record<string, unknown>[];

  const STATS = [
    {
      title: "Total Sales",
      value: stats?.totalSales ?? 0,
      icon: DollarSign,
      color: "gold" as const,
      prefix: "$",
      trend: "up" as const,
      trendValue: "This period",
    },
    {
      title: "Total Profit",
      value: stats?.totalProfit ?? 0,
      icon: TrendingUp,
      color: "green" as const,
      prefix: "$",
      trend: "up" as const,
    },
    {
      title: "Total Receivable",
      value: stats?.totalReceivable ?? 0,
      icon: CreditCard,
      color: "blue" as const,
      prefix: "$",
      trend: "neutral" as const,
    },
    {
      title: "Total Payable",
      value: stats?.totalPayable ?? 0,
      icon: AlertCircle,
      color: "red" as const,
      prefix: "$",
      trend: "neutral" as const,
    },
  ];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {stats
                ? `${stats.todayTransactions.toString()} transactions today`
                : "Loading activity..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-border/50 text-foreground hover:border-accent/50 hover:text-accent transition-smooth"
              data-ocid="dashboard-receive-payment"
            >
              <Link to="/vouchers">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Receive Payment
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="font-semibold transition-smooth text-black"
              style={{ background: "oklch(0.75 0.15 82)" }}
              data-ocid="dashboard-new-booking"
            >
              <Link to="/bookings">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Booking
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <section>
          <h2 className="font-display text-lg font-semibold text-accent mb-4">
            Accounting Overview
          </h2>
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {["sales", "profit", "receivable", "payable"].map((key) => (
                <div key={key} className="stat-card">
                  <Skeleton className="h-4 w-24 mb-3 bg-muted/30" />
                  <Skeleton className="h-7 w-32 mb-2 bg-muted/30" />
                  <Skeleton className="h-3 w-16 bg-muted/30" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map((s, i) => (
                <StatsCard key={s.title} {...s} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Recent invoices */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-accent">
              Financial Summary
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-sm text-muted-foreground hover:text-accent"
            >
              <Link to="/invoices">View all →</Link>
            </Button>
          </div>

          <DataTable
            columns={INVOICE_COLS as Parameters<typeof DataTable>[0]["columns"]}
            data={invoicesWithClientName}
            isLoading={invLoading}
            emptyMessage="No invoices yet. Create a booking to get started."
            emptyIcon={<Activity className="w-8 h-8 opacity-40" />}
            keyField="id"
          />
        </motion.section>
      </div>
    </Layout>
  );
}
