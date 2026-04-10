import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  MessageCircle,
  Printer,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import {
  useBookings,
  useClients,
  useInvoices,
  useSettings,
} from "../hooks/useBackend";
import type { Booking, Client, Column, Invoice } from "../types";
import { InvoiceStatus } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = "all" | InvoiceStatus;

// ─── Badge config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  [InvoiceStatus.unpaid]: {
    label: "Unpaid",
    icon: <XCircle className="w-3 h-3" />,
    cls: "text-[oklch(0.65_0.22_22)] bg-[oklch(0.65_0.22_22/0.12)] border-[oklch(0.65_0.22_22/0.3)]",
  },
  [InvoiceStatus.partial]: {
    label: "Partial",
    icon: <Clock className="w-3 h-3" />,
    cls: "text-[oklch(0.75_0.15_82)] bg-[oklch(0.75_0.15_82/0.12)] border-[oklch(0.75_0.15_82/0.3)]",
  },
  [InvoiceStatus.paid]: {
    label: "Paid",
    icon: <CheckCircle2 className="w-3 h-3" />,
    cls: "text-[oklch(0.72_0.18_152)] bg-[oklch(0.72_0.18_152/0.12)] border-[oklch(0.72_0.18_152/0.3)]",
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Print invoice style ───────────────────────────────────────────────────────

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    #invoice-print-area, #invoice-print-area * { visibility: visible; }
    #invoice-print-area {
      position: fixed; inset: 0; padding: 32px;
      background: white; color: black;
    }
    .no-print { display: none !important; }
  }
`;

// ─── Invoice Detail Modal ──────────────────────────────────────────────────────

function InvoiceDetailModal({
  invoice,
  client,
  booking,
  agencyName,
  currency,
  onClose,
}: {
  invoice: Invoice;
  client: Client | undefined;
  booking: Booking | undefined;
  agencyName: string;
  currency: string;
  onClose: () => void;
}) {
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const travelDate = booking?.travelDate ? formatDate(booking.travelDate) : "—";

  const waMsg = encodeURIComponent(
    `Invoice #${invoice.invoiceNo}\nClient: ${client?.name ?? "N/A"}\nAmount: ${fmt(invoice.amount)}\nPaid: ${fmt(invoice.paid)}\nDue: ${fmt(invoice.due)}\nStatus: ${invoice.status.toUpperCase()}`,
  );

  const handlePrint = () => {
    const style = document.createElement("style");
    style.innerHTML = PRINT_STYLES;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 3000);
  };

  const handleDownload = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice ${invoice.invoiceNo}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; color: #111; }
        h1 { color: #b8961e; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #eee; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #666; }
        td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
        .due { color: #b8961e; font-weight: bold; }
        .label { color: #666; font-size: 11px; text-transform: uppercase; }
      </style>
    </head><body>
      <h1>${agencyName}</h1>
      <p><strong>Invoice No:</strong> ${invoice.invoiceNo}</p>
      <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
      <hr/>
      <h3>Client</h3>
      <p>${client?.name ?? "N/A"} | ${client?.phone ?? ""}</p>
      ${
        booking
          ? `<h3>Booking Details</h3>
      <p>Sector: ${booking.sector ?? "—"} | PNR: ${booking.pnr ?? "—"} | Airline: ${booking.airline ?? "—"} | Travel Date: ${travelDate}</p>`
          : ""
      }
      <table>
        <tr><th>Description</th><th>Amount</th></tr>
        <tr><td>Travel Services - ${booking?.sector ?? "Package"}</td><td>${fmt(invoice.amount)}</td></tr>
      </table>
      <br/>
      <p><strong>Total:</strong> ${fmt(invoice.amount)}</p>
      <p><strong>Paid:</strong> ${fmt(invoice.paid)}</p>
      <p class="due"><strong>Due:</strong> ${fmt(invoice.due)}</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(0.12 0 0)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-accent font-display text-xl flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice #{invoice.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex gap-2 no-print" data-ocid="invoice-actions">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg text-xs"
            onClick={handlePrint}
            data-ocid="invoice-print-btn"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg text-xs"
            onClick={handleDownload}
            data-ocid="invoice-download-btn"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          <a
            href={`https://wa.me/?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            data-ocid="invoice-whatsapp-btn"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg text-xs"
              style={{
                borderColor: "oklch(0.7 0.18 152 / 0.4)",
                color: "oklch(0.7 0.18 152)",
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </a>
        </div>

        <Separator style={{ background: "oklch(0.2 0 0)" }} />

        {/* Invoice body */}
        <div id="invoice-print-area" className="space-y-5 mt-1">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-display font-semibold text-accent">
                {agencyName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Travel Agency
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
                Invoice No
              </p>
              <p className="text-sm font-mono text-foreground">
                #{invoice.invoiceNo}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
          </div>

          {/* Client */}
          <div
            className="rounded-xl p-4"
            style={{ background: "oklch(0.085 0 0 / 0.6)" }}
          >
            <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2">
              Bill To
            </p>
            <p className="text-sm font-semibold text-foreground">
              {client?.name ?? "—"}
            </p>
            {client?.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {client.phone}
              </p>
            )}
            {client?.email && (
              <p className="text-xs text-muted-foreground">{client.email}</p>
            )}
          </div>

          {/* Booking details */}
          {booking && (
            <div
              className="rounded-xl p-4 grid grid-cols-2 gap-3"
              style={{ background: "oklch(0.085 0 0 / 0.6)" }}
            >
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider col-span-2 mb-1">
                Booking Details
              </p>
              {[
                ["Sector", booking.sector ?? "—"],
                ["PNR", booking.pnr ?? "—"],
                ["Airline", booking.airline ?? "—"],
                ["Travel Date", travelDate],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm text-foreground font-mono">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Line items */}
          <div>
            <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2">
              Services
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid oklch(0.2 0 0)" }}
            >
              <div
                className="grid grid-cols-[1fr_auto] px-4 py-2"
                style={{ background: "oklch(0.15 0 0)" }}
              >
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Description
                </span>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Amount
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] px-4 py-3">
                <span className="text-sm text-foreground">
                  Travel Services — {booking?.sector ?? "Package"}
                </span>
                <span className="text-sm font-mono text-foreground">
                  {fmt(invoice.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "oklch(0.085 0 0 / 0.8)" }}
          >
            {[
              {
                label: "Total Amount",
                value: fmt(invoice.amount),
                accent: false,
              },
              { label: "Amount Paid", value: fmt(invoice.paid), accent: false },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ))}
            <div
              className="flex justify-between pt-2 mt-1"
              style={{ borderTop: "1px solid oklch(0.2 0 0)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{
                  color:
                    invoice.due > 0
                      ? "oklch(0.75 0.15 82)"
                      : "oklch(0.72 0.18 152)",
                }}
              >
                Balance Due
              </span>
              <span
                className="text-base font-bold font-mono"
                style={{
                  color:
                    invoice.due > 0
                      ? "oklch(0.75 0.15 82)"
                      : "oklch(0.72 0.18 152)",
                }}
              >
                {fmt(invoice.due)}
              </span>
            </div>
          </div>

          {/* Footer status */}
          <div className="flex items-center justify-center pt-2">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary footer ────────────────────────────────────────────────────────────

function SummaryFooter({
  invoices,
  currency,
}: {
  invoices: Invoice[];
  currency: string;
}) {
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paid, 0);
  const totalDue = invoices.reduce((s, i) => s + i.due, 0);

  return (
    <div
      className="grid grid-cols-3 gap-4 rounded-xl p-4"
      style={{
        background: "oklch(0.12 0 0)",
        border: "1px solid oklch(0.2 0 0)",
      }}
    >
      {[
        {
          label: "Total Amount",
          value: fmt(totalAmount),
          color: "text-foreground",
        },
        {
          label: "Total Paid",
          value: fmt(totalPaid),
          color: "text-[oklch(0.72_0.18_152)]",
        },
        {
          label: "Total Due",
          value: fmt(totalDue),
          color:
            totalDue > 0
              ? "text-[oklch(0.75_0.15_82)]"
              : "text-[oklch(0.72_0.18_152)]",
        },
      ].map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1">
            {label}
          </p>
          <p className={`text-base font-semibold font-mono ${color}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading } = useInvoices();
  const { data: clients = [] } = useClients();
  const { data: bookings = [] } = useBookings();
  const { data: settings } = useSettings();

  const currency = settings?.currency ?? "PKR";
  const agencyName = settings?.agencyName ?? "Travel Agency";

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients],
  );
  const bookingMap = useMemo(
    () => Object.fromEntries(bookings.map((b) => [b.id, b])),
    [bookings],
  );

  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const filtered = useMemo(
    () =>
      filter === "all" ? invoices : invoices.filter((i) => i.status === filter),
    [invoices, filter],
  );

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: InvoiceStatus.unpaid, label: "Unpaid" },
    { key: InvoiceStatus.partial, label: "Partial" },
    { key: InvoiceStatus.paid, label: "Paid" },
  ];

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice No",
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm text-accent">#{row.invoiceNo}</span>
      ),
    },
    {
      key: "clientId",
      header: "Client",
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">
          {clientMap[row.clientId]?.name ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm">{fmt(row.amount)}</span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      sortable: true,
      render: (_, row) => (
        <span
          className="font-mono text-sm"
          style={{ color: "oklch(0.72 0.18 152)" }}
        >
          {fmt(row.paid)}
        </span>
      ),
    },
    {
      key: "due",
      header: "Due",
      sortable: true,
      render: (_, row) => (
        <span
          className="font-mono text-sm font-semibold"
          style={{
            color: row.due > 0 ? "oklch(0.75 0.15 82)" : "oklch(0.72 0.18 152)",
          }}
        >
          {fmt(row.due)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-accent hover:text-accent"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
          data-ocid="invoice-view-btn"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header + Filter tabs */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage client invoices
            </p>
          </div>

          {/* Filter tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "oklch(0.12 0 0)",
              border: "1px solid oklch(0.2 0 0)",
            }}
            data-ocid="invoice-filter-tabs"
          >
            {TABS.map(({ key, label }) => {
              const count =
                key === "all"
                  ? invoices.length
                  : invoices.filter((i) => i.status === key).length;
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-smooth flex items-center gap-1.5"
                  style={
                    isActive
                      ? {
                          background: "oklch(0.75 0.15 82 / 0.15)",
                          color: "oklch(0.75 0.15 82)",
                        }
                      : {
                          background: "transparent",
                          color: "oklch(0.52 0 0)",
                        }
                  }
                  data-ocid={`invoice-tab-${key}`}
                >
                  {label}
                  {!isLoading && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                      style={{
                        background: isActive
                          ? "oklch(0.75 0.15 82 / 0.2)"
                          : "oklch(0.15 0 0)",
                        color: isActive
                          ? "oklch(0.75 0.15 82)"
                          : "oklch(0.4 0 0)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={filtered as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          emptyMessage="No invoices found for this filter."
          emptyIcon={
            <FileText
              className="w-10 h-10"
              style={{ color: "oklch(0.75 0.15 82 / 0.5)" }}
            />
          }
          onRowClick={(row) => setSelected(row as unknown as Invoice)}
          keyField="id"
        />

        {/* Summary footer */}
        {!isLoading && filtered.length > 0 && (
          <SummaryFooter invoices={filtered} currency={currency} />
        )}
      </div>

      {/* Invoice detail modal */}
      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          client={clientMap[selected.clientId]}
          booking={bookingMap[selected.bookingId]}
          agencyName={agencyName}
          currency={currency}
          onClose={() => setSelected(null)}
        />
      )}
    </Layout>
  );
}
