import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  DollarSign,
  FileText,
  PlaneTakeoff,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import {
  useAddBooking,
  useBookings,
  useClients,
  useSettings,
} from "../hooks/useBackend";
import type { Booking, BookingFormData, Column } from "../types";
import { BookingStatus, BookingType } from "../types";

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BookingStatus, string> = {
  [BookingStatus.pending]:
    "text-[oklch(0.75_0.15_82)] bg-[oklch(0.75_0.15_82/0.12)] border-[oklch(0.75_0.15_82/0.3)]",
  [BookingStatus.confirmed]:
    "text-[oklch(0.72_0.18_152)] bg-[oklch(0.72_0.18_152/0.12)] border-[oklch(0.72_0.18_152/0.3)]",
  [BookingStatus.cancelled]:
    "text-[oklch(0.65_0.22_22)] bg-[oklch(0.65_0.22_22/0.12)] border-[oklch(0.65_0.22_22/0.3)]",
};

const TYPE_STYLES: Record<BookingType, string> = {
  [BookingType.ticket]:
    "text-[oklch(0.7_0.18_240)] bg-[oklch(0.7_0.18_240/0.12)] border-[oklch(0.7_0.18_240/0.3)]",
  [BookingType.visa]:
    "text-[oklch(0.7_0.18_300)] bg-[oklch(0.7_0.18_300/0.12)] border-[oklch(0.7_0.18_300/0.3)]",
  [BookingType.umrah]:
    "text-[oklch(0.72_0.15_185)] bg-[oklch(0.72_0.15_185/0.12)] border-[oklch(0.72_0.15_185/0.3)]",
  [BookingType.tour]:
    "text-[oklch(0.72_0.18_55)] bg-[oklch(0.72_0.18_55/0.12)] border-[oklch(0.72_0.18_55/0.3)]",
};

// ─── Mini stat card ────────────────────────────────────────────────────────────

interface MiniStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function MiniStat({ label, value, icon, isLoading }: MiniStatProps) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: "oklch(0.75 0.15 82 / 0.1)" }}
      >
        <span className="text-accent">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-5 w-20 mt-1 bg-muted/30" />
        ) : (
          <p className="text-lg font-semibold text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Booking detail panel ──────────────────────────────────────────────────────

function BookingDetailPanel({
  booking,
  clientName,
  currency,
  onClose,
}: {
  booking: Booking;
  clientName: string;
  currency: string;
  onClose: () => void;
}) {
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  const formatDate = (ts?: bigint) =>
    ts
      ? new Date(Number(ts) / 1_000_000).toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        style={{
          background: "oklch(0.12 0 0)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-accent font-display text-xl">
            Booking Detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Booking ID", `${booking.id.slice(0, 12)}…`],
              ["Client", clientName],
              ["PNR", booking.pnr ?? "—"],
              ["Sector", booking.sector ?? "—"],
              ["Airline", booking.airline ?? "—"],
              ["Travel Date", formatDate(booking.travelDate)],
              ["Created", formatDate(booking.createdAt)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">
                  {label}
                </p>
                <p className="text-sm text-foreground mt-0.5 truncate">{val}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 mt-2 space-y-2"
            style={{ background: "oklch(0.085 0 0 / 0.8)" }}
          >
            {[
              ["Net Fare", fmt(booking.netFare)],
              ["Sale Fare", fmt(booking.saleFare)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{val}</span>
              </div>
            ))}
            <div
              className="flex justify-between text-sm pt-2 mt-2"
              style={{ borderTop: "1px solid oklch(0.2 0 0)" }}
            >
              <span className="font-semibold text-accent">Profit</span>
              <span className="font-semibold text-accent">
                {fmt(booking.profit)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Type</span>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${TYPE_STYLES[booking.bookingType]}`}
            >
              {booking.bookingType.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[booking.status]}`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>

          {booking.invoiceId && (
            <div className="flex items-center gap-2 pt-2">
              <FileText className="w-4 h-4 text-accent" />
              <span className="text-sm text-accent">
                Invoice linked: {booking.invoiceId.slice(0, 12)}…
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Booking Modal ─────────────────────────────────────────────────────────

function AddBookingModal({
  onClose,
  currency,
}: {
  onClose: () => void;
  currency: string;
}) {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const addBooking = useAddBooking();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<BookingFormData>({
    defaultValues: {
      clientId: "",
      bookingType: "ticket",
      pnr: "",
      sector: "",
      airline: "",
      travelDate: "",
      netFare: 0,
      saleFare: 0,
    },
  });

  const netFare = watch("netFare") || 0;
  const saleFare = watch("saleFare") || 0;
  const profit = Number(saleFare) - Number(netFare);

  const onSubmit = (data: BookingFormData) => {
    addBooking.mutate(data, {
      onSuccess: () => {
        toast.success("Booking saved!", {
          description: "Invoice & Journal Voucher created automatically.",
        });
        onClose();
      },
      onError: (e) =>
        toast.error("Failed to save booking", { description: String(e) }),
    });
  };

  const inputCls =
    "bg-transparent border-border/40 text-foreground placeholder:text-muted-foreground/50 rounded-xl focus:border-accent/60 focus:ring-accent/20 transition-smooth";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "oklch(0.12 0 0)",
          border: "1px solid oklch(0.75 0.15 82 / 0.25)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-accent font-display text-xl flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add New Booking
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Client */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
              Client *
            </Label>
            <Controller
              name="clientId"
              control={control}
              rules={{ required: "Client is required" }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={clientsLoading}
                >
                  <SelectTrigger
                    className={`${inputCls} w-full`}
                    data-ocid="booking-client-select"
                  >
                    <SelectValue placeholder="Select a client…" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      background: "oklch(0.14 0 0)",
                      border: "1px solid oklch(0.2 0 0)",
                    }}
                  >
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && (
              <p className="text-xs text-destructive mt-1">
                {errors.clientId.message}
              </p>
            )}
          </div>

          {/* Booking Type */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
              Booking Type *
            </Label>
            <Controller
              name="bookingType"
              control={control}
              render={({ field }) => (
                <div
                  className="grid grid-cols-4 gap-2"
                  data-ocid="booking-type-selector"
                >
                  {(
                    [
                      { value: "ticket", label: "✈ Ticket" },
                      { value: "visa", label: "📋 Visa" },
                      { value: "umrah", label: "🕌 Umrah" },
                      { value: "tour", label: "🌍 Tour" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className="py-2 px-3 rounded-xl text-xs font-medium transition-smooth border"
                      style={
                        field.value === opt.value
                          ? {
                              background: "oklch(0.75 0.15 82 / 0.15)",
                              borderColor: "oklch(0.75 0.15 82 / 0.5)",
                              color: "oklch(0.75 0.15 82)",
                            }
                          : {
                              background: "transparent",
                              borderColor: "oklch(0.2 0 0)",
                              color: "oklch(0.52 0 0)",
                            }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* PNR + Sector */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                PNR
              </Label>
              <Input
                {...register("pnr")}
                placeholder="e.g. XY1234"
                className={inputCls}
                data-ocid="booking-pnr-input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                Sector
              </Label>
              <Input
                {...register("sector")}
                placeholder="e.g. KHI-DXB"
                className={inputCls}
                data-ocid="booking-sector-input"
              />
            </div>
          </div>

          {/* Airline + Travel Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                Airline
              </Label>
              <Input
                {...register("airline")}
                placeholder="e.g. Emirates"
                className={inputCls}
                data-ocid="booking-airline-input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                Travel Date
              </Label>
              <Input
                type="date"
                {...register("travelDate")}
                className={`${inputCls} [color-scheme:dark]`}
                data-ocid="booking-date-input"
              />
            </div>
          </div>

          {/* Fares */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                Net Fare ({currency}) *
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("netFare", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
                placeholder="0.00"
                className={inputCls}
                data-ocid="booking-netfare-input"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase font-mono tracking-widest mb-1.5 block">
                Sale Fare ({currency}) *
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("saleFare", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
                placeholder="0.00"
                className={inputCls}
                data-ocid="booking-salefare-input"
              />
            </div>
          </div>

          {/* Profit preview */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background:
                profit >= 0
                  ? "oklch(0.72 0.18 152 / 0.07)"
                  : "oklch(0.65 0.22 22 / 0.07)",
              border: `1px solid ${profit >= 0 ? "oklch(0.72 0.18 152 / 0.25)" : "oklch(0.65 0.22 22 / 0.25)"}`,
            }}
          >
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Profit (Auto)
            </span>
            <span
              className="text-base font-semibold font-mono"
              style={{
                color:
                  profit >= 0 ? "oklch(0.72 0.18 152)" : "oklch(0.65 0.22 22)",
              }}
            >
              {currency}{" "}
              {profit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={onClose}
              data-ocid="booking-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl font-semibold"
              disabled={addBooking.isPending}
              style={{
                background: "oklch(0.75 0.15 82)",
                color: "oklch(0.085 0 0)",
              }}
              data-ocid="booking-save-btn"
            >
              {addBooking.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save Booking"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading } = useBookings();
  const { data: clients = [] } = useClients();
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? "PKR";

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const totalRevenue = bookings.reduce((s, b) => s + b.saleFare, 0);
  const totalProfit = bookings.reduce((s, b) => s + b.profit, 0);

  const columns: Column<Booking>[] = [
    {
      key: "id",
      header: "Booking ID",
      render: (_, row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {`#${row.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },
    {
      key: "clientId",
      header: "Client",
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-foreground">
          {clientMap[row.clientId] ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "pnr",
      header: "PNR",
      render: (_, row) => (
        <span className="font-mono text-sm">{row.pnr ?? "—"}</span>
      ),
    },
    {
      key: "sector",
      header: "Sector",
      render: (_, row) => (
        <span className="font-mono text-sm">{row.sector ?? "—"}</span>
      ),
    },
    {
      key: "bookingType",
      header: "Type",
      render: (_, row) => (
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${TYPE_STYLES[row.bookingType]}`}
        >
          {row.bookingType.toUpperCase()}
        </span>
      ),
    },
    {
      key: "saleFare",
      header: "Sale Fare",
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm">{fmt(row.saleFare)}</span>
      ),
    },
    {
      key: "netFare",
      header: "Net Fare",
      sortable: true,
      render: (_, row) => (
        <span className="font-mono text-sm text-muted-foreground">
          {fmt(row.netFare)}
        </span>
      ),
    },
    {
      key: "profit",
      header: "Profit",
      sortable: true,
      render: (_, row) => (
        <span
          className="font-mono text-sm font-semibold"
          style={{
            color:
              row.profit >= 0 ? "oklch(0.72 0.18 152)" : "oklch(0.65 0.22 22)",
          }}
        >
          {fmt(row.profit)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => (
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[row.status]}`}
        >
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
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
          data-ocid="booking-view-btn"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Bookings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage flight, visa, umrah & tour bookings
            </p>
          </div>
          <Button
            className="rounded-xl font-semibold gap-2 shadow-lg transition-smooth"
            style={{
              background: "oklch(0.75 0.15 82)",
              color: "oklch(0.085 0 0)",
            }}
            onClick={() => setShowAdd(true)}
            data-ocid="add-booking-btn"
          >
            <Plus className="w-4 h-4" />
            Add Booking
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <MiniStat
            label="Total Bookings"
            value={isLoading ? "…" : String(bookings.length)}
            icon={<BarChart3 className="w-5 h-5" />}
            isLoading={isLoading}
          />
          <MiniStat
            label="Total Revenue"
            value={isLoading ? "…" : fmt(totalRevenue)}
            icon={<DollarSign className="w-5 h-5" />}
            isLoading={isLoading}
          />
          <MiniStat
            label="Total Profit"
            value={isLoading ? "…" : fmt(totalProfit)}
            icon={<TrendingUp className="w-5 h-5" />}
            isLoading={isLoading}
          />
        </div>

        {/* Table */}
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={bookings as unknown as Record<string, unknown>[]}
          isLoading={isLoading}
          emptyMessage="No bookings yet. Click 'Add Booking' to get started."
          emptyIcon={
            <PlaneTakeoff
              className="w-10 h-10"
              style={{ color: "oklch(0.75 0.15 82 / 0.5)" }}
            />
          }
          onRowClick={(row) => setSelected(row as unknown as Booking)}
          keyField="id"
        />
      </div>

      {/* Modals */}
      {showAdd && (
        <AddBookingModal
          onClose={() => setShowAdd(false)}
          currency={currency}
        />
      )}
      {selected && (
        <BookingDetailPanel
          booking={selected}
          clientName={clientMap[selected.clientId] ?? "Unknown"}
          currency={currency}
          onClose={() => setSelected(null)}
        />
      )}
    </Layout>
  );
}
