import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface VoucherEntry {
    accountId: EntityId;
    credit: number;
    accountName: string;
    debit: number;
}
export type Timestamp = bigint;
export interface OutstandingEntry {
    due: number;
    clientName: string;
    paid: number;
    invoiceNo: string;
    amount: number;
}
export type EntityId = string;
export interface ProfitLossReport {
    grossProfit: number;
    totalCost: number;
    totalSales: number;
    netProfit: number;
}
export interface Invoice {
    id: EntityId;
    due: number;
    status: InvoiceStatus;
    clientId: EntityId;
    bookingId: EntityId;
    createdAt: Timestamp;
    paid: number;
    invoiceNo: string;
    amount: number;
}
export type Result_1 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface LedgerEntry {
    id: EntityId;
    balance: number;
    date: Timestamp;
    description: string;
    voucherType: string;
    credit: number;
    entityId: EntityId;
    entityType: ClientType;
    voucherNo: string;
    debit: number;
}
export interface DashboardStats {
    todayTransactions: bigint;
    totalReceivable: number;
    totalProfit: number;
    totalSales: number;
    totalPayable: number;
}
export interface TrialBalanceEntry {
    credit: number;
    accountName: string;
    debit: number;
}
export interface Voucher {
    id: EntityId;
    clientId?: EntityId;
    paymentMethod?: PaymentMethod;
    date: Timestamp;
    createdAt: Timestamp;
    createdBy: Principal;
    voucherType: VoucherType;
    entries: Array<VoucherEntry>;
    voucherNo: string;
    amount: number;
    supplierId?: EntityId;
    remarks?: string;
}
export interface Settings {
    invoiceNextNo: bigint;
    voucherNextNo: bigint;
    invoicePrefix: string;
    voucherPrefix: string;
    currency: string;
    agencyName: string;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface Booking {
    id: EntityId;
    pnr?: string;
    status: BookingStatus;
    clientId: EntityId;
    netFare: number;
    createdAt: Timestamp;
    createdBy: Principal;
    invoiceId?: EntityId;
    sector?: string;
    bookingType: BookingType;
    travelDate?: Timestamp;
    airline?: string;
    profit: number;
    saleFare: number;
}
export interface Client {
    id: EntityId;
    clientType: ClientType;
    name: string;
    createdAt: Timestamp;
    email?: string;
    openingBalance: number;
    phone: string;
}
export enum BookingStatus {
    cancelled = "cancelled",
    pending = "pending",
    confirmed = "confirmed"
}
export enum BookingType {
    ticket = "ticket",
    tour = "tour",
    visa = "visa",
    umrah = "umrah"
}
export enum ClientType {
    client = "client",
    supplier = "supplier"
}
export enum InvoiceStatus {
    paid = "paid",
    unpaid = "unpaid",
    partial = "partial"
}
export enum PaymentMethod {
    bank = "bank",
    cash = "cash"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum VoucherType {
    receipt = "receipt",
    journal = "journal",
    contra = "contra",
    payment = "payment"
}
export interface backendInterface {
    addBooking(clientId: EntityId, bookingType: BookingType, pnr: string | null, sector: string | null, airline: string | null, travelDate: Timestamp | null, netFare: number, saleFare: number): Promise<Result_1>;
    addClient(name: string, phone: string, email: string | null, openingBalance: number, clientType: ClientType): Promise<Result_1>;
    addContraVoucher(date: Timestamp, fromAccount: string, toAccount: string, amount: number, remarks: string | null): Promise<Result_1>;
    addJournalVoucher(date: Timestamp, entries: Array<VoucherEntry>, remarks: string | null): Promise<Result_1>;
    addPaymentVoucher(date: Timestamp, supplierId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result_1>;
    addReceiptVoucher(date: Timestamp, clientId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result_1>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteClient(id: EntityId): Promise<Result>;
    getBookingById(id: EntityId): Promise<Booking | null>;
    getBookings(): Promise<Array<Booking>>;
    getCallerUserRole(): Promise<UserRole>;
    getClientById(id: EntityId): Promise<Client | null>;
    getClients(): Promise<Array<Client>>;
    getDashboardStats(): Promise<DashboardStats>;
    getInvoiceById(id: EntityId): Promise<Invoice | null>;
    getInvoices(): Promise<Array<Invoice>>;
    getInvoicesByClient(clientId: EntityId): Promise<Array<Invoice>>;
    getLedgerByEntity(entityId: EntityId): Promise<Array<LedgerEntry>>;
    getOutstandingReport(): Promise<Array<OutstandingEntry>>;
    getProfitLossReport(): Promise<ProfitLossReport>;
    getRunningBalance(entityId: EntityId): Promise<number>;
    getSettings(): Promise<Settings>;
    getSuppliers(): Promise<Array<Client>>;
    getTrialBalance(): Promise<Array<TrialBalanceEntry>>;
    getVouchers(): Promise<Array<Voucher>>;
    getVouchersByType(voucherType: VoucherType): Promise<Array<Voucher>>;
    isCallerAdmin(): Promise<boolean>;
    updateBooking(id: EntityId, clientId: EntityId, bookingType: BookingType, pnr: string | null, sector: string | null, airline: string | null, travelDate: Timestamp | null, netFare: number, saleFare: number, status: BookingStatus): Promise<Result>;
    updateClient(id: EntityId, name: string, phone: string, email: string | null, openingBalance: number): Promise<Result>;
    updateSettings(currency: string, invoicePrefix: string, invoiceNextNo: bigint, voucherPrefix: string, voucherNextNo: bigint, agencyName: string): Promise<Result>;
}
