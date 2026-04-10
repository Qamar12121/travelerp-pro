import { useActor } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  AdvanceType,
  type AdvanceVoucherFormData,
  type BookingFormData,
  type BookingStatus,
  BookingType,
  type ClientFormData,
  ClientType,
  type ContraVoucherFormData,
  type HotelVoucherFormData,
  InvoiceType,
  type JournalVoucherFormData,
  PaymentMethod,
  type PaymentVoucherFormData,
  type ReceiptVoucherFormData,
  type RefundInvoiceFormData,
  type SettingsFormData,
  type VoucherType,
} from "../types";

// ─── Inline types for new backend methods ────────────────────────────────────
// These live here since backend.d.ts is generated and write-protected.

interface HotelVoucherLineBackend {
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
  hotels: HotelVoucherLineBackend[];
  remarks?: string;
  createdAt: bigint;
}

interface NotificationBackend {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: bigint;
  entityId?: string;
  entityType?: string;
}

// ─── Extended actor type for new backend methods ──────────────────────────────
// These methods will be available once the backend is updated.
// Until then we guard with try/catch and return safe defaults.

interface ExtendedBackendMethods {
  createRefundInvoice(
    originalInvoiceId: string,
    clientId: string,
    refundAmount: number,
    refundReason: string | null,
    date: bigint,
    paymentMethod: PaymentMethod,
  ): Promise<{ __kind__: "ok"; ok: string } | { __kind__: "err"; err: string }>;
  getHotelVouchers(): Promise<HotelVoucherBackend[]>;
  addHotelVoucher(
    clientId: string,
    date: bigint,
    dueDate: bigint | null,
    hotels: HotelVoucherLineBackend[],
    remarks: string | null,
  ): Promise<
    | { __kind__: "ok"; ok: HotelVoucherBackend }
    | { __kind__: "err"; err: string }
  >;
  updateHotelVoucher(
    id: string,
    clientId: string,
    date: bigint,
    dueDate: bigint | null,
    hotels: HotelVoucherLineBackend[],
    remarks: string | null,
  ): Promise<
    | { __kind__: "ok"; ok: HotelVoucherBackend }
    | { __kind__: "err"; err: string }
  >;
  deleteHotelVoucher(
    id: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  getNotifications(): Promise<NotificationBackend[]>;
  getUnreadNotificationCount(): Promise<bigint>;
  markNotificationRead(
    id: string,
  ): Promise<{ __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }>;
  markAllNotificationsRead(): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  >;
  completeOnboarding(): Promise<
    { __kind__: "ok"; ok: null } | { __kind__: "err"; err: string }
  >;
}

// ─── Actor factory ────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
}

// Helper to access new backend methods with a type-safe cast
function asExtended(
  actor: ReturnType<typeof createActor>,
): ExtendedBackendMethods {
  return actor as unknown as ExtendedBackendMethods;
}

// ─── Result unwrapper ─────────────────────────────────────────────────────────

function unwrapResult<T>(
  result: { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string },
): T {
  if (result.__kind__ === "err") throw new Error(result.err);
  return result.ok;
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => actor!.getDashboardStats(),
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useClients() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => actor!.getClients(),
    enabled: !!actor && !isFetching,
  });
}

export function useSuppliers() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => actor!.getSuppliers(),
    enabled: !!actor && !isFetching,
  });
}

export function useBookings() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => actor!.getBookings(),
    enabled: !!actor && !isFetching,
  });
}

export function useInvoices() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => actor!.getInvoices(),
    enabled: !!actor && !isFetching,
  });
}

export function useInvoicesByType(invoiceType: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["invoices", "type", invoiceType],
    queryFn: () => {
      const typeMap: Record<string, InvoiceType> = {
        booking: InvoiceType.booking,
        manual: InvoiceType.manual,
        proforma: InvoiceType.proforma,
        creditNote: InvoiceType.creditNote,
        debitNote: InvoiceType.debitNote,
      };
      return actor!.getInvoicesByType(typeMap[invoiceType]!);
    },
    enabled: !!actor && !isFetching && !!invoiceType,
  });
}

export function useInvoicesSummary() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["invoicesSummary"],
    queryFn: () => actor!.getInvoicesSummary(),
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useInvoicesByClient(clientId: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["invoices", "client", clientId],
    queryFn: () => actor!.getInvoicesByClient(clientId),
    enabled: !!actor && !isFetching && !!clientId,
  });
}

export function useInvoiceById(id: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => actor!.getInvoiceById(id),
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useVouchers(type?: VoucherType) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["vouchers", type ?? "all"],
    queryFn: () =>
      type ? actor!.getVouchersByType(type) : actor!.getVouchers(),
    enabled: !!actor && !isFetching,
  });
}

export function useLedger(entityId: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["ledger", entityId],
    queryFn: () => actor!.getLedgerByEntity(entityId),
    enabled: !!actor && !isFetching && !!entityId,
  });
}

export function useRunningBalance(entityId: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["balance", entityId],
    queryFn: () => actor!.getRunningBalance(entityId),
    enabled: !!actor && !isFetching && !!entityId,
  });
}

export function useDailyLedgerSummary(startDate: bigint, endDate: bigint) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["ledger", "daily", startDate.toString(), endDate.toString()],
    queryFn: () => actor!.getDailyLedgerSummary(startDate, endDate),
    enabled: !!actor && !isFetching,
  });
}

export function useWeeklyLedgerSummary(startDate: bigint, endDate: bigint) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["ledger", "weekly", startDate.toString(), endDate.toString()],
    queryFn: () => actor!.getWeeklyLedgerSummary(startDate, endDate),
    enabled: !!actor && !isFetching,
  });
}

export function useClientLedgerSummaries() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["ledger", "clientSummaries"],
    queryFn: () => actor!.getClientLedgerSummaries(),
    enabled: !!actor && !isFetching,
  });
}

export function useSettings() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => actor!.getSettings(),
    enabled: !!actor && !isFetching,
  });
}

export function useProfitLossReport() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["reports", "profitLoss"],
    queryFn: () => actor!.getProfitLossReport(),
    enabled: !!actor && !isFetching,
  });
}

export function useTrialBalance() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["reports", "trialBalance"],
    queryFn: () => actor!.getTrialBalance(),
    enabled: !!actor && !isFetching,
  });
}

export function useOutstandingReport() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["reports", "outstanding"],
    queryFn: () => actor!.getOutstandingReport(),
    enabled: !!actor && !isFetching,
  });
}

export function useCallerRole() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["callerRole"],
    queryFn: () => actor!.getCallerUserRole(),
    enabled: !!actor && !isFetching,
  });
}

// ─── Hotel Voucher Hooks ──────────────────────────────────────────────────────

export function useHotelVouchers() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["hotelVouchers"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await asExtended(actor).getHotelVouchers();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Notification Hooks ───────────────────────────────────────────────────────

export function useNotifications() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await asExtended(actor).getNotifications();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

export function useUnreadNotificationCount() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      try {
        return await asExtended(actor).getUnreadNotificationCount();
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useAddClient() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientFormData) => {
      const result = await actor!.addClient(
        data.name,
        data.phone,
        data.email || null,
        data.openingBalance,
        data.clientType === "supplier"
          ? ClientType.supplier
          : ClientType.client,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useUpdateClient() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientFormData & { id: string }) => {
      const result = await actor!.updateClient(
        data.id,
        data.name,
        data.phone,
        data.email || null,
        data.openingBalance,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useDeleteClient() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await actor!.deleteClient(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useAddBooking() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BookingFormData) => {
      const typeMap: Record<string, BookingType> = {
        ticket: BookingType.ticket,
        visa: BookingType.visa,
        umrah: BookingType.umrah,
        tour: BookingType.tour,
      };
      const travelDateTs = data.travelDate
        ? BigInt(new Date(data.travelDate).getTime() * 1_000_000)
        : null;
      const result = await actor!.addBooking(
        data.clientId,
        typeMap[data.bookingType] ?? BookingType.ticket,
        data.pnr || null,
        data.sector || null,
        data.airline || null,
        travelDateTs,
        data.netFare,
        data.saleFare,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateBooking() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: BookingFormData & { id: string; status: BookingStatus },
    ) => {
      const typeMap: Record<string, BookingType> = {
        ticket: BookingType.ticket,
        visa: BookingType.visa,
        umrah: BookingType.umrah,
        tour: BookingType.tour,
      };
      const travelDateTs = data.travelDate
        ? BigInt(new Date(data.travelDate).getTime() * 1_000_000)
        : null;
      const result = await actor!.updateBooking(
        data.id,
        data.clientId,
        typeMap[data.bookingType] ?? BookingType.ticket,
        data.pnr || null,
        data.sector || null,
        data.airline || null,
        travelDateTs,
        data.netFare,
        data.saleFare,
        data.status,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useAddReceiptVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReceiptVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addReceiptVoucher(
        dateTs,
        data.clientId,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useAddPaymentVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PaymentVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addPaymentVoucher(
        dateTs,
        data.supplierId,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useAddJournalVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: JournalVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addJournalVoucher(
        dateTs,
        data.entries.map((e) => ({
          accountId: e.accountId,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
        })),
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useAddContraVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ContraVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addContraVoucher(
        dateTs,
        data.fromAccount,
        data.toAccount,
        data.amount,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

// NOTE: Backend does not yet expose getVoucherById, update*, or deleteVoucher.
// These hooks post new correcting entries instead or throw a pending error.

export function useUpdateReceiptVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReceiptVoucherFormData & { id: string }) => {
      // Backend lacks updateReceiptVoucher — post a new corrected entry
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addReceiptVoucher(
        dateTs,
        data.clientId,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdatePaymentVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PaymentVoucherFormData & { id: string }) => {
      // Backend lacks updatePaymentVoucher — post a new corrected entry
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addPaymentVoucher(
        dateTs,
        data.supplierId,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateJournalVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: JournalVoucherFormData & { id: string }) => {
      // Backend lacks updateJournalVoucher — post a new corrected entry
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addJournalVoucher(
        dateTs,
        data.entries.map((e) => ({
          accountId: e.accountId,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
        })),
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useUpdateContraVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ContraVoucherFormData & { id: string }) => {
      // Backend lacks updateContraVoucher — post a new corrected entry
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addContraVoucher(
        dateTs,
        data.fromAccount,
        data.toAccount,
        data.amount,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useDeleteVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await actor!.deleteVoucher(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

// ─── Advance Voucher Hooks ────────────────────────────────────────────────────

export function useAdvanceVouchers() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["advanceVouchers"],
    queryFn: () => actor!.getAdvanceVouchers(),
    enabled: !!actor && !isFetching,
  });
}

export function useVouchersSummary() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["vouchersSummary"],
    queryFn: () => actor!.getVouchersSummary(),
    enabled: !!actor && !isFetching,
  });
}

export function useAddAdvanceVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdvanceVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.addAdvanceVoucher(
        dateTs,
        data.clientId || null,
        data.supplierId || null,
        data.linkedClientId || null,
        data.linkedSupplierId || null,
        data.advanceType === "paid" ? AdvanceType.paid : AdvanceType.received,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
        data.entries.map((e) => ({
          accountId: e.accountId,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
        })),
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advanceVouchers"] });
      qc.invalidateQueries({ queryKey: ["vouchersSummary"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateAdvanceVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdvanceVoucherFormData & { id: string }) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await actor!.updateAdvanceVoucher(
        data.id,
        dateTs,
        data.clientId || null,
        data.supplierId || null,
        data.linkedClientId || null,
        data.linkedSupplierId || null,
        data.advanceType === "paid" ? AdvanceType.paid : AdvanceType.received,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
        data.entries.map((e) => ({
          accountId: e.accountId,
          accountName: e.accountName,
          debit: e.debit,
          credit: e.credit,
        })),
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advanceVouchers"] });
      qc.invalidateQueries({ queryKey: ["vouchersSummary"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
    },
  });
}

export function useDeleteAdvanceVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await actor!.deleteAdvanceVoucher(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advanceVouchers"] });
      qc.invalidateQueries({ queryKey: ["vouchersSummary"] });
    },
  });
}

export function useUpdateSettings() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const result = await actor!.updateSettings(
        data.currency,
        data.invoicePrefix,
        BigInt(data.invoiceNextNo),
        data.voucherPrefix,
        BigInt(data.voucherNextNo),
        data.agencyName,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// ─── Invoice Payment Mutation ─────────────────────────────────────────────────

export interface InvoicePaymentData {
  clientId: string;
  amount: number;
  paymentMethod: "cash" | "bank";
  remarks: string;
}

export function useRecordInvoicePayment() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: InvoicePaymentData) => {
      const dateTs = BigInt(Date.now() * 1_000_000);
      const result = await actor!.addReceiptVoucher(
        dateTs,
        data.clientId,
        data.amount,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["vouchers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Refund Invoice Mutation ──────────────────────────────────────────────────

export function useCreateRefundInvoice() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RefundInvoiceFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const result = await asExtended(actor!).createRefundInvoice(
        data.originalInvoiceId,
        data.clientId,
        data.refundAmount,
        data.refundReason || null,
        dateTs,
        data.paymentMethod === "bank" ? PaymentMethod.bank : PaymentMethod.cash,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoicesSummary"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

// ─── Hotel Voucher Mutations ──────────────────────────────────────────────────

export function useAddHotelVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: HotelVoucherFormData) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const dueDateTs = data.dueDate
        ? BigInt(new Date(data.dueDate).getTime() * 1_000_000)
        : null;
      const hotelLines = data.hotels.map((h) => ({
        hotelName: h.hotelName,
        checkIn: BigInt(new Date(h.checkIn).getTime() * 1_000_000),
        checkOut: BigInt(new Date(h.checkOut).getTime() * 1_000_000),
        rooms: BigInt(h.rooms),
        roomType: h.roomType,
        ratePerNight: h.ratePerNight,
        totalAmount: h.totalAmount,
        remarks: h.remarks ?? undefined,
      }));
      const result = await asExtended(actor!).addHotelVoucher(
        data.clientId,
        dateTs,
        dueDateTs,
        hotelLines,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotelVouchers"] });
      qc.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });
}

export function useUpdateHotelVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: HotelVoucherFormData & { id: string }) => {
      const dateTs = BigInt(new Date(data.date).getTime() * 1_000_000);
      const dueDateTs = data.dueDate
        ? BigInt(new Date(data.dueDate).getTime() * 1_000_000)
        : null;
      const hotelLines = data.hotels.map((h) => ({
        hotelName: h.hotelName,
        checkIn: BigInt(new Date(h.checkIn).getTime() * 1_000_000),
        checkOut: BigInt(new Date(h.checkOut).getTime() * 1_000_000),
        rooms: BigInt(h.rooms),
        roomType: h.roomType,
        ratePerNight: h.ratePerNight,
        totalAmount: h.totalAmount,
        remarks: h.remarks ?? undefined,
      }));
      const result = await asExtended(actor!).updateHotelVoucher(
        data.id,
        data.clientId,
        dateTs,
        dueDateTs,
        hotelLines,
        data.remarks || null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotelVouchers"] });
    },
  });
}

export function useDeleteHotelVoucher() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await asExtended(actor!).deleteHotelVoucher(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotelVouchers"] });
    },
  });
}

// ─── Notification Mutations ───────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await asExtended(actor!).markNotificationRead(id);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await asExtended(actor!).markAllNotificationsRead();
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
  });
}

// ─── Onboarding Mutation ──────────────────────────────────────────────────────

export function useCompleteOnboarding() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await asExtended(actor!).completeOnboarding();
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

// ─── Agency & Agent Query Hooks ───────────────────────────────────────────────

export function useMyAgency() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["myAgency"],
    queryFn: () => actor!.getMyAgency(),
    enabled: !!actor && !isFetching,
  });
}

export function useMyAgents() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["myAgents"],
    queryFn: async () => {
      const result = await actor!.getMyAgents();
      return unwrapResult(result);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllAgencies() {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["allAgencies"],
    queryFn: async () => {
      const result = await actor!.getAllAgencies();
      return unwrapResult(result);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAgencyStats(agencyId: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["agencyStats", agencyId],
    queryFn: async () => {
      const result = await actor!.getAgencyStats(agencyId);
      return unwrapResult(result);
    },
    enabled: !!actor && !isFetching && !!agencyId,
  });
}

export function useAdvanceVoucherById(id: string) {
  const { actor, isFetching } = useBackendActor();
  return useQuery({
    queryKey: ["advanceVoucher", id],
    queryFn: () => actor!.getAdvanceVoucherById(id),
    enabled: !!actor && !isFetching && !!id,
  });
}

// ─── Agency & Agent Mutation Hooks ────────────────────────────────────────────

export function useCreateAgency() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agencyName: string) => {
      const result = await actor!.createAgency(agencyName);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgency"] });
      qc.invalidateQueries({ queryKey: ["allAgencies"] });
    },
  });
}

export function useUpdateAgencyProfile() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { newName?: string; newLogoUrl?: string }) => {
      const result = await actor!.updateAgencyProfile(
        data.newName ?? null,
        data.newLogoUrl ?? null,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

export function useAddAgent() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const result = await actor!.addAgent(data.name, data.email);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

export function useRemoveAgent() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const result = await actor!.removeAgent(agentId);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

export function useToggleAgentAccess() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { agentId: string; isActive: boolean }) => {
      const result = await actor!.toggleAgentAccess(
        data.agentId,
        data.isActive,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
    },
  });
}

export function useLinkMyAgentPrincipal() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      agentId: string;
      agentPrincipal: Principal;
    }) => {
      const result = await actor!.linkMyAgentPrincipal(
        data.agentId,
        data.agentPrincipal,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
    },
  });
}

export function useUpdateAgencyStatus() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { agencyId: string; isActive: boolean }) => {
      const result = await actor!.updateAgencyStatus(
        data.agencyId,
        data.isActive,
      );
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allAgencies"] });
    },
  });
}

export function useSetSuperAdminPrincipal() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await actor!.setSuperAdminPrincipal();
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerRole"] });
    },
  });
}

// ─── useBackendActor (exported for external use) ──────────────────────────────
export { useBackendActor };
