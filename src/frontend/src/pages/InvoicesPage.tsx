import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  FileText,
  MessageCircle,
  Plus,
  Printer,
  ReceiptText,
  RefreshCcw,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import {
  useBookings,
  useClients,
  useCreateRefundInvoice,
  useInvoices,
  useInvoicesByType,
  useInvoicesSummary,
  useRecordInvoicePayment,
  useSettings,
} from "../hooks/useBackend";
import type { Booking, Client, Invoice, InvoicesSummary } from "../types";
import { InvoiceStatus, InvoiceType } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = "all" | InvoiceStatus | "refunded";
type TypeTab = "all" | InvoiceType | "refundNote";
type ModalMode = "view" | "edit" | "add" | "delete" | "refund" | null;

// ─── Aging utils ───────────────────────────────────────────────────────────────

function getAgingClass(invoice: Invoice): string {
  if (invoice.status === InvoiceStatus.paid || invoice.due <= 0) return "";
  const ageMs = Date.now() - Number(invoice.createdAt) / 1_000_000;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= 90) return "border-l-4 border-l-[oklch(0.65_0.22_22)]";
  if (ageDays >= 60) return "border-l-4 border-l-[oklch(0.68_0.2_38)]";
  if (ageDays >= 30) return "border-l-4 border-l-[oklch(0.75_0.15_82)]";
  return "";
}

function isRefundNote(invoice: Invoice): boolean {
  return (
    invoice.invoiceType === InvoiceType.creditNote &&
    !!invoice.refundedInvoiceId
  );
}

function canRefund(invoice: Invoice): boolean {
  return (
    !isRefundNote(invoice) &&
    (invoice.status === InvoiceStatus.paid ||
      invoice.status === InvoiceStatus.partial) &&
    invoice.paid > 0
  );
}

// ─── Invoice type config ───────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InvoiceType,
  { label: string; color: string; bg: string; border: string }
> = {
  [InvoiceType.booking]: {
    label: "Booking",
    color: "oklch(0.65 0.18 240)",
    bg: "oklch(0.65 0.18 240 / 0.1)",
    border: "oklch(0.65 0.18 240 / 0.3)",
  },
  [InvoiceType.manual]: {
    label: "Manual",
    color: "oklch(0.75 0.15 82)",
    bg: "oklch(0.75 0.15 82 / 0.1)",
    border: "oklch(0.75 0.15 82 / 0.3)",
  },
  [InvoiceType.proforma]: {
    label: "Proforma",
    color: "oklch(0.65 0.2 290)",
    bg: "oklch(0.65 0.2 290 / 0.1)",
    border: "oklch(0.65 0.2 290 / 0.3)",
  },
  [InvoiceType.creditNote]: {
    label: "Credit Note",
    color: "oklch(0.65 0.22 22)",
    bg: "oklch(0.65 0.22 22 / 0.1)",
    border: "oklch(0.65 0.22 22 / 0.3)",
  },
  [InvoiceType.debitNote]: {
    label: "Debit Note",
    color: "oklch(0.72 0.18 50)",
    bg: "oklch(0.72 0.18 50 / 0.1)",
    border: "oklch(0.72 0.18 50 / 0.3)",
  },
};

// Refund note display config
const REFUND_NOTE_CONFIG = {
  label: "Refund Note",
  color: "oklch(0.72 0.18 50)",
  bg: "oklch(0.72 0.18 50 / 0.12)",
  border: "oklch(0.72 0.18 50 / 0.35)",
};

function InvoiceTypeBadge({
  type,
  refundNote,
}: {
  type: InvoiceType;
  refundNote?: boolean;
}) {
  const cfg = refundNote
    ? REFUND_NOTE_CONFIG
    : (TYPE_CONFIG[type] ?? TYPE_CONFIG[InvoiceType.booking]);
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Refunded badge ────────────────────────────────────────────────────────────

function RefundedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        color: "oklch(0.72 0.18 50)",
        background: "oklch(0.72 0.18 50 / 0.1)",
        border: "1px solid oklch(0.72 0.18 50 / 0.3)",
      }}
    >
      <RefreshCcw className="w-2.5 h-2.5" />
      Refunded
    </span>
  );
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; cls: string; dotCls: string; icon: React.ReactNode }
> = {
  [InvoiceStatus.unpaid]: {
    label: "Unpaid",
    icon: <XCircle className="w-3 h-3" />,
    dotCls: "bg-[oklch(0.65_0.22_22)]",
    cls: "text-[oklch(0.7_0.22_22)] bg-[oklch(0.65_0.22_22/0.1)] border border-[oklch(0.65_0.22_22/0.3)]",
  },
  [InvoiceStatus.partial]: {
    label: "Partial",
    icon: <Clock className="w-3 h-3" />,
    dotCls: "bg-[oklch(0.75_0.15_82)]",
    cls: "text-[oklch(0.75_0.15_82)] bg-[oklch(0.75_0.15_82/0.1)] border border-[oklch(0.75_0.15_82/0.3)]",
  },
  [InvoiceStatus.paid]: {
    label: "Paid",
    icon: <CheckCircle2 className="w-3 h-3" />,
    dotCls: "bg-[oklch(0.72_0.18_152)]",
    cls: "text-[oklch(0.72_0.18_152)] bg-[oklch(0.72_0.18_152/0.1)] border border-[oklch(0.72_0.18_152/0.3)]",
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
      {cfg.label}
    </span>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateLong(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Print styles ──────────────────────────────────────────────────────────────

const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    #invoice-print-area, #invoice-print-area * { visibility: visible; }
    #invoice-print-area {
      position: fixed; inset: 0; padding: 40px;
      background: white !important; color: #111 !important;
      font-family: sans-serif;
    }
    .no-print { display: none !important; }
  }
`;

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  summary,
  isLoading,
  currency,
}: {
  summary: InvoicesSummary | undefined;
  isLoading: boolean;
  currency: string;
}) {
  if (isLoading) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-4 flex-wrap"
        style={{
          background: "oklch(0.11 0.005 82 / 0.6)",
          border: "1px solid oklch(0.18 0 0)",
          backdropFilter: "blur(16px)",
        }}
      >
        {["s1", "s2", "s3", "s4"].map((k) => (
          <Skeleton key={k} className="h-10 flex-1 min-w-[140px] rounded-xl" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Total Invoices",
      value: summary ? Number(summary.totalInvoices).toString() : "—",
      color: "oklch(0.85 0 0)",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "Total Amount",
      value: summary ? fmt(summary.totalAmount, currency) : "—",
      color: "oklch(0.75 0.15 82)",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      label: "Total Paid",
      value: summary ? fmt(summary.totalPaid, currency) : "—",
      color: "oklch(0.72 0.18 152)",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: "Total Due",
      value: summary ? fmt(summary.totalDue, currency) : "—",
      color:
        summary && summary.totalDue > 0
          ? "oklch(0.65 0.22 22)"
          : "oklch(0.72 0.18 152)",
      icon: <Wallet className="w-4 h-4" />,
    },
  ];

  return (
    <div
      className="rounded-2xl px-5 py-3.5 flex items-center gap-1 flex-wrap"
      style={{
        background: "oklch(0.11 0.005 82 / 0.6)",
        border: "1px solid oklch(0.75 0.15 82 / 0.18)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px oklch(0 0 0 / 0.3)",
      }}
      data-ocid="invoice-summary-bar"
    >
      {items.map(({ label, value, color, icon }, idx) => (
        <div
          key={label}
          className="flex items-center gap-1 flex-1 min-w-[130px]"
        >
          {idx > 0 && (
            <div
              className="w-px h-8 self-center mx-3 hidden sm:block"
              style={{ background: "oklch(0.22 0 0)" }}
            />
          )}
          <div className="flex items-center gap-3 py-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color.replace(")", " / 0.12)")}`, color }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-muted-foreground uppercase font-mono tracking-widest leading-tight">
                {label}
              </p>
              <p
                className="text-sm font-semibold font-mono leading-tight truncate"
                style={{ color }}
              >
                {value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl p-5 flex items-start gap-4 overflow-hidden"
      style={{
        background: "oklch(0.11 0.005 82 / 0.6)",
        border: accent
          ? "1px solid oklch(0.75 0.15 82 / 0.4)"
          : "1px solid oklch(0.2 0 0)",
        backdropFilter: "blur(16px)",
      }}
    >
      {accent && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top left, oklch(0.75 0.15 82 / 0.07), transparent 60%)",
          }}
        />
      )}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: accent ? "oklch(0.75 0.15 82 / 0.15)" : "oklch(0.16 0 0)",
          color: accent ? "oklch(0.75 0.15 82)" : "oklch(0.5 0 0)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1">
          {label}
        </p>
        <p
          className="text-xl font-display font-semibold truncate"
          style={{ color: accent ? "oklch(0.75 0.15 82)" : "oklch(0.9 0 0)" }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Refund Invoice Modal ──────────────────────────────────────────────────────

function RefundInvoiceModal({
  invoice,
  client,
  currency,
  onClose,
}: {
  invoice: Invoice;
  client: Client | undefined;
  currency: string;
  onClose: () => void;
}) {
  const [refundAmount, setRefundAmount] = useState(invoice.paid.toString());
  const [reason, setReason] = useState("");
  const [refundDate, setRefundDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const createRefund = useCreateRefundInvoice();

  const maxRefund = invoice.paid;
  const amount = Number.parseFloat(refundAmount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > maxRefund) {
      toast.error(
        `Refund amount must be between 0.01 and ${fmt(maxRefund, currency)}`,
      );
      return;
    }
    try {
      await createRefund.mutateAsync({
        originalInvoiceId: invoice.id,
        clientId: invoice.clientId,
        refundAmount: amount,
        refundReason: reason,
        date: refundDate,
        paymentMethod: "cash",
      });
      toast.success(
        `Refund of ${fmt(amount, currency)} processed successfully`,
      );
      onClose();
    } catch (_err) {
      toast.error("Failed to create refund. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "oklch(0.09 0.005 82)",
          border: "1px solid oklch(0.72 0.18 50 / 0.3)",
          boxShadow: "0 25px 80px oklch(0 0 0 / 0.6)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-display">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.72 0.18 50 / 0.12)",
                color: "oklch(0.72 0.18 50)",
              }}
            >
              <RefreshCcw className="w-4 h-4" />
            </div>
            Create Refund — #{invoice.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        {/* Original invoice info */}
        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1">
            Original Invoice (Read Only)
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice No</span>
            <span
              className="font-mono font-semibold"
              style={{ color: "oklch(0.75 0.15 82)" }}
            >
              #{invoice.invoiceNo}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="text-foreground font-medium">
              {client?.name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Amount</span>
            <span className="text-foreground font-mono">
              {fmt(invoice.amount, currency)}
            </span>
          </div>
          <div
            className="flex justify-between text-sm pt-2"
            style={{ borderTop: "1px solid oklch(0.18 0 0)" }}
          >
            <span className="text-muted-foreground font-semibold">
              Max Refundable (Paid)
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: "oklch(0.72 0.18 152)" }}
            >
              {fmt(maxRefund, currency)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Refund Amount * (Max: {fmt(maxRefund, currency)})
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={maxRefund}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="font-mono"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              required
              data-ocid="refund-amount-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Refund Date *
            </Label>
            <Input
              type="date"
              value={refundDate}
              onChange={(e) => setRefundDate(e.target.value)}
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              required
              data-ocid="refund-date-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Reason
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for refund (optional)…"
              rows={3}
              className="w-full rounded-lg text-sm px-3 py-2.5 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              data-ocid="refund-reason-input"
            />
          </div>

          {amount > 0 && amount <= maxRefund && (
            <div
              className="rounded-xl p-3.5 flex items-center justify-between"
              style={{
                background: "oklch(0.72 0.18 50 / 0.07)",
                border: "1px solid oklch(0.72 0.18 50 / 0.2)",
              }}
            >
              <span className="text-sm text-muted-foreground">
                A Credit Note will be created for
              </span>
              <span
                className="text-base font-bold font-mono"
                style={{ color: "oklch(0.72 0.18 50)" }}
              >
                {fmt(amount, currency)}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl h-10 font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.62 0.2 40))",
                color: "oklch(0.1 0 0)",
              }}
              disabled={
                createRefund.isPending || amount <= 0 || amount > maxRefund
              }
              data-ocid="refund-submit-btn"
            >
              {createRefund.isPending ? "Processing…" : "Create Refund"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Invoice Modal ────────────────────────────────────────────────────────

function ViewInvoiceModal({
  invoice,
  client,
  booking,
  agencyName,
  currency,
  allInvoices,
  onClose,
  onEdit,
  onRefund,
}: {
  invoice: Invoice;
  client: Client | undefined;
  booking: Booking | undefined;
  agencyName: string;
  currency: string;
  allInvoices: Invoice[];
  onClose: () => void;
  onEdit: () => void;
  onRefund: () => void;
}) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const isRefund = isRefundNote(invoice);
  const canDoRefund = canRefund(invoice);

  // Find the refund note linked to this invoice (if any)
  const linkedRefundNote = allInvoices.find(
    (inv) =>
      inv.invoiceType === InvoiceType.creditNote &&
      inv.refundedInvoiceId === invoice.id,
  );

  // If this is a refund note, find the original invoice
  const originalInvoice = isRefund
    ? allInvoices.find((inv) => inv.id === invoice.refundedInvoiceId)
    : undefined;

  const waMsg = encodeURIComponent(
    `*Invoice #${invoice.invoiceNo}*\nAgency: ${agencyName}\nClient: ${client?.name ?? "N/A"}\nDate: ${formatDateLong(invoice.createdAt)}\nAmount: ${fmt(invoice.amount, currency)}\nPaid: ${fmt(invoice.paid, currency)}\nDue: ${fmt(invoice.due, currency)}\nStatus: ${invoice.status.toUpperCase()}`,
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
    const travelDate = booking?.travelDate
      ? formatDateLong(booking.travelDate)
      : "—";
    const typeCfg =
      TYPE_CONFIG[invoice.invoiceType] ?? TYPE_CONFIG[InvoiceType.booking];
    const typeLabel = isRefund ? "Refund Note" : typeCfg.label;
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice ${invoice.invoiceNo} — ${agencyName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; padding: 48px; color: #111; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .agency { font-size: 24px; font-weight: 700; color: #b8961e; letter-spacing: -0.5px; }
        .agency-sub { font-size: 12px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: .08em; }
        .inv-meta { text-align: right; }
        .inv-meta .inv-no { font-size: 18px; font-weight: 700; font-family: monospace; color: #333; }
        .inv-meta .inv-date { font-size: 12px; color: #888; margin-top: 4px; }
        hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
        .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: #999; margin-bottom: 10px; }
        .client-box { background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .client-name { font-size: 16px; font-weight: 600; color: #222; }
        .client-info { font-size: 12px; color: #666; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #999; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e5e5; }
        td { font-size: 13px; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #333; }
        .text-right { text-align: right; }
        .totals { background: #f9f9f9; border-radius: 8px; padding: 16px; max-width: 280px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #555; }
        .total-row.due { font-weight: 700; font-size: 16px; color: #b8961e; padding-top: 10px; border-top: 1px solid #ddd; margin-top: 4px; }
        .accounting { margin-top: 32px; }
        .accounting th { background: #f0f0f0; }
        .debit-row td { color: #d32f2f; }
        .credit-row td { color: #388e3c; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; background: #fff3cd; color: #b8961e; }
        .type-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #e8f4fd; color: #1976d2; margin-left: 8px; }
        .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #bbb; }
        .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #555; }
        .refund-banner { background: #fff8f0; border: 1px solid #f5c78e; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; color: #b8700d; font-size: 12px; }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="agency">${agencyName}</div>
          <div class="agency-sub">Travel Agency</div>
        </div>
        <div class="inv-meta">
          <div class="inv-no">Invoice #${invoice.invoiceNo}</div>
          <div class="inv-date">${formatDateLong(invoice.createdAt)}</div>
          <div style="margin-top:8px">
            <span class="status-badge">${invoice.status.toUpperCase()}</span>
            <span class="type-badge">${typeLabel}</span>
          </div>
        </div>
      </div>
      ${isRefund && originalInvoice ? `<div class="refund-banner">⚠️ This is a Refund Note for Invoice #${originalInvoice.invoiceNo}</div>` : ""}
      ${linkedRefundNote ? `<div class="refund-banner">🔁 Refunded via Invoice #${linkedRefundNote.invoiceNo}</div>` : ""}
      <hr/>
      <div class="section-title">Bill To</div>
      <div class="client-box">
        <div class="client-name">${client?.name ?? "—"}</div>
        <div class="client-info">${client?.phone ?? ""}${client?.email ? ` · ${client.email}` : ""}</div>
      </div>
      ${
        booking
          ? `<div class="section-title">Booking Details</div>
      <table>
        <tr><th>Sector</th><th>PNR</th><th>Airline</th><th>Travel Date</th><th>Booking Type</th></tr>
        <tr><td>${booking.sector ?? "—"}</td><td>${booking.pnr ?? "—"}</td><td>${booking.airline ?? "—"}</td><td>${travelDate}</td><td>${booking.bookingType}</td></tr>
      </table>`
          : ""
      }
      <div class="section-title">Services</div>
      <table>
        <tr><th>Description</th><th class="text-right">Amount</th></tr>
        <tr><td>Travel Services${booking?.sector ? ` — ${booking.sector}` : ""}${invoice.notes ? `<br/><small style="color:#999">${invoice.notes}</small>` : ""}</td><td class="text-right">${fmt(invoice.amount, currency)}</td></tr>
      </table>
      <div class="totals">
        <div class="total-row"><span>Sub-total</span><span>${fmt(invoice.amount, currency)}</span></div>
        ${invoice.taxAmount > 0 ? `<div class="total-row"><span>Tax</span><span>+ ${fmt(invoice.taxAmount, currency)}</span></div>` : ""}
        ${invoice.discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>- ${fmt(invoice.discountAmount, currency)}</span></div>` : ""}
        <div class="total-row"><span>Amount Paid</span><span>${fmt(invoice.paid, currency)}</span></div>
        <div class="total-row due"><span>Balance Due</span><span>${fmt(invoice.due, currency)}</span></div>
      </div>
      ${invoice.notes ? `<div class="notes-box"><strong>Notes:</strong> ${invoice.notes}</div>` : ""}
      <div class="accounting">
        <div class="section-title">Accounting Entries</div>
        <table>
          <tr><th>Type</th><th>Account</th><th class="text-right">Debit</th><th class="text-right">Credit</th></tr>
          <tr class="debit-row"><td>DR</td><td>${client?.name ?? "Client A/c"}</td><td class="text-right">${fmt(invoice.amount, currency)}</td><td class="text-right">—</td></tr>
          <tr class="credit-row"><td>CR</td><td>Sales A/c</td><td class="text-right">—</td><td class="text-right">${fmt(invoice.amount, currency)}</td></tr>
        </table>
      </div>
      <div class="footer">Generated by ${agencyName} · Invoice #${invoice.invoiceNo}</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const bookingTypeLabelMap: Record<string, string> = {
    ticket: "Air Ticket",
    visa: "Visa",
    umrah: "Umrah Package",
    tour: "Tour Package",
  };

  const finalAmount =
    invoice.amount + invoice.taxAmount - invoice.discountAmount;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
        style={{
          background: "oklch(0.09 0.005 82)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          boxShadow:
            "0 25px 80px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(0.75 0.15 82 / 0.1)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            background: "oklch(0.09 0.005 82)",
            borderBottom: "1px solid oklch(0.18 0 0)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "oklch(0.75 0.15 82 / 0.12)",
                color: "oklch(0.75 0.15 82)",
              }}
            >
              <ReceiptText className="w-4.5 h-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-display font-semibold text-foreground flex items-center gap-2 flex-wrap">
                Invoice #{invoice.invoiceNo}
                <InvoiceTypeBadge
                  type={invoice.invoiceType}
                  refundNote={isRefund}
                />
                {linkedRefundNote && <RefundedBadge />}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatDateLong(invoice.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        {/* Refund reference banners */}
        {isRefund && originalInvoice && (
          <div
            className="mx-6 mt-4 rounded-xl px-4 py-3 flex items-center gap-2"
            style={{
              background: "oklch(0.72 0.18 50 / 0.08)",
              border: "1px solid oklch(0.72 0.18 50 / 0.25)",
            }}
          >
            <RefreshCcw
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "oklch(0.72 0.18 50)" }}
            />
            <p className="text-xs" style={{ color: "oklch(0.72 0.18 50)" }}>
              This is a Refund Note for Invoice{" "}
              <span className="font-mono font-semibold">
                #{originalInvoice.invoiceNo}
              </span>
            </p>
          </div>
        )}
        {linkedRefundNote && (
          <div
            className="mx-6 mt-4 rounded-xl px-4 py-3 flex items-center gap-2"
            style={{
              background: "oklch(0.72 0.18 50 / 0.06)",
              border: "1px solid oklch(0.72 0.18 50 / 0.2)",
            }}
          >
            <RefreshCcw
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "oklch(0.72 0.18 50)" }}
            />
            <p className="text-xs" style={{ color: "oklch(0.72 0.18 50)" }}>
              Refunded via Invoice{" "}
              <span className="font-mono font-semibold">
                #{linkedRefundNote.invoiceNo}
              </span>
            </p>
          </div>
        )}

        {/* Action toolbar */}
        <div
          className="flex items-center gap-2 px-6 py-3 no-print flex-wrap"
          style={{ borderBottom: "1px solid oklch(0.16 0 0)" }}
          data-ocid="invoice-view-actions"
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-lg"
            onClick={handlePrint}
            data-ocid="invoice-print-btn"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-lg"
            onClick={handleDownload}
            data-ocid="invoice-download-btn"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          <a
            href={`https://wa.me/?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-lg"
              style={{
                borderColor: "oklch(0.7 0.18 152 / 0.4)",
                color: "oklch(0.7 0.18 152)",
              }}
              data-ocid="invoice-whatsapp-btn"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </a>
          <div className="flex-1" />

          {/* Create Refund — only for paid/partial invoices that aren't already refund notes */}
          {canDoRefund && !linkedRefundNote && (
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 rounded-lg"
              style={{
                background: "oklch(0.72 0.18 50 / 0.12)",
                color: "oklch(0.72 0.18 50)",
                border: "1px solid oklch(0.72 0.18 50 / 0.3)",
              }}
              onClick={onRefund}
              data-ocid="invoice-create-refund-btn"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Create Refund
            </Button>
          )}

          <Button
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-lg"
            style={{
              background: "oklch(0.75 0.15 82 / 0.12)",
              color: "oklch(0.75 0.15 82)",
              border: "1px solid oklch(0.75 0.15 82 / 0.25)",
            }}
            onClick={onEdit}
            data-ocid="invoice-edit-from-view-btn"
          >
            <Edit2 className="w-3.5 h-3.5" /> Record Payment
          </Button>
        </div>

        {/* Invoice body */}
        <div
          ref={printAreaRef}
          id="invoice-print-area"
          className="p-6 space-y-5"
        >
          {/* Org + Invoice header */}
          <div className="flex justify-between items-start">
            <div>
              <p
                className="text-lg font-display font-bold"
                style={{ color: "oklch(0.75 0.15 82)" }}
              >
                {agencyName}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-widest font-mono">
                Travel Agency
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest">
                Invoice No
              </p>
              <p
                className="text-base font-mono font-bold"
                style={{ color: "oklch(0.75 0.15 82)" }}
              >
                #{invoice.invoiceNo}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateLong(invoice.createdAt)}
              </p>
            </div>
          </div>

          <Separator style={{ background: "oklch(0.18 0 0)" }} />

          {/* Bill To */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.07 0 0 / 0.6)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2.5">
              Bill To
            </p>
            <p className="font-semibold text-foreground">
              {client?.name ?? "—"}
            </p>
            {client?.phone && (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {client.phone}
              </p>
            )}
            {client?.email && (
              <p className="text-xs text-muted-foreground">{client.email}</p>
            )}
          </div>

          {/* Invoice type + notes */}
          <div
            className="rounded-xl p-4 flex flex-wrap items-start gap-6"
            style={{
              background: "oklch(0.07 0 0 / 0.6)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
                Invoice Type
              </p>
              <InvoiceTypeBadge
                type={invoice.invoiceType}
                refundNote={isRefund}
              />
            </div>
            {invoice.notes && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
                  Notes
                </p>
                <p className="text-sm text-foreground break-words">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          {/* Booking details */}
          {booking && (
            <div
              className="rounded-xl p-4"
              style={{
                background: "oklch(0.07 0 0 / 0.6)",
                border: "1px solid oklch(0.18 0 0)",
              }}
            >
              <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-3">
                Booking Details
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  [
                    "Type",
                    bookingTypeLabelMap[booking.bookingType] ??
                      booking.bookingType,
                  ],
                  ["Sector", booking.sector ?? "—"],
                  ["PNR", booking.pnr ?? "—"],
                  ["Airline", booking.airline ?? "—"],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {l}
                    </p>
                    <p className="text-sm text-foreground font-mono">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services table */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
              Services
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid oklch(0.18 0 0)" }}
            >
              <div
                className="grid grid-cols-[1fr_140px] px-4 py-2.5"
                style={{ background: "oklch(0.14 0 0)" }}
              >
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Description
                </span>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-right">
                  Amount
                </span>
              </div>
              <div className="grid grid-cols-[1fr_140px] px-4 py-3.5">
                <span className="text-sm text-foreground">
                  {isRefund ? "Refund / Credit" : "Travel Services"}
                  {booking?.sector ? ` — ${booking.sector}` : ""}
                </span>
                <span className="text-sm font-mono text-foreground text-right">
                  {fmt(invoice.amount, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div
            className="rounded-xl p-4 space-y-2.5"
            style={{
              background: "oklch(0.07 0 0 / 0.7)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sub-total</span>
              <span className="text-foreground font-mono">
                {fmt(invoice.amount, currency)}
              </span>
            </div>
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span
                  className="font-mono"
                  style={{ color: "oklch(0.72 0.18 50)" }}
                >
                  + {fmt(invoice.taxAmount, currency)}
                </span>
              </div>
            )}
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span
                  className="font-mono"
                  style={{ color: "oklch(0.72 0.18 152)" }}
                >
                  − {fmt(invoice.discountAmount, currency)}
                </span>
              </div>
            )}
            {(invoice.taxAmount > 0 || invoice.discountAmount > 0) && (
              <div
                className="flex justify-between text-sm"
                style={{
                  borderTop: "1px solid oklch(0.18 0 0)",
                  paddingTop: "0.625rem",
                }}
              >
                <span className="text-muted-foreground font-medium">
                  Final Amount
                </span>
                <span className="text-foreground font-mono font-semibold">
                  {fmt(finalAmount, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span
                className="font-mono font-medium"
                style={{ color: "oklch(0.72 0.18 152)" }}
              >
                {fmt(invoice.paid, currency)}
              </span>
            </div>
            <div
              className="flex justify-between pt-2.5"
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
                className="text-lg font-bold font-mono"
                style={{
                  color:
                    invoice.due > 0
                      ? "oklch(0.75 0.15 82)"
                      : "oklch(0.72 0.18 152)",
                }}
              >
                {fmt(invoice.due, currency)}
              </span>
            </div>
          </div>

          {/* Accounting entries */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
              Accounting Entries
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid oklch(0.18 0 0)" }}
            >
              <div
                className="grid grid-cols-[80px_1fr_130px_130px] px-4 py-2.5"
                style={{ background: "oklch(0.14 0 0)" }}
              >
                {["Type", "Account", "Debit", "Credit"].map((h, i) => (
                  <span
                    key={h}
                    className={`text-[10px] font-mono text-muted-foreground uppercase tracking-widest ${i > 1 ? "text-right" : ""}`}
                  >
                    {h}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-[80px_1fr_130px_130px] px-4 py-3 items-center">
                <span
                  className="text-xs font-bold font-mono"
                  style={{ color: "oklch(0.65 0.22 22)" }}
                >
                  DR
                </span>
                <span className="text-sm text-foreground">
                  {client?.name ?? "Client A/c"}
                </span>
                <span
                  className="text-sm font-mono text-right"
                  style={{ color: "oklch(0.65 0.22 22)" }}
                >
                  {fmt(invoice.amount, currency)}
                </span>
                <span className="text-sm font-mono text-right text-muted-foreground">
                  —
                </span>
              </div>
              <Separator style={{ background: "oklch(0.15 0 0)" }} />
              <div className="grid grid-cols-[80px_1fr_130px_130px] px-4 py-3 items-center">
                <span
                  className="text-xs font-bold font-mono"
                  style={{ color: "oklch(0.72 0.18 152)" }}
                >
                  CR
                </span>
                <span className="text-sm text-foreground">Sales A/c</span>
                <span className="text-sm font-mono text-right text-muted-foreground">
                  —
                </span>
                <span
                  className="text-sm font-mono text-right"
                  style={{ color: "oklch(0.72 0.18 152)" }}
                >
                  {fmt(invoice.amount, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Invoice Modal (Record Payment) ──────────────────────────────────────

function EditInvoiceModal({
  invoice,
  client,
  currency,
  onClose,
}: {
  invoice: Invoice;
  client: Client | undefined;
  currency: string;
  onClose: () => void;
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [remarks, setRemarks] = useState("");
  const recordPayment = useRecordInvoicePayment();

  const amount = Number.parseFloat(paymentAmount) || 0;
  const newPaid = invoice.paid + amount;
  const newDue = Math.max(0, invoice.amount - newPaid);
  const newStatus: InvoiceStatus =
    newDue <= 0
      ? InvoiceStatus.paid
      : newPaid > 0
        ? InvoiceStatus.partial
        : InvoiceStatus.unpaid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (amount > invoice.due) {
      toast.error("Payment cannot exceed the due amount");
      return;
    }
    try {
      await recordPayment.mutateAsync({
        clientId: invoice.clientId,
        amount,
        paymentMethod,
        remarks: remarks || `Payment for Invoice #${invoice.invoiceNo}`,
      });
      toast.success(
        `Payment of ${fmt(amount, currency)} recorded successfully`,
      );
      onClose();
    } catch (_err) {
      toast.error("Failed to record payment. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "oklch(0.09 0.005 82)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          boxShadow: "0 25px 80px oklch(0 0 0 / 0.6)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-display">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.75 0.15 82 / 0.12)",
                color: "oklch(0.75 0.15 82)",
              }}
            >
              <Edit2 className="w-4 h-4" />
            </div>
            Record Payment — #{invoice.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        <div
          className="rounded-xl p-4 space-y-2.5"
          style={{
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="text-foreground font-medium">
              {client?.name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Amount</span>
            <span className="text-foreground font-mono">
              {fmt(invoice.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Already Paid</span>
            <span
              className="font-mono font-medium"
              style={{ color: "oklch(0.72 0.18 152)" }}
            >
              {fmt(invoice.paid, currency)}
            </span>
          </div>
          <div
            className="flex justify-between text-sm pt-2"
            style={{ borderTop: "1px solid oklch(0.18 0 0)" }}
          >
            <span className="text-muted-foreground font-semibold">
              Outstanding Due
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: "oklch(0.75 0.15 82)" }}
            >
              {fmt(invoice.due, currency)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Payment Amount *
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.due}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={`Max: ${fmt(invoice.due, currency)}`}
              className="font-mono"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              required
              data-ocid="edit-invoice-payment-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Payment Method
            </Label>
            <div className="flex gap-2">
              {(["cash", "bank"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200"
                  style={
                    paymentMethod === m
                      ? {
                          background: "oklch(0.75 0.15 82 / 0.15)",
                          border: "1px solid oklch(0.75 0.15 82 / 0.4)",
                          color: "oklch(0.75 0.15 82)",
                        }
                      : {
                          background: "oklch(0.12 0 0)",
                          border: "1px solid oklch(0.22 0 0)",
                          color: "oklch(0.5 0 0)",
                        }
                  }
                  data-ocid={`payment-method-${m}`}
                >
                  {m === "cash" ? "💵 Cash" : "🏦 Bank"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Remarks
            </Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={`Payment for Invoice #${invoice.invoiceNo}`}
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              data-ocid="edit-invoice-remarks-input"
            />
          </div>

          {amount > 0 && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.75 0.15 82 / 0.2)",
              }}
            >
              <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
                After This Payment
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Paid Amount</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: "oklch(0.72 0.18 152)" }}
                >
                  {fmt(newPaid, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining Due</span>
                <span className="font-mono font-medium text-foreground">
                  {fmt(newDue, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">New Status</span>
                <StatusBadge status={newStatus} />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl h-10 font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.18 72))",
                color: "oklch(0.1 0 0)",
              }}
              disabled={recordPayment.isPending || amount <= 0}
              data-ocid="edit-invoice-save-btn"
            >
              {recordPayment.isPending ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  invoice,
  currency,
  onClose,
}: {
  invoice: Invoice;
  currency: string;
  onClose: () => void;
}) {
  const handleConfirm = () => {
    toast.info(
      "Invoice deletion is managed through the booking cancellation flow.",
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm"
        style={{
          background: "oklch(0.09 0.005 82)",
          border: "1px solid oklch(0.65 0.22 22 / 0.3)",
          boxShadow: "0 25px 80px oklch(0 0 0 / 0.6)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-display">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.65 0.22 22 / 0.12)",
                color: "oklch(0.65 0.22 22)",
              }}
            >
              <Trash2 className="w-4 h-4" />
            </div>
            Delete Invoice?
          </DialogTitle>
        </DialogHeader>

        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice</span>
            <span className="text-foreground font-mono font-semibold">
              #{invoice.invoiceNo}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-foreground font-mono">
              {fmt(invoice.amount, currency)}
            </span>
          </div>
        </div>

        <div
          className="rounded-xl p-3.5 flex items-start gap-2.5"
          style={{
            background: "oklch(0.65 0.22 22 / 0.08)",
            border: "1px solid oklch(0.65 0.22 22 / 0.2)",
          }}
        >
          <AlertCircle
            className="w-4 h-4 mt-0.5 flex-shrink-0"
            style={{ color: "oklch(0.65 0.22 22)" }}
          />
          <p className="text-xs" style={{ color: "oklch(0.7 0.15 22)" }}>
            Invoices are linked to bookings. To remove an invoice, cancel the
            associated booking which will reverse the accounting entries.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-10"
            onClick={onClose}
            data-ocid="delete-invoice-cancel-btn"
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl h-10 font-semibold"
            style={{
              background: "oklch(0.65 0.22 22 / 0.15)",
              border: "1px solid oklch(0.65 0.22 22 / 0.3)",
              color: "oklch(0.7 0.22 22)",
            }}
            onClick={handleConfirm}
            data-ocid="delete-invoice-confirm-btn"
          >
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Invoice Modal ─────────────────────────────────────────────────────────

const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: InvoiceType.booking, label: "Booking" },
  { value: InvoiceType.manual, label: "Manual" },
  { value: InvoiceType.proforma, label: "Proforma" },
  { value: InvoiceType.creditNote, label: "Credit Note" },
  { value: InvoiceType.debitNote, label: "Debit Note" },
];

function AddInvoiceModal({
  clients,
  currency,
  onClose,
}: {
  clients: Client[];
  currency: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(
    InvoiceType.booking,
  );
  const [taxAmount, setTaxAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [notes, setNotes] = useState("");

  const filteredClients = useMemo(
    () =>
      clients
        .filter((c) =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()),
        )
        .slice(0, 8),
    [clients, clientSearch],
  );

  const amountNum = Number.parseFloat(amount) || 0;
  const taxNum = Number.parseFloat(taxAmount) || 0;
  const discountNum = Number.parseFloat(discountAmount) || 0;
  const finalAmount = amountNum + taxNum - discountNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }
    if (amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    toast.info(
      "Manual invoices are created automatically when a booking is saved. Use the Bookings module to create a new booking.",
    );
    onClose();
    navigate({ to: "/bookings" });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(0.09 0.005 82)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          boxShadow: "0 25px 80px oklch(0 0 0 / 0.6)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base font-display">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "oklch(0.75 0.15 82 / 0.12)",
                color: "oklch(0.75 0.15 82)",
              }}
            >
              <Plus className="w-4 h-4" />
            </div>
            New Invoice
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Invoice Type *
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {INVOICE_TYPES.map(({ value, label }) => {
                const cfg = TYPE_CONFIG[value];
                const isActive = invoiceType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setInvoiceType(value)}
                    className="py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 text-left"
                    style={
                      isActive
                        ? {
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            color: cfg.color,
                          }
                        : {
                            background: "oklch(0.12 0 0)",
                            border: "1px solid oklch(0.22 0 0)",
                            color: "oklch(0.5 0 0)",
                          }
                    }
                    data-ocid={`invoice-type-${value}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Client *
            </Label>
            <Input
              value={selectedClient ? selectedClient.name : clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setSelectedClient(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search client by name…"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              data-ocid="add-invoice-client-input"
            />
            {showDropdown && filteredClients.length > 0 && !selectedClient && (
              <div
                className="absolute z-50 top-full mt-1 w-full rounded-xl overflow-hidden shadow-lg"
                style={{
                  background: "oklch(0.13 0.003 82)",
                  border: "1px solid oklch(0.22 0 0)",
                }}
              >
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[oklch(0.18_0_0)] transition-colors"
                    onClick={() => {
                      setSelectedClient(c);
                      setShowDropdown(false);
                    }}
                  >
                    <span className="text-foreground font-medium">
                      {c.name}
                    </span>
                    <span className="text-muted-foreground text-xs ml-2">
                      {c.phone}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Date *
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              required
              data-ocid="add-invoice-date-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Description / Remarks
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Travel services, booking details…"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              data-ocid="add-invoice-description-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Amount ({currency}) *
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="font-mono"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              required
              data-ocid="add-invoice-amount-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
                Tax Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                style={{
                  background: "oklch(0.12 0 0)",
                  border: "1px solid oklch(0.22 0 0)",
                }}
                data-ocid="add-invoice-tax-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
                Discount Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono"
                style={{
                  background: "oklch(0.12 0 0)",
                  border: "1px solid oklch(0.22 0 0)",
                }}
                data-ocid="add-invoice-discount-input"
              />
            </div>
          </div>

          {amountNum > 0 && (taxNum > 0 || discountNum > 0) && (
            <div
              className="rounded-xl p-3.5 flex items-center justify-between"
              style={{
                background: "oklch(0.75 0.15 82 / 0.07)",
                border: "1px solid oklch(0.75 0.15 82 / 0.2)",
              }}
            >
              <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                {taxNum > 0 && (
                  <div>
                    {fmt(amountNum, currency)}{" "}
                    <span style={{ color: "oklch(0.72 0.18 50)" }}>
                      + {fmt(taxNum, currency)} tax
                    </span>
                  </div>
                )}
                {discountNum > 0 && (
                  <div>
                    <span style={{ color: "oklch(0.72 0.18 152)" }}>
                      − {fmt(discountNum, currency)} discount
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase font-mono tracking-widest">
                  Final
                </p>
                <p
                  className="text-base font-bold font-mono"
                  style={{ color: "oklch(0.75 0.15 82)" }}
                >
                  {fmt(finalAmount, currency)}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
              Notes (optional)
            </Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this invoice…"
              rows={3}
              className="w-full rounded-lg text-sm px-3 py-2.5 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.22 0 0)",
              }}
              data-ocid="add-invoice-notes-input"
            />
          </div>

          {amountNum > 0 && selectedClient && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.75 0.15 82 / 0.2)",
              }}
            >
              <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-2">
                Accounting Effect
              </p>
              <div className="flex justify-between text-sm">
                <span style={{ color: "oklch(0.65 0.22 22)" }}>
                  DR — {selectedClient.name}
                </span>
                <span
                  className="font-mono"
                  style={{ color: "oklch(0.65 0.22 22)" }}
                >
                  {fmt(amountNum, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "oklch(0.72 0.18 152)" }}>
                  CR — Sales A/c
                </span>
                <span
                  className="font-mono"
                  style={{ color: "oklch(0.72 0.18 152)" }}
                >
                  {fmt(amountNum, currency)}
                </span>
              </div>
            </div>
          )}

          <div
            className="rounded-xl p-3.5 flex items-start gap-2.5"
            style={{
              background: "oklch(0.75 0.15 82 / 0.06)",
              border: "1px solid oklch(0.75 0.15 82 / 0.15)",
            }}
          >
            <ArrowUpRight
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: "oklch(0.75 0.15 82)" }}
            />
            <p className="text-xs" style={{ color: "oklch(0.7 0.1 82)" }}>
              Invoices are automatically generated when bookings are saved. For
              a new invoice, add a booking in the Bookings module.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl h-10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl h-10 font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.18 72))",
                color: "oklch(0.1 0 0)",
              }}
              data-ocid="add-invoice-submit-btn"
            >
              Go to Bookings →
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Type Filter Tab Row ───────────────────────────────────────────────────────

const TYPE_TABS: { key: TypeTab; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: InvoiceType.booking, label: "Booking" },
  { key: InvoiceType.manual, label: "Manual" },
  { key: InvoiceType.proforma, label: "Proforma" },
  { key: InvoiceType.creditNote, label: "Credit Note" },
  { key: "refundNote", label: "Refund Note" },
  { key: InvoiceType.debitNote, label: "Debit Note" },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [typeFilter, setTypeFilter] = useState<TypeTab>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const { data: allInvoices = [], isLoading: allLoading } = useInvoices();
  const { data: typeInvoices = [], isLoading: typeLoading } = useInvoicesByType(
    typeFilter !== "all" && typeFilter !== "refundNote" ? typeFilter : "",
  );
  const { data: summary, isLoading: summaryLoading } = useInvoicesSummary();
  const { data: clients = [] } = useClients();
  const { data: bookings = [] } = useBookings();
  const { data: settings } = useSettings();

  const currency = settings?.currency ?? "PKR";
  const agencyName = settings?.agencyName ?? "Travel Agency";

  // Determine the invoice base list based on type filter
  const baseInvoices = useMemo(() => {
    if (typeFilter === "refundNote") {
      return allInvoices.filter((i) => isRefundNote(i));
    }
    if (typeFilter !== "all") return typeInvoices;
    return allInvoices;
  }, [typeFilter, typeInvoices, allInvoices]);

  const isLoading =
    typeFilter !== "all" && typeFilter !== "refundNote"
      ? typeLoading
      : allLoading;

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c])),
    [clients],
  );
  const bookingMap = useMemo(
    () => Object.fromEntries(bookings.map((b) => [b.id, b])),
    [bookings],
  );

  // ─── Filtered list ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = baseInvoices;
    if (filter === "refunded") {
      list = list.filter((i) => isRefundNote(i));
    } else if (filter !== "all") {
      list = list.filter((i) => i.status === filter);
    }
    if (clientSearch.trim()) {
      const q = clientSearch.toLowerCase();
      list = list.filter(
        (i) =>
          clientMap[i.clientId]?.name?.toLowerCase().includes(q) ||
          i.invoiceNo.toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime() * 1_000_000;
      list = list.filter((i) => Number(i.createdAt) >= from);
    }
    if (dateTo) {
      const to = (new Date(dateTo).getTime() + 86_400_000) * 1_000_000;
      list = list.filter((i) => Number(i.createdAt) <= to);
    }
    return list;
  }, [baseInvoices, filter, clientSearch, dateFrom, dateTo, clientMap]);

  // ─── Summary stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = allInvoices.reduce((s, i) => s + i.amount, 0);
    const paid = allInvoices.reduce((s, i) => s + i.paid, 0);
    const due = allInvoices.reduce((s, i) => s + i.due, 0);
    return { total, paid, due, count: allInvoices.length };
  }, [allInvoices]);

  const TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: InvoiceStatus.unpaid, label: "Unpaid" },
    { key: InvoiceStatus.partial, label: "Partial" },
    { key: InvoiceStatus.paid, label: "Paid" },
    { key: "refunded", label: "Refunded" },
  ];

  const openModal = (invoice: Invoice, mode: Exclude<ModalMode, "add">) => {
    setSelectedInvoice(invoice);
    setModalMode(mode);
  };

  const closeModal = () => {
    setSelectedInvoice(null);
    setModalMode(null);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-6">
        {/* Page header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground flex items-center gap-2.5">
              <ReceiptText
                className="w-6 h-6"
                style={{ color: "oklch(0.75 0.15 82)" }}
              />
              Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track and manage all client invoices, payments, and refunds
            </p>
          </div>
          <Button
            className="gap-2 rounded-xl h-10 px-5 font-semibold text-sm"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.18 72))",
              color: "oklch(0.1 0 0)",
              boxShadow: "0 4px 20px oklch(0.75 0.15 82 / 0.25)",
            }}
            onClick={() => setModalMode("add")}
            data-ocid="new-invoice-btn"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>

        {/* Invoice Summary Bar */}
        <SummaryBar
          summary={summary}
          isLoading={summaryLoading}
          currency={currency}
        />

        {/* Stat cards */}
        {allLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {["stat-a", "stat-b", "stat-c", "stat-d"].map((k) => (
              <Skeleton key={k} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            data-ocid="invoice-stats"
          >
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              label="Total Invoices"
              value={stats.count.toString()}
              sub={`${allInvoices.filter((i) => i.status === InvoiceStatus.unpaid).length} unpaid`}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Total Amount"
              value={fmt(stats.total, currency)}
              accent
            />
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              label="Total Paid"
              value={fmt(stats.paid, currency)}
              sub="collected"
            />
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              label="Outstanding"
              value={fmt(stats.due, currency)}
              sub="receivable"
            />
          </div>
        )}

        {/* Invoice type filter tabs */}
        <div
          className="rounded-2xl px-4 py-3 overflow-x-auto"
          style={{
            background: "oklch(0.11 0.005 82 / 0.4)",
            border: "1px solid oklch(0.18 0 0)",
          }}
          data-ocid="invoice-type-tabs"
        >
          <div
            className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            {TYPE_TABS.map(({ key, label }) => {
              const isActive = typeFilter === key;
              const typeCfg =
                key !== "all" && key !== "refundNote"
                  ? TYPE_CONFIG[key as InvoiceType]
                  : null;
              const isRefundTab = key === "refundNote";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
                  style={
                    isActive
                      ? isRefundTab
                        ? {
                            background: REFUND_NOTE_CONFIG.bg,
                            color: REFUND_NOTE_CONFIG.color,
                            border: `1px solid ${REFUND_NOTE_CONFIG.border}`,
                          }
                        : typeCfg
                          ? {
                              background: typeCfg.bg,
                              color: typeCfg.color,
                              border: `1px solid ${typeCfg.border}`,
                            }
                          : {
                              background: "oklch(0.75 0.15 82 / 0.15)",
                              color: "oklch(0.75 0.15 82)",
                              border: "1px solid oklch(0.75 0.15 82 / 0.3)",
                            }
                      : { background: "transparent", color: "oklch(0.45 0 0)" }
                  }
                  data-ocid={`invoice-type-tab-${key}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status filters bar */}
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-3"
          style={{
            background: "oklch(0.11 0.005 82 / 0.5)",
            border: "1px solid oklch(0.18 0 0)",
          }}
          data-ocid="invoice-filters"
        >
          {/* Status tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "oklch(0.08 0 0)",
              border: "1px solid oklch(0.18 0 0)",
            }}
          >
            {TABS.map(({ key, label }) => {
              const count =
                key === "all"
                  ? baseInvoices.length
                  : key === "refunded"
                    ? baseInvoices.filter((i) => isRefundNote(i)).length
                    : baseInvoices.filter((i) => i.status === key).length;
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
                  style={
                    isActive
                      ? {
                          background:
                            key === "refunded"
                              ? "oklch(0.72 0.18 50 / 0.15)"
                              : "oklch(0.75 0.15 82 / 0.15)",
                          color:
                            key === "refunded"
                              ? "oklch(0.72 0.18 50)"
                              : "oklch(0.75 0.15 82)",
                        }
                      : { background: "transparent", color: "oklch(0.45 0 0)" }
                  }
                  data-ocid={`invoice-tab-${key}`}
                >
                  {label}
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-4 font-mono"
                    style={
                      isActive
                        ? {
                            background:
                              key === "refunded"
                                ? "oklch(0.72 0.18 50 / 0.2)"
                                : "oklch(0.75 0.15 82 / 0.2)",
                            color:
                              key === "refunded"
                                ? "oklch(0.72 0.18 50)"
                                : "oklch(0.75 0.15 82)",
                            border: "none",
                          }
                        : {
                            background: "oklch(0.14 0 0)",
                            color: "oklch(0.4 0 0)",
                            border: "none",
                          }
                    }
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search client or invoice…"
              className="h-8 text-sm max-w-[200px]"
              style={{
                background: "oklch(0.08 0 0)",
                border: "1px solid oklch(0.2 0 0)",
              }}
              data-ocid="invoice-search-input"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-sm w-[140px]"
              style={{
                background: "oklch(0.08 0 0)",
                border: "1px solid oklch(0.2 0 0)",
              }}
              data-ocid="invoice-date-from"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-sm w-[140px]"
              style={{
                background: "oklch(0.08 0 0)",
                border: "1px solid oklch(0.2 0 0)",
              }}
              data-ocid="invoice-date-to"
            />
            {(dateFrom || dateTo || clientSearch) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setClientSearch("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "oklch(0.11 0.005 82 / 0.4)",
            border: "1px solid oklch(0.18 0 0)",
          }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[100px_1fr_140px_110px_130px_130px_110px_110px_100px] px-5 py-3"
            style={{
              background: "oklch(0.13 0.003 82)",
              borderBottom: "1px solid oklch(0.18 0 0)",
            }}
          >
            {[
              "Invoice No",
              "Client",
              "Type",
              "Date",
              "Amount",
              "Paid",
              "Due",
              "Status",
              "Actions",
            ].map((h) => (
              <span
                key={h}
                className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Table body */}
          {isLoading ? (
            <div className="space-y-px">
              {["r1", "r2", "r3", "r4", "r5", "r6"].map((k) => (
                <div key={k} className="px-5 py-4">
                  <Skeleton className="h-5 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-4"
              data-ocid="invoice-empty-state"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.75 0.15 82 / 0.08)" }}
              >
                <FileText
                  className="w-8 h-8"
                  style={{ color: "oklch(0.75 0.15 82 / 0.5)" }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  No invoices found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filter !== "all"
                    ? `No ${filter} invoices. Try a different filter.`
                    : typeFilter !== "all"
                      ? `No ${typeFilter === "refundNote" ? "Refund Note" : (TYPE_CONFIG[typeFilter as InvoiceType]?.label ?? typeFilter)} invoices found.`
                      : "Invoices are auto-created when bookings are saved."}
                </p>
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((invoice, idx) => {
                const client = clientMap[invoice.clientId];
                const isLast = idx === filtered.length - 1;
                const agingClass = getAgingClass(invoice);
                const refundNote = isRefundNote(invoice);
                const hasLinkedRefund = allInvoices.some(
                  (inv) =>
                    inv.invoiceType === InvoiceType.creditNote &&
                    inv.refundedInvoiceId === invoice.id,
                );
                return (
                  <div
                    key={invoice.id}
                    className={`grid grid-cols-[100px_1fr_140px_110px_130px_130px_110px_110px_100px] w-full px-5 py-3.5 items-center hover:bg-[oklch(0.14_0_0_/_0.5)] transition-colors duration-150 group ${agingClass}`}
                    style={
                      !isLast
                        ? { borderBottom: "1px solid oklch(0.16 0 0)" }
                        : {}
                    }
                    data-ocid={`invoice-row-${invoice.id}`}
                  >
                    {/* Invoice No */}
                    <button
                      type="button"
                      className="font-mono text-sm font-semibold text-left"
                      style={{ color: "oklch(0.75 0.15 82)" }}
                      onClick={() => openModal(invoice, "view")}
                    >
                      #{invoice.invoiceNo}
                    </button>

                    {/* Client */}
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground truncate pr-2 text-left"
                      onClick={() => openModal(invoice, "view")}
                    >
                      {client?.name ?? "—"}
                    </button>

                    {/* Invoice Type badge */}
                    <div className="flex flex-col gap-0.5">
                      <InvoiceTypeBadge
                        type={invoice.invoiceType}
                        refundNote={refundNote}
                      />
                      {hasLinkedRefund && <RefundedBadge />}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDate(invoice.createdAt)}
                    </span>

                    {/* Amount */}
                    <span className="text-sm font-mono text-foreground">
                      {fmt(invoice.amount, currency)}
                    </span>

                    {/* Paid */}
                    <span
                      className="text-sm font-mono font-medium"
                      style={{ color: "oklch(0.72 0.18 152)" }}
                    >
                      {fmt(invoice.paid, currency)}
                    </span>

                    {/* Due */}
                    <span
                      className="text-sm font-mono font-semibold"
                      style={{
                        color:
                          invoice.due > 0
                            ? "oklch(0.75 0.15 82)"
                            : "oklch(0.72 0.18 152)",
                      }}
                    >
                      {fmt(invoice.due, currency)}
                    </span>

                    {/* Status */}
                    <StatusBadge status={invoice.status} />

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openModal(invoice, "view")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-110"
                        style={{
                          background: "oklch(0.75 0.15 82 / 0.08)",
                          color: "oklch(0.75 0.15 82)",
                        }}
                        title="View Invoice"
                        aria-label="View Invoice"
                        data-ocid={`invoice-view-${invoice.id}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(invoice, "edit")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-110"
                        style={{
                          background: "oklch(0.72 0.18 152 / 0.08)",
                          color: "oklch(0.72 0.18 152)",
                        }}
                        title="Record Payment"
                        aria-label="Record Payment"
                        data-ocid={`invoice-edit-${invoice.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {canRefund(invoice) && !hasLinkedRefund && (
                        <button
                          type="button"
                          onClick={() => openModal(invoice, "refund")}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-110"
                          style={{
                            background: "oklch(0.72 0.18 50 / 0.08)",
                            color: "oklch(0.72 0.18 50)",
                          }}
                          title="Create Refund"
                          aria-label="Create Refund"
                          data-ocid={`invoice-refund-${invoice.id}`}
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openModal(invoice, "delete")}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-110"
                        style={{
                          background: "oklch(0.65 0.22 22 / 0.08)",
                          color: "oklch(0.65 0.22 22)",
                        }}
                        title="Delete Invoice"
                        aria-label="Delete Invoice"
                        data-ocid={`invoice-delete-${invoice.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer row count */}
          {!isLoading && filtered.length > 0 && (
            <div
              className="px-5 py-3 flex items-center gap-2 flex-wrap"
              style={{
                borderTop: "1px solid oklch(0.16 0 0)",
                background: "oklch(0.10 0 0 / 0.4)",
              }}
            >
              <p className="text-xs text-muted-foreground font-mono">
                Showing {filtered.length} of {baseInvoices.length} invoices
                {typeFilter !== "all" && (
                  <span
                    className="ml-1.5"
                    style={{
                      color:
                        typeFilter === "refundNote"
                          ? REFUND_NOTE_CONFIG.color
                          : (TYPE_CONFIG[typeFilter as InvoiceType]?.color ??
                            "inherit"),
                    }}
                  >
                    ·{" "}
                    {typeFilter === "refundNote"
                      ? "Refund Notes"
                      : (TYPE_CONFIG[typeFilter as InvoiceType]?.label ??
                        typeFilter)}
                  </span>
                )}
              </p>
              {/* Aging legend */}
              <div className="flex items-center gap-3 ml-auto">
                {[
                  { label: "30d+", color: "oklch(0.75 0.15 82)" },
                  { label: "60d+", color: "oklch(0.68 0.2 38)" },
                  { label: "90d+", color: "oklch(0.65 0.22 22)" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div
                      className="w-2 h-3 rounded-sm"
                      style={{ background: color }}
                    />
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "oklch(0.4 0 0)" }}
                    >
                      {label} overdue
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary footer cards */}
        {!isLoading && filtered.length > 0 && (
          <div
            className="grid grid-cols-3 gap-4 rounded-2xl p-5"
            style={{
              background: "oklch(0.11 0.005 82 / 0.5)",
              border: "1px solid oklch(0.18 0 0)",
            }}
            data-ocid="invoice-summary-footer"
          >
            {[
              {
                label: "Filtered Total",
                value: fmt(
                  filtered.reduce((s, i) => s + i.amount, 0),
                  currency,
                ),
                color: "oklch(0.9 0 0)",
              },
              {
                label: "Filtered Paid",
                value: fmt(
                  filtered.reduce((s, i) => s + i.paid, 0),
                  currency,
                ),
                color: "oklch(0.72 0.18 152)",
              },
              {
                label: "Filtered Due",
                value: fmt(
                  filtered.reduce((s, i) => s + i.due, 0),
                  currency,
                ),
                color:
                  filtered.reduce((s, i) => s + i.due, 0) > 0
                    ? "oklch(0.75 0.15 82)"
                    : "oklch(0.72 0.18 152)",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest mb-1.5">
                  {label}
                </p>
                <p
                  className="text-lg font-semibold font-mono"
                  style={{ color }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedInvoice && modalMode === "view" && (
        <ViewInvoiceModal
          invoice={selectedInvoice}
          client={clientMap[selectedInvoice.clientId]}
          booking={bookingMap[selectedInvoice.bookingId]}
          agencyName={agencyName}
          currency={currency}
          allInvoices={allInvoices}
          onClose={closeModal}
          onEdit={() => setModalMode("edit")}
          onRefund={() => setModalMode("refund")}
        />
      )}

      {selectedInvoice && modalMode === "edit" && (
        <EditInvoiceModal
          invoice={selectedInvoice}
          client={clientMap[selectedInvoice.clientId]}
          currency={currency}
          onClose={closeModal}
        />
      )}

      {selectedInvoice && modalMode === "delete" && (
        <DeleteConfirmDialog
          invoice={selectedInvoice}
          currency={currency}
          onClose={closeModal}
        />
      )}

      {selectedInvoice && modalMode === "refund" && (
        <RefundInvoiceModal
          invoice={selectedInvoice}
          client={clientMap[selectedInvoice.clientId]}
          currency={currency}
          onClose={closeModal}
        />
      )}

      {modalMode === "add" && (
        <AddInvoiceModal
          clients={clients}
          currency={currency}
          onClose={closeModal}
        />
      )}
    </Layout>
  );
}
