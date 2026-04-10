import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle,
  Eye,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  Printer,
  Receipt,
  SendHorizonal,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import {
  useAddAdvanceVoucher,
  useAddContraVoucher,
  useAddJournalVoucher,
  useAddPaymentVoucher,
  useAddReceiptVoucher,
  useAdvanceVouchers,
  useClients,
  useDeleteAdvanceVoucher,
  useSettings,
  useSuppliers,
  useUpdateAdvanceVoucher,
  useUpdateContraVoucher,
  useUpdateJournalVoucher,
  useUpdatePaymentVoucher,
  useUpdateReceiptVoucher,
  useVouchers,
  useVouchersSummary,
} from "../hooks/useBackend";
import type {
  AdvanceVoucher,
  AdvanceVoucherFormData,
  ContraVoucherFormData,
  JournalVoucherFormData,
  PaymentVoucherFormData,
  ReceiptVoucherFormData,
  Voucher,
} from "../types";
import { VoucherType } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

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

function tsToInputDate(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) / 1_000_000 : ts;
  return new Date(ms).toISOString().split("T")[0];
}

function getVoucherTypeKey(v: Voucher): string {
  const t = v.voucherType as unknown as { __kind__: string } | string;
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "__kind__" in t) return t.__kind__;
  return "receipt";
}

function getPaymentMethodKey(v: Voucher): string {
  const arr = v.paymentMethod as unknown as { __kind__: string }[] | undefined;
  return arr?.[0]?.__kind__ ?? "";
}

function getRemarks(v: Voucher): string {
  const arr = v.remarks as unknown as string[] | undefined;
  return arr?.[0] ?? "";
}

function getClientId(v: Voucher): string {
  const arr = v.clientId as unknown as string[] | undefined;
  return arr?.[0] ?? "";
}

function getSupplierId(v: Voucher): string {
  const arr = v.supplierId as unknown as string[] | undefined;
  return arr?.[0] ?? "";
}

function getAVField<T>(
  v: AdvanceVoucher,
  key: keyof AdvanceVoucher,
): T | undefined {
  const val = v[key] as unknown;
  if (Array.isArray(val)) return val[0] as T;
  if (val !== null && val !== undefined) return val as T;
  return undefined;
}

function getAdvanceTypeKey(v: AdvanceVoucher): "received" | "paid" {
  const at = getAVField<{ __kind__: string } | string>(v, "advanceType");
  if (typeof at === "string") return at as "received" | "paid";
  if (at && typeof at === "object" && "__kind__" in at)
    return at.__kind__ as "received" | "paid";
  return "received";
}

function getAVPaymentMethod(v: AdvanceVoucher): string {
  const pm = getAVField<{ __kind__: string } | string>(v, "paymentMethod");
  if (typeof pm === "string") return pm;
  if (pm && typeof pm === "object" && "__kind__" in pm) return pm.__kind__;
  return "";
}

// ─── OKLCH type colors ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  receipt: {
    color: "oklch(0.72 0.18 150)",
    bg: "oklch(0.72 0.18 150 / 0.15)",
    label: "RV",
  },
  payment: {
    color: "oklch(0.65 0.22 22)",
    bg: "oklch(0.65 0.22 22 / 0.15)",
    label: "PV",
  },
  journal: {
    color: "oklch(0.65 0.2 265)",
    bg: "oklch(0.65 0.2 265 / 0.15)",
    label: "JV",
  },
  contra: {
    color: "oklch(0.72 0.18 295)",
    bg: "oklch(0.72 0.18 295 / 0.15)",
    label: "CV",
  },
  advance: {
    color: "oklch(0.75 0.15 82)",
    bg: "oklch(0.75 0.15 82 / 0.15)",
    label: "AV",
  },
};

function VoucherBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS.receipt;
  return (
    <span
      className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  );
}

function AdvanceTypeBadge({ type }: { type: "received" | "paid" }) {
  const isReceived = type === "received";
  return (
    <span
      className="text-xs font-medium px-2.5 py-0.5 rounded-full"
      style={
        isReceived
          ? {
              color: "oklch(0.72 0.18 150)",
              background: "oklch(0.72 0.18 150 / 0.15)",
            }
          : {
              color: "oklch(0.65 0.22 22)",
              background: "oklch(0.65 0.22 22 / 0.15)",
            }
      }
    >
      {isReceived ? "Received" : "Paid"}
    </span>
  );
}

// ─── Accounting preview ────────────────────────────────────────────────────────

function AccountingPreview({ lines }: { lines: string[] }) {
  return (
    <div
      className="rounded-lg p-3 text-xs font-mono space-y-1.5"
      style={{
        background: "oklch(0.75 0.15 82 / 0.06)",
        border: "1px solid oklch(0.75 0.15 82 / 0.2)",
      }}
    >
      <p className="text-muted-foreground text-xs mb-1">
        Accounting Entry Preview
      </p>
      {lines.map((line) => (
        <div key={line} className="text-accent/90">
          {line}
        </div>
      ))}
    </div>
  );
}

// ─── Payment Method toggle ────────────────────────────────────────────────────

function PaymentMethodToggle({
  value,
  onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {["cash", "bank"].map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-smooth capitalize"
          style={
            value === m
              ? { background: "oklch(0.75 0.15 82)", color: "oklch(0.085 0 0)" }
              : {
                  background: "oklch(0.16 0 0)",
                  color: "oklch(0.52 0 0)",
                  border: "1px solid oklch(0.22 0 0)",
                }
          }
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Searchable Select ─────────────────────────────────────────────────────────

interface SelectOption {
  id: string;
  name: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-smooth"
        style={{
          background: "oklch(0.16 0 0)",
          border: "1px solid oklch(0.22 0 0)",
          color: selected ? "oklch(0.93 0 0)" : "oklch(0.52 0 0)",
        }}
        data-ocid="searchable-select-trigger"
      >
        {selected?.name ?? placeholder}
        <span className="text-muted-foreground text-xs">▾</span>
      </button>
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
          style={{
            background: "oklch(0.15 0 0)",
            border: "1px solid oklch(0.22 0 0)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div className="p-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 text-xs"
              style={{
                background: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.2 0 0)",
              }}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No results
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full px-3 py-2 text-sm text-left transition-smooth"
                  style={
                    value === o.id
                      ? {
                          color: "oklch(0.75 0.15 82)",
                          background: "oklch(0.75 0.15 82 / 0.08)",
                        }
                      : { color: "oklch(0.85 0 0)" }
                  }
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {o.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl overflow-hidden`}
        style={{
          background: "oklch(0.11 0 0)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px oklch(0.75 0.15 82 / 0.05)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
        >
          <h3 className="font-display text-lg font-semibold text-accent">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-smooth"
            style={{ background: "oklch(0.16 0 0)" }}
          >
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Type selector modal ───────────────────────────────────────────────────────

type VoucherTypeKey = "receipt" | "payment" | "journal" | "contra" | "advance";

function TypeSelectorModal({
  onSelect,
  onClose,
}: { onSelect: (t: VoucherTypeKey) => void; onClose: () => void }) {
  const types: {
    key: VoucherTypeKey;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "receipt",
      label: "Receipt Voucher",
      desc: "Cash/Bank received from client",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      key: "payment",
      label: "Payment Voucher",
      desc: "Cash/Bank paid to supplier",
      icon: <SendHorizonal className="w-5 h-5" />,
    },
    {
      key: "journal",
      label: "Journal Voucher",
      desc: "General ledger adjustments",
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      key: "contra",
      label: "Contra Voucher",
      desc: "Transfer between cash & bank",
      icon: <ArrowLeftRight className="w-5 h-5" />,
    },
    {
      key: "advance",
      label: "Advance / Deposit",
      desc: "Advance received or paid",
      icon: <Wallet className="w-5 h-5" />,
    },
  ];
  return (
    <Modal title="Select Voucher Type" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {types.map((t) => {
          const c = TYPE_COLORS[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-smooth"
              style={{
                background: "oklch(0.14 0 0)",
                border: `1px solid ${c.color}30`,
              }}
              data-ocid={`type-select-${t.key}`}
            >
              <span style={{ color: c.color }}>{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Receipt Voucher form modal ───────────────────────────────────────────────

function ReceiptVoucherModal({
  onClose,
  editData,
}: { onClose: () => void; editData?: Voucher }) {
  const { data: clients = [] } = useClients();
  const addRV = useAddReceiptVoucher();
  const updateRV = useUpdateReceiptVoucher();
  const isEdit = !!editData;

  const [form, setForm] = useState<ReceiptVoucherFormData>({
    date: editData ? tsToInputDate(editData.date) : TODAY,
    clientId: editData ? getClientId(editData) : "",
    amount: editData ? Number(editData.amount) : 0,
    paymentMethod: editData ? getPaymentMethodKey(editData) || "cash" : "cash",
    remarks: editData ? getRemarks(editData) : "",
  });

  const set = (k: keyof ReceiptVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const method = form.paymentMethod === "bank" ? "Bank" : "Cash";
  const clientName =
    clients.find((c) => c.id === form.clientId)?.name ?? "Client";

  async function handleSave() {
    if (!form.clientId || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      if (isEdit && editData) {
        await updateRV.mutateAsync({ ...form, id: editData.id });
        toast.success("Receipt voucher updated.");
      } else {
        await addRV.mutateAsync(form);
        toast.success("Receipt voucher posted. Ledger updated.");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const isPending = addRV.isPending || updateRV.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Receipt Voucher (RV)" : "New Receipt Voucher (RV)"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="bg-secondary border-border/40"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Amount *
            </Label>
            <Input
              type="number"
              min={0}
              value={form.amount || ""}
              onChange={(e) => set("amount", Number(e.target.value))}
              placeholder="0.00"
              className="bg-secondary border-border/40"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Client *
          </Label>
          <SearchableSelect
            options={clientOptions}
            value={form.clientId}
            onChange={(v) => set("clientId", v)}
            placeholder="Select client..."
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Payment Method
          </Label>
          <PaymentMethodToggle
            value={form.paymentMethod}
            onChange={(v) => set("paymentMethod", v)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Remarks
          </Label>
          <Textarea
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Optional note..."
            className="bg-secondary border-border/40 resize-none"
            rows={2}
          />
        </div>
        {form.amount > 0 && (
          <AccountingPreview
            lines={[
              `${method} A/c  Dr  ${fmt(form.amount)}`,
              `  ${clientName} A/c  Cr  ${fmt(form.amount)}`,
            ]}
          />
        )}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={handleSave}
            disabled={isPending}
            data-ocid="rv-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Receipt Voucher"
                : "Post Receipt Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Payment Voucher form modal ───────────────────────────────────────────────

function PaymentVoucherModal({
  onClose,
  editData,
}: { onClose: () => void; editData?: Voucher }) {
  const { data: suppliers = [] } = useSuppliers();
  const addPV = useAddPaymentVoucher();
  const updatePV = useUpdatePaymentVoucher();
  const isEdit = !!editData;

  const [form, setForm] = useState<PaymentVoucherFormData>({
    date: editData ? tsToInputDate(editData.date) : TODAY,
    supplierId: editData ? getSupplierId(editData) : "",
    amount: editData ? Number(editData.amount) : 0,
    paymentMethod: editData ? getPaymentMethodKey(editData) || "cash" : "cash",
    remarks: editData ? getRemarks(editData) : "",
  });

  const set = (k: keyof PaymentVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const method = form.paymentMethod === "bank" ? "Bank" : "Cash";
  const supplierName =
    suppliers.find((s) => s.id === form.supplierId)?.name ?? "Supplier";

  async function handleSave() {
    if (!form.supplierId || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      if (isEdit && editData) {
        await updatePV.mutateAsync({ ...form, id: editData.id });
        toast.success("Payment voucher updated.");
      } else {
        await addPV.mutateAsync(form);
        toast.success("Payment voucher posted. Ledger updated.");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const isPending = addPV.isPending || updatePV.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Payment Voucher (PV)" : "New Payment Voucher (PV)"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="bg-secondary border-border/40"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Amount *
            </Label>
            <Input
              type="number"
              min={0}
              value={form.amount || ""}
              onChange={(e) => set("amount", Number(e.target.value))}
              placeholder="0.00"
              className="bg-secondary border-border/40"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Supplier *
          </Label>
          <SearchableSelect
            options={supplierOptions}
            value={form.supplierId}
            onChange={(v) => set("supplierId", v)}
            placeholder="Select supplier..."
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Payment Method
          </Label>
          <PaymentMethodToggle
            value={form.paymentMethod}
            onChange={(v) => set("paymentMethod", v)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Remarks
          </Label>
          <Textarea
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Optional note..."
            className="bg-secondary border-border/40 resize-none"
            rows={2}
          />
        </div>
        {form.amount > 0 && (
          <AccountingPreview
            lines={[
              `${supplierName} A/c  Dr  ${fmt(form.amount)}`,
              `  ${method} A/c  Cr  ${fmt(form.amount)}`,
            ]}
          />
        )}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={handleSave}
            disabled={isPending}
            data-ocid="pv-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Payment Voucher"
                : "Post Payment Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Journal Voucher form modal ───────────────────────────────────────────────

interface JVLine {
  id: string;
  accountName: string;
  debit: number;
  credit: number;
}

function JournalVoucherModal({
  onClose,
  editData,
}: { onClose: () => void; editData?: Voucher }) {
  const addJV = useAddJournalVoucher();
  const updateJV = useUpdateJournalVoucher();
  const isEdit = !!editData;

  const [date, setDate] = useState(
    editData ? tsToInputDate(editData.date) : TODAY,
  );
  const [remarks, setRemarks] = useState(editData ? getRemarks(editData) : "");
  const existingEntries = editData?.entries as unknown as JVLine[] | undefined;
  const [lines, setLines] = useState<JVLine[]>(
    existingEntries?.length
      ? existingEntries.map((e, i) => ({
          id: String(i),
          accountName: e.accountName ?? "",
          debit: Number(e.debit ?? 0),
          credit: Number(e.credit ?? 0),
        }))
      : [
          { id: "1", accountName: "", debit: 0, credit: 0 },
          { id: "2", accountName: "", debit: 0, credit: 0 },
        ],
  );

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced =
    totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  function updateLine(id: string, key: keyof JVLine, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
    );
  }

  async function handleSave() {
    if (!isBalanced) {
      toast.error("Debit and Credit totals must be equal");
      return;
    }
    const filled = lines.filter((l) => l.accountName.trim());
    if (filled.length < 2) {
      toast.error("At least 2 account entries required");
      return;
    }
    const data: JournalVoucherFormData = {
      date,
      entries: filled.map((l) => ({
        accountId: l.accountName.toLowerCase().replace(/\s+/g, "_"),
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
      })),
      remarks,
    };
    try {
      if (isEdit && editData) {
        await updateJV.mutateAsync({ ...data, id: editData.id });
        toast.success("Journal voucher updated.");
      } else {
        await addJV.mutateAsync(data);
        toast.success("Journal voucher posted.");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const isPending = addJV.isPending || updateJV.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Journal Voucher (JV)" : "New Journal Voucher (JV)"}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary border-border/40 w-48"
          />
        </div>
        <div>
          <div className="grid grid-cols-[1fr_110px_110px_28px] gap-2 mb-2">
            <span className="text-xs text-muted-foreground px-1">Account</span>
            <span className="text-xs text-muted-foreground text-right">
              Debit
            </span>
            <span className="text-xs text-muted-foreground text-right">
              Credit
            </span>
            <span />
          </div>
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_110px_110px_28px] gap-2 items-center"
              >
                <Input
                  value={line.accountName}
                  onChange={(e) =>
                    updateLine(line.id, "accountName", e.target.value)
                  }
                  placeholder="Account name"
                  className="h-8 text-xs bg-secondary border-border/40"
                />
                <Input
                  type="number"
                  min={0}
                  value={line.debit || ""}
                  onChange={(e) =>
                    updateLine(line.id, "debit", Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="h-8 text-xs text-right bg-secondary border-border/40"
                />
                <Input
                  type="number"
                  min={0}
                  value={line.credit || ""}
                  onChange={(e) =>
                    updateLine(line.id, "credit", Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="h-8 text-xs text-right bg-secondary border-border/40"
                />
                <button
                  type="button"
                  onClick={() =>
                    lines.length > 2 &&
                    setLines((p) => p.filter((l) => l.id !== line.id))
                  }
                  disabled={lines.length <= 2}
                  aria-label="Remove row"
                  className="flex items-center justify-center text-muted-foreground hover:text-destructive transition-smooth disabled:opacity-30"
                >
                  <MinusCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setLines((p) => [
                ...p,
                {
                  id: String(Date.now()),
                  accountName: "",
                  debit: 0,
                  credit: 0,
                },
              ])
            }
            className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-smooth"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>
        <div
          className="rounded-lg p-3 grid grid-cols-3 gap-3 text-xs"
          style={{
            background: "oklch(0.14 0 0)",
            border: "1px solid oklch(0.2 0 0)",
          }}
        >
          <div>
            <div className="text-muted-foreground mb-0.5">Total Debit</div>
            <div
              className="font-mono font-semibold"
              style={{ color: "oklch(0.65 0.22 22)" }}
            >
              {fmt(totalDebit)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5">Total Credit</div>
            <div
              className="font-mono font-semibold"
              style={{ color: "oklch(0.72 0.18 150)" }}
            >
              {fmt(totalCredit)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5">Status</div>
            <div
              className="font-mono font-semibold flex items-center gap-1"
              style={{
                color: isBalanced
                  ? "oklch(0.72 0.18 150)"
                  : "oklch(0.65 0.22 22)",
              }}
            >
              {isBalanced ? <CheckCircle className="w-3 h-3" /> : null}
              {isBalanced
                ? "Balanced"
                : fmt(Math.abs(totalDebit - totalCredit))}
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Narration / Remarks
          </Label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Journal narration..."
            className="bg-secondary border-border/40 resize-none"
            rows={2}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{
              background: isBalanced
                ? "oklch(0.75 0.15 82)"
                : "oklch(0.25 0 0)",
            }}
            onClick={handleSave}
            disabled={!isBalanced || isPending}
            data-ocid="jv-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Journal Voucher"
                : "Post Journal Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Contra Voucher form modal ────────────────────────────────────────────────

const ACCOUNT_OPTIONS: SelectOption[] = [
  { id: "cash", name: "Cash Account" },
  { id: "bank", name: "Bank Account" },
];

function ContraVoucherModal({
  onClose,
  editData,
}: { onClose: () => void; editData?: Voucher }) {
  const addCV = useAddContraVoucher();
  const updateCV = useUpdateContraVoucher();
  const isEdit = !!editData;

  const editEntries = editData?.entries as unknown as
    | { accountId: string; debit: number }[]
    | undefined;
  const editFromAcc =
    editEntries?.find((e) => e.debit === 0)?.accountId ?? "cash";
  const editToAcc = editEntries?.find((e) => e.debit > 0)?.accountId ?? "bank";

  const [form, setForm] = useState<ContraVoucherFormData>({
    date: editData ? tsToInputDate(editData.date) : TODAY,
    fromAccount: editFromAcc,
    toAccount: editToAcc,
    amount: editData ? Number(editData.amount) : 0,
    remarks: editData ? getRemarks(editData) : "",
  });

  const set = (k: keyof ContraVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));
  const fromLabel =
    ACCOUNT_OPTIONS.find((o) => o.id === form.fromAccount)?.name ?? "From";
  const toLabel =
    ACCOUNT_OPTIONS.find((o) => o.id === form.toAccount)?.name ?? "To";

  async function handleSave() {
    if (!form.fromAccount || !form.toAccount || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    if (form.fromAccount === form.toAccount) {
      toast.error("From and To accounts must be different");
      return;
    }
    try {
      if (isEdit && editData) {
        await updateCV.mutateAsync({ ...form, id: editData.id });
        toast.success("Contra voucher updated.");
      } else {
        await addCV.mutateAsync(form);
        toast.success("Contra voucher posted. Ledger updated.");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const isPending = addCV.isPending || updateCV.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Contra Voucher (CV)" : "New Contra Voucher (CV)"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Date
          </Label>
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="bg-secondary border-border/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              From Account
            </Label>
            <SearchableSelect
              options={ACCOUNT_OPTIONS}
              value={form.fromAccount}
              onChange={(v) => set("fromAccount", v)}
              placeholder="From..."
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              To Account
            </Label>
            <SearchableSelect
              options={ACCOUNT_OPTIONS}
              value={form.toAccount}
              onChange={(v) => set("toAccount", v)}
              placeholder="To..."
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Amount *
          </Label>
          <Input
            type="number"
            min={0}
            value={form.amount || ""}
            onChange={(e) => set("amount", Number(e.target.value))}
            placeholder="0.00"
            className="bg-secondary border-border/40"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Remarks
          </Label>
          <Textarea
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Optional note..."
            className="bg-secondary border-border/40 resize-none"
            rows={2}
          />
        </div>
        {form.amount > 0 && (
          <AccountingPreview
            lines={[
              `${toLabel}  Dr  ${fmt(form.amount)}`,
              `  ${fromLabel}  Cr  ${fmt(form.amount)}`,
            ]}
          />
        )}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={handleSave}
            disabled={isPending}
            data-ocid="cv-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Contra Voucher"
                : "Post Contra Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Advance Voucher form modal ───────────────────────────────────────────────

function AdvanceVoucherModal({
  onClose,
  editData,
}: { onClose: () => void; editData?: AdvanceVoucher }) {
  const { data: clients = [] } = useClients();
  const { data: suppliers = [] } = useSuppliers();
  const addAV = useAddAdvanceVoucher();
  const updateAV = useUpdateAdvanceVoucher();
  const isEdit = !!editData;

  const [form, setForm] = useState<AdvanceVoucherFormData>({
    date: editData ? tsToInputDate(editData.date) : TODAY,
    clientId: editData ? (getAVField<string>(editData, "clientId") ?? "") : "",
    supplierId: editData
      ? (getAVField<string>(editData, "supplierId") ?? "")
      : "",
    linkedClientId: editData
      ? (getAVField<string>(editData, "linkedClientId") ?? "")
      : "",
    linkedSupplierId: editData
      ? (getAVField<string>(editData, "linkedSupplierId") ?? "")
      : "",
    advanceType: editData ? getAdvanceTypeKey(editData) : "received",
    amount: editData ? Number(editData.amount) : 0,
    paymentMethod: editData ? getAVPaymentMethod(editData) || "cash" : "cash",
    remarks: editData ? (getAVField<string>(editData, "remarks") ?? "") : "",
    entries: editData
      ? (editData.entries as unknown as {
          accountId: string;
          accountName: string;
          debit: number;
          credit: number;
        }[])
      : [],
  });

  const set = <K extends keyof AdvanceVoucherFormData>(
    k: K,
    v: AdvanceVoucherFormData[K],
  ) => setForm((p) => ({ ...p, [k]: v }));

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const method = form.paymentMethod === "bank" ? "Bank" : "Cash";
  const partyName =
    clients.find((c) => c.id === form.clientId)?.name ||
    suppliers.find((s) => s.id === form.supplierId)?.name ||
    "Party";

  const entryLines: string[] =
    form.amount > 0
      ? form.advanceType === "received"
        ? [
            `${method} A/c  Dr  ${fmt(form.amount)}`,
            `  Advance from ${partyName}  Cr  ${fmt(form.amount)}`,
          ]
        : [
            `Advance to ${partyName}  Dr  ${fmt(form.amount)}`,
            `  ${method} A/c  Cr  ${fmt(form.amount)}`,
          ]
      : [];

  async function handleSave() {
    if (form.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!form.clientId && !form.supplierId) {
      toast.error("Select a client or supplier");
      return;
    }
    try {
      if (isEdit && editData) {
        await updateAV.mutateAsync({ ...form, id: editData.id });
        toast.success("Advance voucher updated.");
      } else {
        await addAV.mutateAsync(form);
        toast.success("Advance voucher posted. Ledger updated.");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const isPending = addAV.isPending || updateAV.isPending;

  return (
    <Modal
      title={
        isEdit ? "Edit Advance / Deposit (AV)" : "New Advance / Deposit (AV)"
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Date + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Date
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="bg-secondary border-border/40"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Amount *
            </Label>
            <Input
              type="number"
              min={0}
              value={form.amount || ""}
              onChange={(e) => set("amount", Number(e.target.value))}
              placeholder="0.00"
              className="bg-secondary border-border/40"
            />
          </div>
        </div>

        {/* Advance Type toggle */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Advance Type *
          </Label>
          <div className="flex gap-2">
            {(["received", "paid"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("advanceType", type)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-smooth capitalize"
                style={
                  form.advanceType === type
                    ? type === "received"
                      ? {
                          background: "oklch(0.72 0.18 150)",
                          color: "oklch(0.08 0 0)",
                        }
                      : {
                          background: "oklch(0.65 0.22 22)",
                          color: "oklch(0.95 0 0)",
                        }
                    : {
                        background: "oklch(0.16 0 0)",
                        color: "oklch(0.52 0 0)",
                        border: "1px solid oklch(0.22 0 0)",
                      }
                }
                data-ocid={`av-type-${type}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Client */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Client (optional)
          </Label>
          <SearchableSelect
            options={clientOptions}
            value={form.clientId}
            onChange={(v) => set("clientId", v)}
            placeholder="Select client..."
          />
        </div>

        {/* Supplier */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Supplier (optional)
          </Label>
          <SearchableSelect
            options={supplierOptions}
            value={form.supplierId}
            onChange={(v) => set("supplierId", v)}
            placeholder="Select supplier..."
          />
        </div>

        {/* Payment Method */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Payment Method
          </Label>
          <PaymentMethodToggle
            value={form.paymentMethod}
            onChange={(v) => set("paymentMethod", v)}
          />
        </div>

        {/* Remarks */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Remarks
          </Label>
          <Textarea
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Optional note..."
            className="bg-secondary border-border/40 resize-none"
            rows={2}
          />
        </div>

        {/* Accounting preview */}
        {entryLines.length > 0 && <AccountingPreview lines={entryLines} />}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={handleSave}
            disabled={isPending}
            data-ocid="av-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Advance Voucher"
                : "Post Advance Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── View Voucher modal (existing 4 types) ───────────────────────────────────

function ViewVoucherModal({
  voucher,
  onClose,
  entityMap,
  currency,
}: {
  voucher: Voucher;
  onClose: () => void;
  entityMap: Map<string, string>;
  currency: string;
}) {
  const typeKey = getVoucherTypeKey(voucher);
  const c = TYPE_COLORS[typeKey] ?? TYPE_COLORS.receipt;
  const clientId = getClientId(voucher);
  const supplierId = getSupplierId(voucher);
  const partyId = clientId || supplierId;
  const partyName = entityMap.get(partyId) ?? partyId ?? "—";
  const payMethod = getPaymentMethodKey(voucher);
  const remarks = getRemarks(voucher);
  const entries = voucher.entries as unknown as
    | {
        accountName: string;
        accountId: string;
        debit: number;
        credit: number;
      }[]
    | undefined;
  const contraToId = entries?.find((e) => Number(e.debit) > 0)?.accountId;
  const contraFromId = entries?.find((e) => Number(e.credit) > 0)?.accountId;

  const debitTotal =
    entries?.reduce((s, e) => s + Number(e.debit ?? 0), 0) ??
    Number(voucher.amount);
  const creditTotal =
    entries?.reduce((s, e) => s + Number(e.credit ?? 0), 0) ??
    Number(voucher.amount);

  const builtEntries = entries?.length
    ? entries
    : typeKey === "receipt"
      ? [
          {
            accountName: `${payMethod === "bank" ? "Bank" : "Cash"} A/c`,
            debit: Number(voucher.amount),
            credit: 0,
          },
          {
            accountName: `${partyName} A/c`,
            debit: 0,
            credit: Number(voucher.amount),
          },
        ]
      : typeKey === "payment"
        ? [
            {
              accountName: `${partyName} A/c`,
              debit: Number(voucher.amount),
              credit: 0,
            },
            {
              accountName: `${payMethod === "bank" ? "Bank" : "Cash"} A/c`,
              debit: 0,
              credit: Number(voucher.amount),
            },
          ]
        : typeKey === "contra"
          ? [
              {
                accountName: `${ACCOUNT_OPTIONS.find((o) => o.id === contraToId)?.name ?? "To A/c"}`,
                debit: Number(voucher.amount),
                credit: 0,
              },
              {
                accountName: `${ACCOUNT_OPTIONS.find((o) => o.id === contraFromId)?.name ?? "From A/c"}`,
                debit: 0,
                credit: Number(voucher.amount),
              },
            ]
          : [];

  return (
    <Modal title="Voucher Detail" onClose={onClose} wide>
      <div className="space-y-5">
        <div
          className="rounded-xl p-4 flex items-start justify-between gap-4"
          style={{
            background: `${c.color.replace(")", " / 0.08)")?.replace("oklch(", "oklch(")}`,
            border: `1px solid ${c.color.replace(")", " / 0.2)")}`,
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <VoucherBadge type={typeKey} />
              <span className="font-mono text-sm font-bold text-accent">
                {voucher.voucherNo}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dated: {tsToDate(voucher.date)}
            </p>
            {partyName !== "—" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Party: <span className="text-foreground">{partyName}</span>
              </p>
            )}
            {payMethod && (
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                Method: <span className="text-foreground">{payMethod}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
            <p
              className="font-mono text-xl font-bold"
              style={{ color: "oklch(0.75 0.15 82)" }}
            >
              {currency} {fmt(Number(voucher.amount))}
            </p>
          </div>
        </div>

        {builtEntries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Accounting Entries
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid oklch(0.2 0 0)" }}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr
                    style={{
                      background: "oklch(0.14 0 0)",
                      borderBottom: "1px solid oklch(0.2 0 0)",
                    }}
                  >
                    <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                      Account
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      Debit
                    </th>
                    <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {builtEntries.map((e, i) => (
                    <tr key={`${e.accountName}-${i}`} className="data-row">
                      <td className="px-4 py-2.5 text-foreground font-mono">
                        {e.accountName}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right font-mono"
                        style={{
                          color:
                            e.debit > 0
                              ? "oklch(0.65 0.22 22)"
                              : "oklch(0.35 0 0)",
                        }}
                      >
                        {e.debit > 0 ? fmt(Number(e.debit)) : "—"}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right font-mono"
                        style={{
                          color:
                            e.credit > 0
                              ? "oklch(0.72 0.18 150)"
                              : "oklch(0.35 0 0)",
                        }}
                      >
                        {e.credit > 0 ? fmt(Number(e.credit)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      background: "oklch(0.14 0 0)",
                      borderTop: "1px solid oklch(0.22 0 0)",
                    }}
                  >
                    <td className="px-4 py-2.5 font-semibold text-muted-foreground">
                      Total
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono font-bold"
                      style={{ color: "oklch(0.65 0.22 22)" }}
                    >
                      {fmt(debitTotal)}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono font-bold"
                      style={{ color: "oklch(0.72 0.18 150)" }}
                    >
                      {fmt(creditTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {remarks && (
          <div
            className="rounded-lg p-3"
            style={{
              background: "oklch(0.14 0 0)",
              border: "1px solid oklch(0.2 0 0)",
            }}
          >
            <p className="text-xs text-muted-foreground mb-1">
              Remarks / Narration
            </p>
            <p className="text-sm text-foreground">{remarks}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-border/40 gap-2"
            onClick={() => window.print()}
            data-ocid="voucher-print-btn"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── View Advance Voucher modal ───────────────────────────────────────────────

function ViewAdvanceVoucherModal({
  voucher,
  onClose,
  entityMap,
  currency,
}: {
  voucher: AdvanceVoucher;
  onClose: () => void;
  entityMap: Map<string, string>;
  currency: string;
}) {
  const advanceType = getAdvanceTypeKey(voucher);
  const clientId = getAVField<string>(voucher, "clientId") ?? "";
  const supplierId = getAVField<string>(voucher, "supplierId") ?? "";
  const partyId = clientId || supplierId;
  const partyName = entityMap.get(partyId) ?? "—";
  const payMethod = getAVPaymentMethod(voucher);
  const remarks = getAVField<string>(voucher, "remarks") ?? "";
  const entries = voucher.entries as {
    accountName: string;
    debit: number;
    credit: number;
  }[];

  const methodLabel = payMethod === "bank" ? "Bank" : "Cash";
  const builtEntries =
    entries?.length > 0
      ? entries
      : advanceType === "received"
        ? [
            {
              accountName: `${methodLabel} A/c`,
              debit: Number(voucher.amount),
              credit: 0,
            },
            {
              accountName: `Advance from ${partyName}`,
              debit: 0,
              credit: Number(voucher.amount),
            },
          ]
        : [
            {
              accountName: `Advance to ${partyName}`,
              debit: Number(voucher.amount),
              credit: 0,
            },
            {
              accountName: `${methodLabel} A/c`,
              debit: 0,
              credit: Number(voucher.amount),
            },
          ];

  const debitTotal = builtEntries.reduce((s, e) => s + Number(e.debit), 0);
  const creditTotal = builtEntries.reduce((s, e) => s + Number(e.credit), 0);

  return (
    <Modal title="Advance Voucher Detail" onClose={onClose} wide>
      <div className="space-y-5">
        {/* Header strip */}
        <div
          className="rounded-xl p-4 flex items-start justify-between gap-4"
          style={{
            background: "oklch(0.75 0.15 82 / 0.08)",
            border: "1px solid oklch(0.75 0.15 82 / 0.2)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <VoucherBadge type="advance" />
              <span className="font-mono text-sm font-bold text-accent">
                {voucher.voucherNo}
              </span>
              <AdvanceTypeBadge type={advanceType} />
            </div>
            <p className="text-xs text-muted-foreground">
              Dated: {tsToDate(voucher.date)}
            </p>
            {partyName !== "—" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Party: <span className="text-foreground">{partyName}</span>
              </p>
            )}
            {payMethod && (
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                Method: <span className="text-foreground">{payMethod}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
            <p
              className="font-mono text-xl font-bold"
              style={{ color: "oklch(0.75 0.15 82)" }}
            >
              {currency} {fmt(Number(voucher.amount))}
            </p>
          </div>
        </div>

        {/* Accounting entries */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Accounting Entries
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid oklch(0.2 0 0)" }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr
                  style={{
                    background: "oklch(0.14 0 0)",
                    borderBottom: "1px solid oklch(0.2 0 0)",
                  }}
                >
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">
                    Account
                  </th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                    Debit
                  </th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {builtEntries.map((e) => (
                  <tr key={`ae-${e.accountName}`} className="data-row">
                    <td className="px-4 py-2.5 text-foreground font-mono">
                      {e.accountName}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono"
                      style={{
                        color:
                          e.debit > 0
                            ? "oklch(0.65 0.22 22)"
                            : "oklch(0.35 0 0)",
                      }}
                    >
                      {e.debit > 0 ? fmt(Number(e.debit)) : "—"}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right font-mono"
                      style={{
                        color:
                          e.credit > 0
                            ? "oklch(0.72 0.18 150)"
                            : "oklch(0.35 0 0)",
                      }}
                    >
                      {e.credit > 0 ? fmt(Number(e.credit)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    background: "oklch(0.14 0 0)",
                    borderTop: "1px solid oklch(0.22 0 0)",
                  }}
                >
                  <td className="px-4 py-2.5 font-semibold text-muted-foreground">
                    Total
                  </td>
                  <td
                    className="px-4 py-2.5 text-right font-mono font-bold"
                    style={{ color: "oklch(0.65 0.22 22)" }}
                  >
                    {fmt(debitTotal)}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right font-mono font-bold"
                    style={{ color: "oklch(0.72 0.18 150)" }}
                  >
                    {fmt(creditTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {remarks && (
          <div
            className="rounded-lg p-3"
            style={{
              background: "oklch(0.14 0 0)",
              border: "1px solid oklch(0.2 0 0)",
            }}
          >
            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
            <p className="text-sm text-foreground">{remarks}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-border/40 gap-2"
            onClick={() => window.print()}
            data-ocid="av-print-btn"
          >
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button
            className="flex-1 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  label,
  icon,
  onClick,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-smooth"
      style={{
        color: color ?? "oklch(0.75 0.15 82)",
        background: "oklch(0.75 0.15 82 / 0.06)",
      }}
    >
      {icon}
    </button>
  );
}

// ─── Main voucher table (existing types) ──────────────────────────────────────

type ActiveModal =
  | { type: "view"; voucher: Voucher }
  | { type: "edit"; voucher: Voucher }
  | null;

function VoucherTable({
  vouchers,
  isLoading,
  clients,
  suppliers,
  currency,
}: {
  vouchers: Voucher[];
  isLoading: boolean;
  clients: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  currency: string;
}) {
  const entityMap = new Map(
    [...clients, ...suppliers].map((e) => [e.id, e.name]),
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  if (isLoading) {
    return (
      <div className="space-y-2" data-ocid="voucher-table-loading">
        {["sk1", "sk2", "sk3", "sk4", "sk5"].map((k) => (
          <Skeleton
            key={k}
            className="h-12 rounded-lg"
            style={{ background: "oklch(0.15 0 0)" }}
          />
        ))}
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="voucher-empty-state"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "oklch(0.75 0.15 82 / 0.08)" }}
        >
          <Receipt className="w-7 h-7 text-accent opacity-60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No vouchers found
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Post your first voucher using the button above
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: "1px solid oklch(0.2 0 0)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: "oklch(0.12 0 0)",
                borderBottom: "1px solid oklch(0.2 0 0)",
              }}
            >
              {[
                "Voucher No",
                "Type",
                "Date",
                "Party",
                "Amount",
                "Method",
                "Remarks",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => {
              const typeKey = getVoucherTypeKey(v);
              const clientId = getClientId(v);
              const supplierId = getSupplierId(v);
              const partyId = clientId || supplierId;
              const partyName = entityMap.get(partyId) ?? "—";
              const method = getPaymentMethodKey(v);
              const remarks = getRemarks(v);
              return (
                <tr
                  key={v.id}
                  className="data-row"
                  data-ocid={`voucher-row-${v.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-accent font-bold whitespace-nowrap">
                    {v.voucherNo}
                  </td>
                  <td className="px-4 py-3">
                    <VoucherBadge type={typeKey} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {tsToDate(v.date)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-foreground max-w-[140px] truncate"
                    title={partyName}
                  >
                    {partyName}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-accent whitespace-nowrap">
                    {currency} {fmt(Number(v.amount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                    {method || "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate"
                    title={remarks}
                  >
                    {remarks || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ActionBtn
                        label="View"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() =>
                          setActiveModal({ type: "view", voucher: v })
                        }
                      />
                      <ActionBtn
                        label="Edit"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() =>
                          setActiveModal({ type: "edit", voucher: v })
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeModal?.type === "view" && (
        <ViewVoucherModal
          voucher={activeModal.voucher}
          onClose={() => setActiveModal(null)}
          entityMap={entityMap}
          currency={currency}
        />
      )}
      {activeModal?.type === "edit" &&
        (() => {
          const typeKey = getVoucherTypeKey(activeModal.voucher);
          const ModalComp =
            typeKey === "receipt"
              ? ReceiptVoucherModal
              : typeKey === "payment"
                ? PaymentVoucherModal
                : typeKey === "journal"
                  ? JournalVoucherModal
                  : ContraVoucherModal;
          return (
            <ModalComp
              onClose={() => setActiveModal(null)}
              editData={activeModal.voucher}
            />
          );
        })()}
    </>
  );
}

// ─── Advance Voucher table ────────────────────────────────────────────────────

type AVModal =
  | { type: "view"; voucher: AdvanceVoucher }
  | { type: "edit"; voucher: AdvanceVoucher }
  | null;

function AdvanceVoucherTable({
  vouchers,
  isLoading,
  entityMap,
  currency,
}: {
  vouchers: AdvanceVoucher[];
  isLoading: boolean;
  entityMap: Map<string, string>;
  currency: string;
}) {
  const [activeModal, setActiveModal] = useState<AVModal>(null);
  const deleteAV = useDeleteAdvanceVoucher();

  async function handleDelete(id: string) {
    if (!confirm("Delete this advance voucher? This cannot be undone.")) return;
    try {
      await deleteAV.mutateAsync(id);
      toast.success("Advance voucher deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2" data-ocid="av-table-loading">
        {["s1", "s2", "s3"].map((k) => (
          <Skeleton
            key={k}
            className="h-12 rounded-lg"
            style={{ background: "oklch(0.15 0 0)" }}
          />
        ))}
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="av-empty-state"
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "oklch(0.75 0.15 82 / 0.08)" }}
        >
          <Wallet className="w-7 h-7 text-accent opacity-60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No advance vouchers yet
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Post your first advance or deposit using the button above
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: "1px solid oklch(0.2 0 0)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: "oklch(0.12 0 0)",
                borderBottom: "1px solid oklch(0.2 0 0)",
              }}
            >
              {[
                "Voucher No",
                "Date",
                "Client / Supplier",
                "Advance Type",
                "Amount",
                "Method",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => {
              const clientId = getAVField<string>(v, "clientId") ?? "";
              const supplierId = getAVField<string>(v, "supplierId") ?? "";
              const partyId = clientId || supplierId;
              const partyName = entityMap.get(partyId) ?? "—";
              const advanceType = getAdvanceTypeKey(v);
              const method = getAVPaymentMethod(v);
              return (
                <tr
                  key={v.id}
                  className="data-row"
                  data-ocid={`av-row-${v.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-accent font-bold whitespace-nowrap">
                    {v.voucherNo}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {tsToDate(v.date)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-foreground max-w-[140px] truncate"
                    title={partyName}
                  >
                    {partyName}
                  </td>
                  <td className="px-4 py-3">
                    <AdvanceTypeBadge type={advanceType} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-accent whitespace-nowrap">
                    {currency} {fmt(Number(v.amount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                    {method || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ActionBtn
                        label="View"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() =>
                          setActiveModal({ type: "view", voucher: v })
                        }
                      />
                      <ActionBtn
                        label="Edit"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() =>
                          setActiveModal({ type: "edit", voucher: v })
                        }
                      />
                      <ActionBtn
                        label="Delete"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => handleDelete(v.id)}
                        color="oklch(0.65 0.22 22)"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeModal?.type === "view" && (
        <ViewAdvanceVoucherModal
          voucher={activeModal.voucher}
          onClose={() => setActiveModal(null)}
          entityMap={entityMap}
          currency={currency}
        />
      )}
      {activeModal?.type === "edit" && (
        <AdvanceVoucherModal
          onClose={() => setActiveModal(null)}
          editData={activeModal.voucher}
        />
      )}
    </>
  );
}

// ─── Vouchers Summary Bar ─────────────────────────────────────────────────────

function VouchersSummaryBar({ currency }: { currency: string }) {
  const { data: summary } = useVouchersSummary();

  const items = [
    {
      label: "Total Vouchers",
      value: summary ? String(Number(summary.totalVouchers)) : "—",
      icon: <Wallet className="w-4 h-4" />,
      color: "oklch(0.75 0.15 82)",
    },
    {
      label: "Total Receipts",
      value: summary ? `${currency} ${fmt(summary.totalReceipts)}` : "—",
      icon: <TrendingUp className="w-4 h-4" />,
      color: "oklch(0.72 0.18 150)",
    },
    {
      label: "Total Payments",
      value: summary ? `${currency} ${fmt(summary.totalPayments)}` : "—",
      icon: <TrendingDown className="w-4 h-4" />,
      color: "oklch(0.65 0.22 22)",
    },
    {
      label: "Total Advances",
      value: summary ? `${currency} ${fmt(summary.totalAdvances)}` : "—",
      icon: <ArrowLeftRight className="w-4 h-4" />,
      color: "oklch(0.75 0.15 82)",
    },
  ];

  return (
    <div
      className="rounded-2xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-4"
      style={{
        background: "linear-gradient(135deg, oklch(0.13 0 0), oklch(0.10 0 0))",
        border: "1px solid oklch(0.75 0.15 82 / 0.15)",
        backdropFilter: "blur(12px)",
      }}
      data-ocid="vouchers-summary-bar"
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `${item.color.replace(")", " / 0.1)")}`,
              color: item.color,
            }}
          >
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {item.label}
            </p>
            <p
              className="font-mono text-sm font-bold truncate"
              style={{ color: item.color }}
            >
              {item.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabFilter =
  | "all"
  | "receipt"
  | "payment"
  | "journal"
  | "contra"
  | "advance";

const TABS: { key: TabFilter; label: string; short: string }[] = [
  { key: "all", label: "All Vouchers", short: "All" },
  { key: "receipt", label: "Receipt (RV)", short: "RV" },
  { key: "payment", label: "Payment (PV)", short: "PV" },
  { key: "journal", label: "Journal (JV)", short: "JV" },
  { key: "contra", label: "Contra (CV)", short: "CV" },
  { key: "advance", label: "Advance (AV)", short: "AV" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [addModalType, setAddModalType] = useState<VoucherTypeKey | null>(null);

  const { data: allVouchers = [], isLoading } = useVouchers();
  const { data: advanceVouchers = [], isLoading: isLoadingAV } =
    useAdvanceVouchers();
  const { data: clients = [] } = useClients();
  const { data: suppliers = [] } = useSuppliers();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "PKR";

  const entityMap = new Map<string, string>(
    [...clients, ...suppliers].map((e) => [e.id, e.name]),
  );

  // Filter vouchers (non-advance tabs)
  const filtered = allVouchers.filter((v) => {
    const typeKey = getVoucherTypeKey(v);
    if (activeTab !== "all" && activeTab !== "advance" && typeKey !== activeTab)
      return false;
    if (activeTab === "advance") return false; // advance tab uses its own table
    if (search) {
      const q = search.toLowerCase();
      const clientId = getClientId(v);
      const supplierId = getSupplierId(v);
      const partyId = clientId || supplierId;
      const partyName =
        [...clients, ...suppliers].find((e) => e.id === partyId)?.name ?? "";
      if (
        !v.voucherNo.toLowerCase().includes(q) &&
        !partyName.toLowerCase().includes(q)
      )
        return false;
    }
    if (dateFrom) {
      const ms =
        typeof v.date === "bigint"
          ? Number(v.date) / 1_000_000
          : Number(v.date);
      if (ms < new Date(dateFrom).getTime()) return false;
    }
    if (dateTo) {
      const ms =
        typeof v.date === "bigint"
          ? Number(v.date) / 1_000_000
          : Number(v.date);
      if (ms > new Date(`${dateTo}T23:59:59`).getTime()) return false;
    }
    return true;
  });

  // Filter advance vouchers
  const filteredAV = advanceVouchers.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      const clientId = getAVField<string>(v, "clientId") ?? "";
      const supplierId = getAVField<string>(v, "supplierId") ?? "";
      const partyId = clientId || supplierId;
      const partyName = entityMap.get(partyId) ?? "";
      if (
        !v.voucherNo.toLowerCase().includes(q) &&
        !partyName.toLowerCase().includes(q)
      )
        return false;
    }
    if (dateFrom) {
      const ms =
        typeof v.date === "bigint"
          ? Number(v.date) / 1_000_000
          : Number(v.date);
      if (ms < new Date(dateFrom).getTime()) return false;
    }
    if (dateTo) {
      const ms =
        typeof v.date === "bigint"
          ? Number(v.date) / 1_000_000
          : Number(v.date);
      if (ms > new Date(`${dateTo}T23:59:59`).getTime()) return false;
    }
    return true;
  });

  function handleTypeSelected(t: VoucherTypeKey) {
    setShowTypeSelector(false);
    setAddModalType(t);
  }

  // Tab counts
  function getTabCount(key: TabFilter): number {
    if (key === "all") return allVouchers.length + advanceVouchers.length;
    if (key === "advance") return advanceVouchers.length;
    return allVouchers.filter((v) => getVoucherTypeKey(v) === key).length;
  }

  const AddModal =
    addModalType && addModalType !== "advance"
      ? addModalType === "receipt"
        ? ReceiptVoucherModal
        : addModalType === "payment"
          ? PaymentVoucherModal
          : addModalType === "journal"
            ? JournalVoucherModal
            : ContraVoucherModal
      : null;

  return (
    <Layout title="Vouchers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-accent">
              Vouchers
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Double-entry accounting — Receipt, Payment, Journal, Contra &
              Advance
            </p>
          </div>
          <Button
            className="font-semibold text-black gap-2 shrink-0"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={() => setShowTypeSelector(true)}
            data-ocid="new-voucher-btn"
          >
            <Plus className="w-4 h-4" />
            New Voucher
          </Button>
        </div>

        {/* Summary bar */}
        <VouchersSummaryBar currency={currency} />

        {/* Tab bar */}
        <div
          className="glass-card p-1 flex gap-1 overflow-x-auto"
          style={{ borderRadius: "0.875rem" }}
          data-ocid="voucher-tab-bar"
        >
          {TABS.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-smooth whitespace-nowrap"
                style={
                  isActive
                    ? {
                        background: "oklch(0.75 0.15 82)",
                        color: "oklch(0.085 0 0)",
                      }
                    : { color: "oklch(0.52 0 0)" }
                }
                data-ocid={`tab-${tab.key}`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden font-mono font-bold">
                  {tab.short}
                </span>
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded-full"
                  style={
                    isActive
                      ? { background: "oklch(0.085 0 0 / 0.2)" }
                      : {
                          background: "oklch(0.75 0.15 82 / 0.1)",
                          color: "oklch(0.75 0.15 82)",
                        }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div
          className="glass-card p-4 flex flex-wrap gap-3 items-center"
          data-ocid="voucher-filters"
        >
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by voucher no or party name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary border-border/40 h-9 text-sm"
              data-ocid="voucher-search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              From
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-secondary border-border/40 h-9 text-sm w-36"
              data-ocid="voucher-date-from"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              To
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-secondary border-border/40 h-9 text-sm w-36"
              data-ocid="voucher-date-to"
            />
          </div>
          {(search || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-muted-foreground hover:text-accent transition-smooth"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {activeTab === "advance" ? filteredAV.length : filtered.length}{" "}
            result
            {(activeTab === "advance" ? filteredAV : filtered).length !== 1
              ? "s"
              : ""}
          </span>
        </div>

        {/* Table */}
        <div className="glass-card p-5">
          {activeTab === "advance" ? (
            <AdvanceVoucherTable
              vouchers={filteredAV}
              isLoading={isLoadingAV}
              entityMap={entityMap}
              currency={currency}
            />
          ) : (
            <VoucherTable
              vouchers={filtered}
              isLoading={isLoading}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              currency={currency}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showTypeSelector && (
        <TypeSelectorModal
          onSelect={handleTypeSelected}
          onClose={() => setShowTypeSelector(false)}
        />
      )}
      {AddModal && <AddModal onClose={() => setAddModalType(null)} />}
      {addModalType === "advance" && (
        <AdvanceVoucherModal onClose={() => setAddModalType(null)} />
      )}
    </Layout>
  );
}
