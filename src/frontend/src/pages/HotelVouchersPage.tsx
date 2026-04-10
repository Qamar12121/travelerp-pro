import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  BedDouble,
  Building2,
  Calendar,
  Eye,
  MinusCircle,
  Pencil,
  Plus,
  PlusCircle,
  Printer,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import {
  useAddHotelVoucher,
  useClients,
  useDeleteHotelVoucher,
  useHotelVouchers,
  useSettings,
  useSuppliers,
  useUpdateHotelVoucher,
} from "../hooks/useBackend";
import type { HotelVoucherFormData, HotelVoucherLine } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

function fmt(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tsToDate(ts: bigint | number | string): string {
  let ms: number;
  if (typeof ts === "bigint") ms = Number(ts) / 1_000_000;
  else if (typeof ts === "string") ms = new Date(ts).getTime();
  else ms = ts;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tsToInputDate(ts: bigint | number | string): string {
  let ms: number;
  if (typeof ts === "bigint") ms = Number(ts) / 1_000_000;
  else if (typeof ts === "string") ms = new Date(ts).getTime();
  else ms = ts;
  return new Date(ms).toISOString().split("T")[0];
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

// ─── Backend shape (matches useBackend mapping) ───────────────────────────────

interface HotelLineBackend {
  hotelName: string;
  checkIn: bigint;
  checkOut: bigint;
  rooms: bigint;
  roomType: string;
  ratePerNight: number;
  totalAmount: number;
  remarks?: string;
}

interface HotelVoucherBackend {
  id: string;
  voucherNo: string;
  clientId: string;
  date: bigint;
  dueDate?: bigint;
  totalAmount: number;
  paid: number;
  due: number;
  status: string;
  hotels: HotelLineBackend[];
  remarks?: string;
  createdAt: bigint;
}

// ─── Shared select helpers ────────────────────────────────────────────────────

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
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors duration-200"
        style={{
          background: "oklch(0.16 0 0)",
          border: "1px solid oklch(0.22 0 0)",
          color: selected ? "oklch(0.93 0 0)" : "oklch(0.52 0 0)",
        }}
        data-ocid="hotel-select-trigger"
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
                  className="w-full px-3 py-2 text-sm text-left transition-colors duration-200"
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
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-2xl overflow-hidden`}
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
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors duration-200"
            style={{ background: "oklch(0.16 0 0)" }}
          >
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteModal({
  voucherNo,
  onConfirm,
  onClose,
  isPending,
}: {
  voucherNo: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Modal title="Delete Hotel Voucher" onClose={onClose}>
      <div className="space-y-5">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "oklch(0.65 0.22 22 / 0.08)",
            border: "1px solid oklch(0.65 0.22 22 / 0.25)",
          }}
        >
          <p className="text-sm text-foreground">
            Are you sure you want to delete
          </p>
          <p className="font-mono font-bold text-accent mt-1">{voucherNo}</p>
          <p className="text-xs text-muted-foreground mt-2">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            style={{
              background: "oklch(0.62 0.22 22)",
              color: "oklch(0.95 0 0)",
            }}
            onClick={onConfirm}
            disabled={isPending}
            data-ocid="hotel-delete-confirm-btn"
          >
            {isPending ? "Deleting..." : "Delete Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Hotel Line Item Row ───────────────────────────────────────────────────────

interface HotelLineForm extends HotelVoucherLine {
  _id: string;
  supplierId?: string;
  guestName?: string;
  confirmationNo?: string;
}

function HotelLineRow({
  line,
  onUpdate,
  onRemove,
  canRemove,
  supplierOptions,
}: {
  line: HotelLineForm;
  onUpdate: (
    id: string,
    key: keyof HotelLineForm,
    val: string | number,
  ) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  supplierOptions: SelectOption[];
}) {
  const nights = calcNights(line.checkIn, line.checkOut);
  const total = nights * line.ratePerNight;

  return (
    <div
      className="hotel-item rounded-xl p-4 space-y-3"
      style={{
        background: "oklch(0.14 0 0)",
        border: "1px solid oklch(0.22 0 0 / 0.8)",
      }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-accent uppercase tracking-wide">
            Hotel Entry
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(line._id)}
            aria-label="Remove hotel entry"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors duration-200"
          >
            <MinusCircle className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {/* Hotel name + city */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Hotel Name *
          </Label>
          <Input
            value={line.hotelName}
            onChange={(e) => onUpdate(line._id, "hotelName", e.target.value)}
            placeholder="e.g. Marriott Makkah"
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            City
          </Label>
          <Input
            value={line.remarks ?? ""}
            onChange={(e) => onUpdate(line._id, "remarks", e.target.value)}
            placeholder="e.g. Makkah / Dubai"
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
      </div>

      {/* Check-in / Check-out / Nights */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Check-In *
          </Label>
          <Input
            type="date"
            value={line.checkIn}
            onChange={(e) => onUpdate(line._id, "checkIn", e.target.value)}
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Check-Out *
          </Label>
          <Input
            type="date"
            value={line.checkOut}
            onChange={(e) => onUpdate(line._id, "checkOut", e.target.value)}
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Nights
          </Label>
          <div
            className="h-8 flex items-center px-3 rounded-lg text-sm font-mono text-accent"
            style={{
              background: "oklch(0.75 0.15 82 / 0.08)",
              border: "1px solid oklch(0.75 0.15 82 / 0.2)",
            }}
          >
            {nights} night{nights !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Room type + Rooms + Rate + Total */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Room Type
          </Label>
          <Input
            value={line.roomType}
            onChange={(e) => onUpdate(line._id, "roomType", e.target.value)}
            placeholder="Deluxe / Suite"
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Rooms
          </Label>
          <Input
            type="number"
            min={1}
            value={line.rooms || ""}
            onChange={(e) =>
              onUpdate(line._id, "rooms", Number(e.target.value))
            }
            placeholder="1"
            className="bg-secondary border-border/40 h-8 text-sm text-right"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Rate/Night *
          </Label>
          <Input
            type="number"
            min={0}
            value={line.ratePerNight || ""}
            onChange={(e) =>
              onUpdate(line._id, "ratePerNight", Number(e.target.value))
            }
            placeholder="0.00"
            className="bg-secondary border-border/40 h-8 text-sm text-right"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Total
          </Label>
          <div
            className="h-8 flex items-center justify-end px-3 rounded-lg text-sm font-mono font-semibold text-accent"
            style={{
              background: "oklch(0.75 0.15 82 / 0.08)",
              border: "1px solid oklch(0.75 0.15 82 / 0.2)",
            }}
          >
            {fmt(total)}
          </div>
        </div>
      </div>

      {/* Guest Name + Confirmation No + Supplier */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Guest Name
          </Label>
          <Input
            value={line.guestName ?? ""}
            onChange={(e) => onUpdate(line._id, "guestName", e.target.value)}
            placeholder="Guest name"
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Confirmation No
          </Label>
          <Input
            value={line.confirmationNo ?? ""}
            onChange={(e) =>
              onUpdate(line._id, "confirmationNo", e.target.value)
            }
            placeholder="CNF-XXXXXX"
            className="bg-secondary border-border/40 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Supplier
          </Label>
          <SearchableSelect
            options={supplierOptions}
            value={line.supplierId ?? ""}
            onChange={(id) => onUpdate(line._id, "supplierId", id)}
            placeholder="Select supplier..."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function emptyLine(): HotelLineForm {
  return {
    _id: String(Date.now() + Math.random()),
    hotelName: "",
    roomType: "",
    checkIn: TODAY,
    checkOut: TODAY,
    rooms: 1,
    ratePerNight: 0,
    totalAmount: 0,
    guestName: "",
    confirmationNo: "",
    supplierId: "",
    remarks: "",
  };
}

function HotelVoucherFormModal({
  editData,
  clientOptions,
  supplierOptions,
  onClose,
}: {
  editData?: HotelVoucherBackend;
  clientOptions: SelectOption[];
  supplierOptions: SelectOption[];
  onClose: () => void;
}) {
  const addHV = useAddHotelVoucher();
  const updateHV = useUpdateHotelVoucher();
  const isEdit = !!editData;

  const [clientId, setClientId] = useState(editData?.clientId ?? "");
  const [date, setDate] = useState(
    editData ? tsToInputDate(editData.date) : TODAY,
  );
  const [dueDate, setDueDate] = useState(
    editData?.dueDate ? tsToInputDate(editData.dueDate) : "",
  );
  const [remarks, setRemarks] = useState(editData?.remarks ?? "");

  const [lines, setLines] = useState<HotelLineForm[]>(() => {
    if (editData?.hotels?.length) {
      return editData.hotels.map((h, i) => ({
        _id: String(i),
        hotelName: h.hotelName,
        roomType: h.roomType,
        checkIn: tsToInputDate(h.checkIn),
        checkOut: tsToInputDate(h.checkOut),
        rooms: Number(h.rooms),
        ratePerNight: h.ratePerNight,
        totalAmount: h.totalAmount,
        guestName: "",
        confirmationNo: "",
        supplierId: "",
        remarks: h.remarks ?? "",
      }));
    }
    return [emptyLine()];
  });

  function updateLine(
    id: string,
    key: keyof HotelLineForm,
    val: string | number,
  ) {
    setLines((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l;
        const updated = { ...l, [key]: val };
        // auto-recalc total
        const nights = calcNights(updated.checkIn, updated.checkOut);
        updated.totalAmount = nights * updated.ratePerNight;
        return updated;
      }),
    );
  }

  const grandTotal = lines.reduce((s, l) => {
    return s + calcNights(l.checkIn, l.checkOut) * l.ratePerNight;
  }, 0);

  async function handleSave() {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    const invalid = lines.find(
      (l) => !l.hotelName || !l.checkIn || !l.checkOut || l.ratePerNight <= 0,
    );
    if (invalid) {
      toast.error(
        "Each hotel entry needs Hotel Name, dates and Rate per Night",
      );
      return;
    }

    const formData: HotelVoucherFormData = {
      clientId,
      date,
      dueDate,
      hotels: lines.map((l) => ({
        hotelName: l.hotelName,
        roomType: l.roomType,
        checkIn: l.checkIn,
        checkOut: l.checkOut,
        rooms: l.rooms,
        ratePerNight: l.ratePerNight,
        totalAmount: calcNights(l.checkIn, l.checkOut) * l.ratePerNight,
        remarks: l.remarks,
      })),
      remarks,
    };

    try {
      if (isEdit && editData) {
        await updateHV.mutateAsync({ ...formData, id: editData.id });
        toast.success("Hotel voucher updated successfully.");
      } else {
        await addHV.mutateAsync(formData);
        toast.success("Hotel voucher created. Ledger updated.");
      }
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to save hotel voucher",
      );
    }
  }

  const isPending = addHV.isPending || updateHV.isPending;

  return (
    <Modal
      title={isEdit ? "Edit Hotel Voucher" : "New Hotel Voucher"}
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        {/* Header section */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            background: "oklch(0.13 0 0)",
            border: "1px solid oklch(0.75 0.15 82 / 0.15)",
          }}
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-wide">
            Voucher Header
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Date *
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border/40"
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-secondary border-border/40"
              />
            </div>
            <div className="col-span-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Client *
              </Label>
              <SearchableSelect
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                placeholder="Select client..."
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Remarks
            </Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks or notes..."
              className="bg-secondary border-border/40 resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Hotel line items */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide">
            Hotel Line Items
          </p>
          {lines.map((line) => (
            <HotelLineRow
              key={line._id}
              line={line}
              onUpdate={updateLine}
              onRemove={(id) => setLines((p) => p.filter((l) => l._id !== id))}
              canRemove={lines.length > 1}
              supplierOptions={supplierOptions}
            />
          ))}
          <button
            type="button"
            onClick={() => setLines((p) => [...p, emptyLine()])}
            className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors duration-200 py-2"
            data-ocid="hotel-add-line-btn"
          >
            <PlusCircle className="w-4 h-4" /> Add Hotel Entry
          </button>
        </div>

        {/* Grand total */}
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{
            background: "oklch(0.75 0.15 82 / 0.08)",
            border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lines.length} hotel entr{lines.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <p className="font-mono text-2xl font-bold text-accent">
            {fmt(grandTotal)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
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
            data-ocid="hotel-save-btn"
          >
            {isPending
              ? "Saving..."
              : isEdit
                ? "Update Hotel Voucher"
                : "Create Hotel Voucher"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── View / Detail Modal ──────────────────────────────────────────────────────

function ViewHotelVoucherModal({
  voucher,
  clientName,
  currency,
  onClose,
}: {
  voucher: HotelVoucherBackend;
  clientName: string;
  supplierMap?: Map<string, string>;
  currency: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Hotel Voucher – ${voucher.voucherNo}</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #111; background: #fff; margin: 0; padding: 24px; font-size: 13px; }
        h1 { font-size: 20px; font-weight: 700; color: #B8922A; margin: 0 0 4px 0; }
        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #F5F0E8; text-align: left; padding: 8px 10px; font-size: 11px; color: #555; border-bottom: 2px solid #D4AF37; }
        td { padding: 8px 10px; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
        .total-row td { font-weight: 700; background: #FFF9ED; border-top: 2px solid #D4AF37; }
        .footer { margin-top: 24px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>
      <h1>🏨 Hotel Voucher</h1>
      <div class="meta">
        <strong>Voucher No:</strong> ${voucher.voucherNo} &nbsp;|&nbsp;
        <strong>Date:</strong> ${tsToDate(voucher.date)} &nbsp;|&nbsp;
        <strong>Client:</strong> ${clientName}
        ${voucher.remarks ? `&nbsp;|&nbsp;<strong>Remarks:</strong> ${voucher.remarks}` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Hotel</th><th>City/Room Type</th>
            <th>Check-In</th><th>Check-Out</th><th>Nights</th>
            <th>Rooms</th><th>Rate/Night</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${voucher.hotels
            .map((h, i) => {
              const nights = calcNights(
                tsToInputDate(h.checkIn),
                tsToInputDate(h.checkOut),
              );
              const lineTotal = nights * h.ratePerNight;
              return `<tr>
              <td>${i + 1}</td>
              <td>${h.hotelName}</td>
              <td>${h.roomType}</td>
              <td>${tsToDate(h.checkIn)}</td>
              <td>${tsToDate(h.checkOut)}</td>
              <td>${nights}</td>
              <td>${Number(h.rooms)}</td>
              <td>${currency} ${fmt(h.ratePerNight)}</td>
              <td>${currency} ${fmt(lineTotal)}</td>
            </tr>`;
            })
            .join("")}
          <tr class="total-row">
            <td colspan="8" style="text-align:right">Grand Total</td>
            <td>${currency} ${fmt(voucher.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Generated by TravelERP Pro · ${new Date().toLocaleString()}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <Modal title="Hotel Voucher Detail" onClose={onClose} wide>
      <div className="space-y-5" ref={printRef}>
        {/* Header card */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "oklch(0.75 0.15 82 / 0.07)",
            border: "1px solid oklch(0.75 0.15 82 / 0.25)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BedDouble className="w-5 h-5 text-accent" />
                <span className="font-mono font-bold text-accent text-lg">
                  {voucher.voucherNo}
                </span>
                <StatusBadge status={voucher.status} />
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Date:{" "}
                  <span className="text-foreground">
                    {tsToDate(voucher.date)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Client:{" "}
                  <span className="text-foreground font-medium">
                    {clientName}
                  </span>
                </p>
                {voucher.dueDate && (
                  <p className="text-muted-foreground">
                    Due:{" "}
                    <span className="text-foreground">
                      {tsToDate(voucher.dueDate)}
                    </span>
                  </p>
                )}
                {voucher.remarks && (
                  <p className="text-muted-foreground">
                    Remarks:{" "}
                    <span className="text-foreground">{voucher.remarks}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Grand Total</p>
              <p className="font-mono text-2xl font-bold text-accent">
                {currency} {fmt(voucher.totalAmount)}
              </p>
              <div className="flex gap-2 mt-3 justify-end">
                <p className="text-xs text-muted-foreground">
                  Paid:{" "}
                  <span className="text-foreground font-mono">
                    {fmt(voucher.paid)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Due:{" "}
                  <span
                    style={{ color: "oklch(0.65 0.22 22)" }}
                    className="font-mono"
                  >
                    {fmt(voucher.due)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hotel items table */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hotel Line Items
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
                  {[
                    "#",
                    "Hotel",
                    "City/Type",
                    "Check-In",
                    "Check-Out",
                    "Nights",
                    "Rooms",
                    "Rate/Night",
                    "Total",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2.5 text-muted-foreground font-medium whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {voucher.hotels.map((h, i) => {
                  const nights = calcNights(
                    tsToInputDate(h.checkIn),
                    tsToInputDate(h.checkOut),
                  );
                  const lineTotal = nights * h.ratePerNight;
                  return (
                    <tr
                      key={`${h.hotelName}-${String(h.checkIn)}`}
                      className="hotel-item border-b border-border/20 hover:bg-muted/20 transition-colors duration-150"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground font-mono">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {h.hotelName}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">
                        {h.roomType || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-foreground font-mono">
                        {tsToDate(h.checkIn)}
                      </td>
                      <td className="px-3 py-2.5 text-foreground font-mono">
                        {tsToDate(h.checkOut)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-accent">
                        {nights}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-foreground">
                        {Number(h.rooms)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-right text-foreground">
                        {fmt(h.ratePerNight)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-right font-semibold text-accent">
                        {fmt(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
                <tr
                  style={{
                    background: "oklch(0.75 0.15 82 / 0.07)",
                    borderTop: "1px solid oklch(0.75 0.15 82 / 0.3)",
                  }}
                >
                  <td
                    colSpan={8}
                    className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground"
                  >
                    Grand Total
                  </td>
                  <td className="px-3 py-3 font-mono font-bold text-accent text-sm text-right">
                    {currency} {fmt(voucher.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Print CTA */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-border/40"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            className="flex items-center gap-2 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            onClick={handlePrint}
            data-ocid="hotel-print-btn"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = String(status).toLowerCase();
  const cfg =
    s === "paid"
      ? { color: "oklch(0.72 0.18 150)", bg: "oklch(0.72 0.18 150 / 0.15)" }
      : s === "partial"
        ? { color: "oklch(0.75 0.15 82)", bg: "oklch(0.75 0.15 82 / 0.15)" }
        : { color: "oklch(0.65 0.22 22)", bg: "oklch(0.65 0.22 22 / 0.15)" };
  return (
    <span
      className="text-xs font-medium px-2.5 py-0.5 rounded-full capitalize"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {s || "unpaid"}
    </span>
  );
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }, (_, i) => `skel-${i}`).map((key) => (
        <div key={key} className="flex items-center gap-4 h-12">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "add" }
  | { type: "edit"; voucher: HotelVoucherBackend }
  | { type: "view"; voucher: HotelVoucherBackend }
  | { type: "delete"; voucher: HotelVoucherBackend }
  | null;

export default function HotelVouchersPage() {
  const { data: rawVouchers = [], isLoading } = useHotelVouchers();
  const { data: clients = [] } = useClients();
  const { data: suppliers = [] } = useSuppliers();
  const { data: settings } = useSettings();
  const deleteHV = useDeleteHotelVoucher();

  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const currency =
    (settings as unknown as { currency?: string })?.currency ?? "PKR";
  const vouchers = rawVouchers as unknown as HotelVoucherBackend[];

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));

  // Filter
  const filtered = vouchers.filter((v) => {
    const clientName = clientMap.get(v.clientId) ?? "";
    const matchSearch =
      !search ||
      v.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());
    const vDate = tsToInputDate(v.date);
    const matchFrom = !dateFrom || vDate >= dateFrom;
    const matchTo = !dateTo || vDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  });

  const totalAmount = filtered.reduce((s, v) => s + v.totalAmount, 0);

  async function handleDelete(v: HotelVoucherBackend) {
    try {
      await deleteHV.mutateAsync(v.id);
      toast.success("Hotel voucher deleted.");
      setModal(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <Layout title="Hotel Vouchers">
      <div className="flex flex-col gap-6">
        {/* ─── Page header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6 text-accent" />
              Hotel Vouchers
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Multi-hotel booking vouchers with itemised line items
            </p>
          </div>
          <Button
            onClick={() => setModal({ type: "add" })}
            className="flex items-center gap-2 font-semibold text-black"
            style={{ background: "oklch(0.75 0.15 82)" }}
            data-ocid="hotel-new-btn"
          >
            <Plus className="w-4 h-4" /> New Hotel Voucher
          </Button>
        </div>

        {/* ─── Summary KPIs ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Vouchers",
              value: String(filtered.length),
              icon: <BedDouble className="w-5 h-5" />,
            },
            {
              label: "Total Amount",
              value: `${currency} ${fmt(totalAmount)}`,
              icon: <Calendar className="w-5 h-5" />,
            },
            {
              label: "Hotels Booked",
              value: String(filtered.reduce((s, v) => s + v.hotels.length, 0)),
              icon: <Building2 className="w-5 h-5" />,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-accent flex-shrink-0"
                style={{
                  background: "oklch(0.75 0.15 82 / 0.1)",
                  border: "1px solid oklch(0.75 0.15 82 / 0.25)",
                }}
              >
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {kpi.label}
                </p>
                <p className="font-mono font-bold text-foreground text-lg truncate">
                  {kpi.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Filters ─────────────────────────────────────────── */}
        <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Search
            </Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Voucher No or Client..."
              className="bg-secondary border-border/40"
              data-ocid="hotel-search"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              From
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-secondary border-border/40 w-40"
              data-ocid="hotel-date-from"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              To
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-secondary border-border/40 w-40"
              data-ocid="hotel-date-to"
            />
          </div>
          {(search || dateFrom || dateTo) && (
            <Button
              variant="outline"
              className="border-border/40 self-end"
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* ─── Table ───────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
          >
            <p className="text-sm font-semibold text-foreground">
              All Hotel Vouchers
            </p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              data-ocid="hotel-empty-state"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: "oklch(0.75 0.15 82 / 0.1)",
                  border: "1px solid oklch(0.75 0.15 82 / 0.25)",
                }}
              >
                <BedDouble className="w-7 h-7 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  No hotel vouchers found
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {search || dateFrom || dateTo
                    ? "Try adjusting your filters"
                    : "Create your first hotel voucher to get started"}
                </p>
              </div>
              {!(search || dateFrom || dateTo) && (
                <Button
                  onClick={() => setModal({ type: "add" })}
                  className="text-black font-semibold mt-1"
                  style={{ background: "oklch(0.75 0.15 82)" }}
                  data-ocid="hotel-empty-cta"
                >
                  <Plus className="w-4 h-4 mr-1" /> New Hotel Voucher
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      background: "oklch(0.13 0 0)",
                      borderBottom: "1px solid oklch(0.18 0 0)",
                    }}
                  >
                    {[
                      "Voucher No",
                      "Date",
                      "Client",
                      "Hotels",
                      "Total Amount",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-border/20 hover:bg-muted/10 transition-colors duration-150 group"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setModal({ type: "view", voucher: v })}
                          className="font-mono font-bold text-accent hover:text-accent/80 transition-colors duration-150"
                          data-ocid="hotel-row-view"
                        >
                          {v.voucherNo}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {tsToDate(v.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {clientMap.get(v.clientId) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          <BedDouble className="w-3.5 h-3.5 text-accent" />
                          <span className="text-foreground font-medium">
                            {v.hotels.length}
                          </span>
                          <span className="text-muted-foreground">
                            hotel{v.hotels.length !== 1 ? "s" : ""}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-accent">
                        {currency} {fmt(v.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "view", voucher: v })
                            }
                            aria-label="View voucher"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-accent transition-colors duration-150"
                            style={{ background: "oklch(0.16 0 0)" }}
                            data-ocid="hotel-action-view"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "edit", voucher: v })
                            }
                            aria-label="Edit voucher"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-accent transition-colors duration-150"
                            style={{ background: "oklch(0.16 0 0)" }}
                            data-ocid="hotel-action-edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ type: "delete", voucher: v })
                            }
                            aria-label="Delete voucher"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors duration-150"
                            style={{ background: "oklch(0.16 0 0)" }}
                            data-ocid="hotel-action-delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modals ───────────────────────────────────────────── */}

      {modal?.type === "add" && (
        <HotelVoucherFormModal
          clientOptions={clientOptions}
          supplierOptions={supplierOptions}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "edit" && (
        <HotelVoucherFormModal
          editData={modal.voucher}
          clientOptions={clientOptions}
          supplierOptions={supplierOptions}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "view" && (
        <ViewHotelVoucherModal
          voucher={modal.voucher}
          clientName={clientMap.get(modal.voucher.clientId) ?? "—"}
          currency={currency}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <ConfirmDeleteModal
          voucherNo={modal.voucher.voucherNo}
          onConfirm={() => handleDelete(modal.voucher)}
          onClose={() => setModal(null)}
          isPending={deleteHV.isPending}
        />
      )}
    </Layout>
  );
}
