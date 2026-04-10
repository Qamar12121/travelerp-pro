import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle,
  MinusCircle,
  Plus,
  PlusCircle,
  Receipt,
  SendHorizonal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import {
  useAddContraVoucher,
  useAddJournalVoucher,
  useAddPaymentVoucher,
  useAddReceiptVoucher,
  useClients,
  useSuppliers,
  useVouchers,
} from "../hooks/useBackend";
import type {
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

// ─── Voucher type badge ───────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  receipt: {
    color: "oklch(0.65 0.18 230)",
    background: "oklch(0.65 0.18 230 / 0.15)",
  },
  payment: {
    color: "oklch(0.72 0.18 55)",
    background: "oklch(0.72 0.18 55 / 0.15)",
  },
  journal: {
    color: "oklch(0.65 0.2 295)",
    background: "oklch(0.65 0.2 295 / 0.15)",
  },
  contra: {
    color: "oklch(0.68 0.16 185)",
    background: "oklch(0.68 0.16 185 / 0.15)",
  },
};

function VoucherBadge({ type }: { type: string }) {
  const label =
    { receipt: "RV", payment: "PV", journal: "JV", contra: "CV" }[type] ??
    type.toUpperCase();
  return (
    <span
      className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
      style={BADGE_STYLES[type]}
    >
      {label}
    </span>
  );
}

// ─── Accounting preview banner ─────────────────────────────────────────────

function AccountingPreview({ lines }: { lines: string[] }) {
  return (
    <div
      className="rounded-lg p-3 text-xs font-mono space-y-1"
      style={{
        background: "oklch(0.75 0.15 82 / 0.06)",
        border: "1px solid oklch(0.75 0.15 82 / 0.2)",
      }}
    >
      {lines.map((line) => (
        <div key={line} className="text-accent/80">
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
}: {
  value: string;
  onChange: (v: string) => void;
}) {
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
                  border: "1px solid oklch(0.2 0 0)",
                }
          }
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Searchable Select ─────────────────────────────────────────────────────

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
          border: "1px solid oklch(0.2 0 0)",
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
                  className="w-full px-3 py-2 text-sm text-left cursor-pointer transition-smooth"
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "oklch(0.12 0 0)",
          border: "1px solid oklch(0.22 0 0)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid oklch(0.2 0 0)" }}
        >
          <h3 className="font-display text-lg font-semibold text-accent">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-smooth"
            style={{ background: "oklch(0.17 0 0)" }}
          >
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Receipt Voucher modal ────────────────────────────────────────────────────

function ReceiptVoucherModal({ onClose }: { onClose: () => void }) {
  const { data: clients = [] } = useClients();
  const addRV = useAddReceiptVoucher();
  const [form, setForm] = useState<ReceiptVoucherFormData>({
    date: TODAY,
    clientId: "",
    amount: 0,
    paymentMethod: "cash",
    remarks: "",
  });

  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const set = (k: keyof ReceiptVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.clientId || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await addRV.mutateAsync(form);
      toast.success("Receipt voucher posted. Ledger updated.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const method = form.paymentMethod === "bank" ? "Bank" : "Cash";
  const clientName =
    clients.find((c) => c.id === form.clientId)?.name ?? "Client";

  return (
    <Modal title="New Receipt Voucher (RV)" onClose={onClose}>
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
              `${method} Dr  ${fmt(form.amount)}`,
              `${clientName} Cr  ${fmt(form.amount)}`,
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
            disabled={addRV.isPending}
            data-ocid="rv-save-btn"
          >
            {addRV.isPending ? "Posting..." : "Post Receipt Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Payment Voucher modal ────────────────────────────────────────────────────

function PaymentVoucherModal({ onClose }: { onClose: () => void }) {
  const { data: suppliers = [] } = useSuppliers();
  const addPV = useAddPaymentVoucher();
  const [form, setForm] = useState<PaymentVoucherFormData>({
    date: TODAY,
    supplierId: "",
    amount: 0,
    paymentMethod: "cash",
    remarks: "",
  });

  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));
  const set = (k: keyof PaymentVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.supplierId || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await addPV.mutateAsync(form);
      toast.success("Payment voucher posted. Ledger updated.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const method = form.paymentMethod === "bank" ? "Bank" : "Cash";
  const supplierName =
    suppliers.find((s) => s.id === form.supplierId)?.name ?? "Supplier";

  return (
    <Modal title="New Payment Voucher (PV)" onClose={onClose}>
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
              `${supplierName} Dr  ${fmt(form.amount)}`,
              `${method} Cr  ${fmt(form.amount)}`,
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
            disabled={addPV.isPending}
            data-ocid="pv-save-btn"
          >
            {addPV.isPending ? "Posting..." : "Post Payment Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Journal Voucher modal ────────────────────────────────────────────────────

interface JVLine {
  id: string;
  accountName: string;
  debit: number;
  credit: number;
}

function JournalVoucherModal({ onClose }: { onClose: () => void }) {
  const addJV = useAddJournalVoucher();
  const [date, setDate] = useState(TODAY);
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<JVLine[]>([
    { id: "1", accountName: "", debit: 0, credit: 0 },
    { id: "2", accountName: "", debit: 0, credit: 0 },
  ]);

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced =
    totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;

  function updateLine(id: string, key: keyof JVLine, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [key]: value } : l)),
    );
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), accountName: "", debit: 0, credit: 0 },
    ]);
  }

  function removeLine(id: string) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
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
      await addJV.mutateAsync(data);
      toast.success("Journal voucher posted.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  return (
    <Modal title="New Journal Voucher (JV)" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary border-border/40"
          />
        </div>

        {/* Entry rows */}
        <div>
          <div className="grid grid-cols-[1fr_100px_100px_28px] gap-2 mb-2">
            <span className="text-xs text-muted-foreground px-1">Account</span>
            <span className="text-xs text-muted-foreground text-right pr-1">
              Debit
            </span>
            <span className="text-xs text-muted-foreground text-right pr-1">
              Credit
            </span>
            <span />
          </div>
          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[1fr_100px_100px_28px] gap-2 items-center"
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
                  onClick={() => removeLine(line.id)}
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
            onClick={addLine}
            className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-smooth"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        {/* Running totals */}
        <div
          className="rounded-lg p-3 grid grid-cols-3 gap-3 text-xs"
          style={{
            background: "oklch(0.15 0 0)",
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
              style={{ color: "oklch(0.7 0.18 150)" }}
            >
              {fmt(totalCredit)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-0.5">Balance</div>
            <div
              className="font-mono font-semibold flex items-center gap-1"
              style={{
                color: isBalanced
                  ? "oklch(0.7 0.18 150)"
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
            Remarks
          </Label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional note..."
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
              background: isBalanced ? "oklch(0.75 0.15 82)" : "oklch(0.3 0 0)",
            }}
            onClick={handleSave}
            disabled={!isBalanced || addJV.isPending}
            data-ocid="jv-save-btn"
          >
            {addJV.isPending ? "Posting..." : "Post Journal Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Contra Voucher modal ─────────────────────────────────────────────────────

const ACCOUNT_OPTIONS: SelectOption[] = [
  { id: "cash", name: "Cash Account" },
  { id: "bank", name: "Bank Account" },
];

function ContraVoucherModal({ onClose }: { onClose: () => void }) {
  const addCV = useAddContraVoucher();
  const [form, setForm] = useState<ContraVoucherFormData>({
    date: TODAY,
    fromAccount: "cash",
    toAccount: "bank",
    amount: 0,
    remarks: "",
  });

  const set = (k: keyof ContraVoucherFormData, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

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
      await addCV.mutateAsync(form);
      toast.success("Contra voucher posted. Ledger updated.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save voucher");
    }
  }

  const fromLabel =
    ACCOUNT_OPTIONS.find((o) => o.id === form.fromAccount)?.name ?? "From";
  const toLabel =
    ACCOUNT_OPTIONS.find((o) => o.id === form.toAccount)?.name ?? "To";

  return (
    <Modal title="New Contra Voucher (CV)" onClose={onClose}>
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
              `${toLabel} Dr  ${fmt(form.amount)}`,
              `${fromLabel} Cr  ${fmt(form.amount)}`,
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
            disabled={addCV.isPending}
            data-ocid="cv-save-btn"
          >
            {addCV.isPending ? "Posting..." : "Post Contra Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Voucher table columns ────────────────────────────────────────────────────

function buildColumns(
  clients: { id: string; name: string }[],
  suppliers: { id: string; name: string }[],
) {
  const entityMap = new Map(
    [...clients, ...suppliers].map((e) => [e.id, e.name]),
  );
  return [
    {
      key: "voucherNo",
      header: "Voucher No",
      sortable: true,
      render: (v: unknown, row: Voucher) => (
        <div className="flex items-center gap-2">
          <VoucherBadge type={row.voucherType as unknown as string} />
          <span className="font-mono text-xs text-accent">{String(v)}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (v: unknown) => tsToDate(v as bigint),
    },
    {
      key: "clientId",
      header: "Party",
      render: (_v: unknown, row: Voucher) => {
        const id = row.clientId?.[0] ?? row.supplierId?.[0];
        return <span>{id ? (entityMap.get(id) ?? id) : "—"}</span>;
      },
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (v: unknown) => (
        <span className="font-mono text-accent font-medium">
          ${fmt(Number(v))}
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (v: unknown) => {
        const arr = v as { __kind__: string }[] | undefined;
        const m = arr?.[0]?.__kind__;
        return (
          <span className="capitalize text-muted-foreground text-xs">
            {m ?? "—"}
          </span>
        );
      },
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (v: unknown) => {
        const arr = v as string[] | undefined;
        return (
          <span className="text-muted-foreground text-xs truncate max-w-32">
            {arr?.[0] ?? "—"}
          </span>
        );
      },
    },
  ];
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "receipt" | "payment" | "journal" | "contra";

const TABS: {
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  btnLabel: string;
}[] = [
  {
    key: "receipt",
    label: "Receipt Voucher",
    shortLabel: "RV",
    icon: <Receipt className="w-4 h-4" />,
    btnLabel: "Add Receipt",
  },
  {
    key: "payment",
    label: "Payment Voucher",
    shortLabel: "PV",
    icon: <SendHorizonal className="w-4 h-4" />,
    btnLabel: "Add Payment",
  },
  {
    key: "journal",
    label: "Journal Voucher",
    shortLabel: "JV",
    icon: <BookOpen className="w-4 h-4" />,
    btnLabel: "Add Journal",
  },
  {
    key: "contra",
    label: "Contra Voucher",
    shortLabel: "CV",
    icon: <ArrowLeftRight className="w-4 h-4" />,
    btnLabel: "Add Contra",
  },
];

const VOUCHER_TYPE_MAP: Record<TabKey, VoucherType> = {
  receipt: VoucherType.receipt,
  payment: VoucherType.payment,
  journal: VoucherType.journal,
  contra: VoucherType.contra,
};

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({
  tabKey,
  clients,
  suppliers,
}: {
  tabKey: TabKey;
  clients: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
}) {
  const [showModal, setShowModal] = useState(false);
  const { data: vouchers = [], isLoading } = useVouchers(
    VOUCHER_TYPE_MAP[tabKey],
  );
  const columns = buildColumns(clients, suppliers);
  const tab = TABS.find((t) => t.key === tabKey)!;

  const Modal = {
    receipt: ReceiptVoucherModal,
    payment: PaymentVoucherModal,
    journal: JournalVoucherModal,
    contra: ContraVoucherModal,
  }[tabKey];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {vouchers.length} voucher{vouchers.length !== 1 ? "s" : ""} posted
        </p>
        <Button
          size="sm"
          className="font-semibold text-black gap-1.5 transition-smooth"
          style={{ background: "oklch(0.75 0.15 82)" }}
          onClick={() => setShowModal(true)}
          data-ocid={`${tabKey}-add-btn`}
        >
          <Plus className="w-3.5 h-3.5" />
          {tab.btnLabel}
        </Button>
      </div>
      <DataTable
        columns={columns as Parameters<typeof DataTable>[0]["columns"]}
        data={vouchers as unknown as Record<string, unknown>[]}
        isLoading={isLoading}
        emptyMessage={`No ${tab.label}s yet`}
        keyField="id"
      />
      {showModal && <Modal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("receipt");
  const { data: clients = [] } = useClients();
  const { data: suppliers = [] } = useSuppliers();

  return (
    <Layout title="Vouchers">
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-display text-2xl font-semibold text-accent">
            Vouchers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Double-entry accounting vouchers — Receipt, Payment, Journal, Contra
          </p>
        </div>

        {/* Tab nav */}
        <div
          className="glass-card p-1 flex gap-1"
          style={{ borderRadius: "0.875rem" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-smooth"
              style={
                activeTab === tab.key
                  ? {
                      background: "oklch(0.75 0.15 82)",
                      color: "oklch(0.085 0 0)",
                    }
                  : { color: "oklch(0.52 0 0)" }
              }
              data-ocid={`tab-${tab.key}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden font-mono font-bold">
                {tab.shortLabel}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="glass-card p-5">
          <TabPanel
            key={activeTab}
            tabKey={activeTab}
            clients={clients.map((c) => ({ id: c.id, name: c.name }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      </div>
    </Layout>
  );
}
