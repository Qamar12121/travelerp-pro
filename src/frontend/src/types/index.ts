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
  Agency,
  AgentProfile,
  AgencyStats,
  AdvanceVoucher,
  DailyLedgerSummary,
  WeeklyLedgerSummary,
  ClientLedgerSummary,
  VouchersSummary,
  InvoicesSummary,
} from "../backend";

export {
  BookingStatus,
  BookingType,
  ClientType,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  VoucherType,
  UserRole,
  AgentRole,
  AdvanceType,
} from "../backend";

// ─── UI-only helper types ────────────────────────────────────────────────────

export type AppRole =
  | "admin"
  | "accountant"
  | "agent"
  | "agency-owner"
  | "super-admin"
  | null;

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

export interface AdvanceVoucherFormData {
  date: string;
  clientId: string;
  supplierId: string;
  linkedClientId: string;
  linkedSupplierId: string;
  advanceType: string;
  amount: number;
  paymentMethod: string;
  remarks: string;
  entries: Array<{
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
  }>;
}

// ─── Hotel Voucher types ──────────────────────────────────────────────────────

export interface HotelVoucherLine {
  hotelName: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  roomType: string;
  ratePerNight: number;
  totalAmount: number;
  remarks?: string;
}

export interface HotelVoucher {
  id: string;
  voucherNo: string;
  clientId: string;
  clientName?: string;
  date: string;
  dueDate?: string;
  totalAmount: number;
  paid: number;
  due: number;
  status: "unpaid" | "partial" | "paid";
  hotels: HotelVoucherLine[];
  remarks?: string;
  createdAt: bigint;
}

export interface HotelVoucherFormData {
  clientId: string;
  date: string;
  dueDate: string;
  hotels: HotelVoucherLine[];
  remarks: string;
}

// ─── Refund Invoice types ─────────────────────────────────────────────────────

export interface RefundInvoiceFormData {
  originalInvoiceId: string;
  clientId: string;
  refundAmount: number;
  refundReason: string;
  date: string;
  paymentMethod: string;
}

// ─── Notification types ───────────────────────────────────────────────────────

export enum NotificationType {
  booking = "booking",
  payment = "payment",
  invoice = "invoice",
  voucher = "voucher",
  agent = "agent",
  system = "system",
}

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: bigint;
  entityId?: string;
  entityType?: string;
}
