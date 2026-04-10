// Re-export all types from backend.ts for convenience
export type {
  Client,
  Booking,
  Invoice,
  Voucher,
  VoucherEntry,
  LedgerEntry,
  Settings,
  DashboardStats,
  ProfitLossReport,
  TrialBalanceEntry,
  OutstandingEntry,
  EntityId,
  Timestamp,
  Result,
  Result_1,
} from "../backend";

export {
  BookingStatus,
  BookingType,
  ClientType,
  InvoiceStatus,
  PaymentMethod,
  VoucherType,
  UserRole,
} from "../backend";

// ─── UI-only helper types ────────────────────────────────────────────────────

export type AppRole = "admin" | "accountant" | "agent" | null;

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// ─── Form data types ─────────────────────────────────────────────────────────

export interface BookingFormData {
  clientId: string;
  bookingType: string;
  pnr: string;
  sector: string;
  airline: string;
  travelDate: string;
  netFare: number;
  saleFare: number;
}

export interface ClientFormData {
  name: string;
  phone: string;
  email: string;
  openingBalance: number;
  clientType: string;
}

export interface ReceiptVoucherFormData {
  date: string;
  clientId: string;
  amount: number;
  paymentMethod: string;
  remarks: string;
}

export interface PaymentVoucherFormData {
  date: string;
  supplierId: string;
  amount: number;
  paymentMethod: string;
  remarks: string;
}

export interface JournalVoucherFormData {
  date: string;
  entries: Array<{
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
  remarks: string;
}

export interface ContraVoucherFormData {
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  remarks: string;
}

export interface SettingsFormData {
  currency: string;
  invoicePrefix: string;
  invoiceNextNo: number;
  voucherPrefix: string;
  voucherNextNo: number;
  agencyName: string;
}
