import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import {
  type BookingFormData,
  type BookingStatus,
  BookingType,
  type ClientFormData,
  ClientType,
  type ContraVoucherFormData,
  type JournalVoucherFormData,
  PaymentMethod,
  type PaymentVoucherFormData,
  type ReceiptVoucherFormData,
  type SettingsFormData,
  type VoucherType,
} from "../types";

// ─── Actor factory ────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
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
