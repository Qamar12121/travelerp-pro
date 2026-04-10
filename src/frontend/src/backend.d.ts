import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type Result_2 = {
    __kind__: "ok";
    ok: AdvanceVoucher;
} | {
    __kind__: "err";
    err: string;
};
export interface RefundRequest {
    refundAmount: number;
    invoiceId: EntityId;
    refundDate: Timestamp;
    reason: string;
}
export type EntityId = string;
export interface ProfitLossReport {
    grossProfit: number;
    totalCost: number;
    totalSales: number;
    netProfit: number;
}
export type Result_5 = {
    __kind__: "ok";
    ok: Array<Agency>;
} | {
    __kind__: "err";
    err: string;
};
export interface HotelVoucher {
    id: EntityId;
    clientId: EntityId;
    date: Timestamp;
    createdAt: Timestamp;
    createdBy: string;
    agentId?: EntityId;
    agencyId: EntityId;
    totalAmount: number;
    voucherNo: string;
    hotels: Array<HotelVoucherLine>;
    remarks?: string;
}
export interface VouchersSummary {
    totalReceipts: number;
    totalPayments: number;
    totalAdvances: number;
    totalVouchers: bigint;
}
export type Result_1 = {
    __kind__: "ok";
    ok: Agency;
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
export type Result_4 = {
    __kind__: "ok";
    ok: Array<AgentProfile>;
} | {
    __kind__: "err";
    err: string;
};
export interface TrialBalanceEntry {
    credit: number;
    accountName: string;
    debit: number;
}
export interface DailyLedgerSummary {
    totalCredit: number;
    date: string;
    netBalance: number;
    totalDebit: number;
}
export interface AgencyStats {
    totalBookings: bigint;
    totalProfit: number;
    activeAgents: bigint;
    totalRevenue: number;
    lastActivityAt?: Timestamp;
}
export interface ClientLedgerSummary {
    totalCredit: number;
    closingBalance: number;
    entityId: EntityId;
    openingBalance: number;
    entityName: string;
    totalDebit: number;
}
export interface WeeklyLedgerSummary {
    endDate: string;
    totalCredit: number;
    netBalance: number;
    weekLabel: string;
    totalDebit: number;
    startDate: string;
}
export type Result_7 = {
    __kind__: "ok";
    ok: Array<ActivityLogEntry>;
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
export interface PlatformStats {
    refundRate: number;
    activeAgencies: bigint;
    totalAgencies: bigint;
    totalRefunds: number;
    totalRevenue: number;
}
export interface Agency {
    id: EntityId;
    timezone?: string;
    country?: string;
    totalAgents: bigint;
    ownerPrincipal: Principal;
    createdAt: Timestamp;
    isOnboarded: boolean;
    isActive: boolean;
    logoUrl?: string;
    agencyName: string;
    phone?: string;
}
export interface VoucherEntry {
    accountId: EntityId;
    credit: number;
    accountName: string;
    debit: number;
}
export interface OutstandingEntry {
    due: number;
    clientName: string;
    paid: number;
    invoiceNo: string;
    amount: number;
}
export type Result_6 = {
    __kind__: "ok";
    ok: AgencyStats;
} | {
    __kind__: "err";
    err: string;
};
export interface InAppNotification {
    id: EntityId;
    title: string;
    notificationType: NotificationType;
    createdAt: Timestamp;
    agencyId: EntityId;
    isRead: boolean;
    message: string;
    relatedId?: string;
}
export interface AdvanceVoucher {
    id: EntityId;
    linkedClientId?: EntityId;
    clientId?: EntityId;
    linkedSupplierId?: EntityId;
    paymentMethod?: PaymentMethod;
    date: Timestamp;
    createdAt: Timestamp;
    createdBy: Principal;
    entries: Array<VoucherEntry>;
    advanceType?: AdvanceType;
    voucherNo: string;
    amount: number;
    supplierId?: EntityId;
    remarks?: string;
}
export interface Invoice {
    id: EntityId;
    due: number;
    status: InvoiceStatus;
    clientId: EntityId;
    bookingId: EntityId;
    discountAmount: number;
    createdAt: Timestamp;
    paid: number;
    invoiceNo: string;
    invoiceType: InvoiceType;
    notes?: string;
    taxAmount: number;
    amount: number;
    refundedInvoiceId?: string;
    remarks?: string;
}
export type Result_9 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface DashboardStats {
    todayTransactions: bigint;
    totalReceivable: number;
    totalProfit: number;
    totalSales: number;
    totalPayable: number;
}
export interface ActivityLogEntry {
    id: EntityId;
    description: string;
    agencyId: EntityId;
    actorId?: string;
    timestamp: Timestamp;
    eventType: string;
}
export interface Settings {
    hotelVoucherNextNo: bigint;
    invoiceNextNo: bigint;
    voucherNextNo: bigint;
    invoicePrefix: string;
    voucherPrefix: string;
    currency: string;
    agencyName: string;
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
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type Result_3 = {
    __kind__: "ok";
    ok: PlatformStats;
} | {
    __kind__: "err";
    err: string;
};
export type Result_10 = {
    __kind__: "ok";
    ok: AgentProfile;
} | {
    __kind__: "err";
    err: string;
};
export type Result_8 = {
    __kind__: "ok";
    ok: Invoice;
} | {
    __kind__: "err";
    err: string;
};
export interface HotelVoucherLine {
    checkIn: Timestamp;
    hotelName: string;
    confirmationNo: string;
    city: string;
    guestName: string;
    ratePerNight: number;
    totalAmount: number;
    checkOut: Timestamp;
    nights: bigint;
    roomType: string;
    supplierId: EntityId;
}
export interface InvoicesSummary {
    totalPaid: number;
    totalDue: number;
    totalAmount: number;
    totalInvoices: bigint;
}
export interface AgentProfile {
    id: EntityId;
    principal?: Principal;
    name: string;
    createdAt: Timestamp;
    createdBy: Principal;
    role: AgentRole;
    agencyId: EntityId;
    isActive: boolean;
    email: string;
}
export enum AdvanceType {
    paid = "paid",
    received = "received"
}
export enum AgentRole {
    agent = "agent",
    owner = "owner"
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
export enum InvoiceType {
    creditNote = "creditNote",
    booking = "booking",
    manual = "manual",
    debitNote = "debitNote",
    proforma = "proforma"
}
export enum NotificationType {
    refundCreated = "refundCreated",
    systemAlert = "systemAlert",
    invoiceOverdue = "invoiceOverdue",
    bookingConfirmed = "bookingConfirmed",
    paymentReceived = "paymentReceived"
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
    addAdvanceVoucher(date: Timestamp, clientId: EntityId | null, supplierId: EntityId | null, linkedClientId: EntityId | null, linkedSupplierId: EntityId | null, advanceType: AdvanceType | null, amount: number, paymentMethod: PaymentMethod | null, remarks: string | null, entries: Array<VoucherEntry>): Promise<Result_2>;
    addAgent(name: string, email: string): Promise<Result_10>;
    addBooking(clientId: EntityId, bookingType: BookingType, pnr: string | null, sector: string | null, airline: string | null, travelDate: Timestamp | null, netFare: number, saleFare: number): Promise<Result_9>;
    addClient(name: string, phone: string, email: string | null, openingBalance: number, clientType: ClientType): Promise<Result_9>;
    addContraVoucher(date: Timestamp, fromAccount: string, toAccount: string, amount: number, remarks: string | null): Promise<Result_9>;
    addHotelVoucher(clientId: EntityId, agencyId: EntityId, agentId: EntityId | null, date: Timestamp, hotels: Array<HotelVoucherLine>, remarks: string | null): Promise<HotelVoucher>;
    addJournalVoucher(date: Timestamp, entries: Array<VoucherEntry>, remarks: string | null): Promise<Result_9>;
    addPaymentVoucher(date: Timestamp, supplierId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result_9>;
    addReceiptVoucher(date: Timestamp, clientId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result_9>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completeOnboarding(phone: string | null, country: string | null, timezone: string | null): Promise<Result_1>;
    createAgency(agencyName: string): Promise<Result_1>;
    createRefundInvoice(agencyId: EntityId, req: RefundRequest): Promise<Result_8>;
    deleteAdvanceVoucher(id: EntityId): Promise<Result>;
    deleteBooking(id: EntityId): Promise<Result>;
    deleteClient(id: EntityId): Promise<Result>;
    deleteHotelVoucher(id: EntityId): Promise<boolean>;
    deleteInvoice(id: EntityId): Promise<Result>;
    deleteNotification(id: EntityId): Promise<boolean>;
    deleteVoucher(id: EntityId): Promise<Result>;
    getAdvanceVoucherById(id: EntityId): Promise<AdvanceVoucher | null>;
    getAdvanceVouchers(): Promise<Array<AdvanceVoucher>>;
    getAgencyActivityLog(agencyId: EntityId): Promise<Result_7>;
    getAgencyStats(agencyId: EntityId): Promise<Result_6>;
    getAgentProfile(): Promise<AgentProfile | null>;
    getAllAgencies(): Promise<Result_5>;
    getBookingById(id: EntityId): Promise<Booking | null>;
    getBookings(): Promise<Array<Booking>>;
    getCallerUserRole(): Promise<UserRole>;
    getClientById(id: EntityId): Promise<Client | null>;
    getClientLedgerSummaries(): Promise<Array<ClientLedgerSummary>>;
    getClients(): Promise<Array<Client>>;
    getDailyLedgerSummary(startDate: Timestamp, endDate: Timestamp): Promise<Array<DailyLedgerSummary>>;
    getDashboardStats(): Promise<DashboardStats>;
    getHotelVoucherById(id: EntityId): Promise<HotelVoucher | null>;
    getHotelVouchers(agencyId: EntityId): Promise<Array<HotelVoucher>>;
    getInvoiceById(id: EntityId): Promise<Invoice | null>;
    getInvoices(): Promise<Array<Invoice>>;
    getInvoicesByClient(clientId: EntityId): Promise<Array<Invoice>>;
    getInvoicesByStatus(status: InvoiceStatus): Promise<Array<Invoice>>;
    getInvoicesByType(invoiceType: InvoiceType): Promise<Array<Invoice>>;
    getInvoicesSummary(): Promise<InvoicesSummary>;
    getLedgerByEntity(entityId: EntityId): Promise<Array<LedgerEntry>>;
    getMyAgency(): Promise<Agency | null>;
    getMyAgents(): Promise<Result_4>;
    getNotifications(agencyId: EntityId): Promise<Array<InAppNotification>>;
    getOutstandingReport(): Promise<Array<OutstandingEntry>>;
    getPlatformStats(): Promise<Result_3>;
    getProfitLossReport(): Promise<ProfitLossReport>;
    getRunningBalance(entityId: EntityId): Promise<number>;
    getSettings(): Promise<Settings>;
    getSuppliers(): Promise<Array<Client>>;
    getTrialBalance(): Promise<Array<TrialBalanceEntry>>;
    getUnreadNotificationCount(agencyId: EntityId): Promise<bigint>;
    getVoucherById(id: EntityId): Promise<Voucher | null>;
    getVouchers(): Promise<Array<Voucher>>;
    getVouchersByType(voucherType: VoucherType): Promise<Array<Voucher>>;
    getVouchersSummary(): Promise<VouchersSummary>;
    getWeeklyLedgerSummary(startDate: Timestamp, endDate: Timestamp): Promise<Array<WeeklyLedgerSummary>>;
    isCallerAdmin(): Promise<boolean>;
    isSuperAdmin(): Promise<boolean>;
    linkMyAgentPrincipal(agentId: EntityId, agentPrincipal: Principal): Promise<Result>;
    markAllNotificationsRead(agencyId: EntityId): Promise<bigint>;
    markNotificationRead(id: EntityId): Promise<boolean>;
    recordInvoicePayment(id: EntityId, amount: number): Promise<Result>;
    removeAgent(agentId: EntityId): Promise<Result>;
    setSuperAdminPrincipal(): Promise<Result>;
    toggleAgentAccess(agentId: EntityId, isActive: boolean): Promise<Result>;
    updateAdvanceVoucher(id: EntityId, date: Timestamp, clientId: EntityId | null, supplierId: EntityId | null, linkedClientId: EntityId | null, linkedSupplierId: EntityId | null, advanceType: AdvanceType | null, amount: number, paymentMethod: PaymentMethod | null, remarks: string | null, entries: Array<VoucherEntry>): Promise<Result_2>;
    updateAgencyProfile(newName: string | null, newLogoUrl: string | null): Promise<Result_1>;
    updateAgencyStatus(agencyId: EntityId, isActive: boolean): Promise<Result>;
    updateBooking(id: EntityId, clientId: EntityId, bookingType: BookingType, pnr: string | null, sector: string | null, airline: string | null, travelDate: Timestamp | null, netFare: number, saleFare: number, status: BookingStatus): Promise<Result>;
    updateClient(id: EntityId, name: string, phone: string, email: string | null, openingBalance: number): Promise<Result>;
    updateContraVoucher(id: EntityId, date: Timestamp, fromAccount: string, toAccount: string, amount: number, remarks: string | null): Promise<Result>;
    updateHotelVoucher(id: EntityId, clientId: EntityId, agentId: EntityId | null, date: Timestamp, hotels: Array<HotelVoucherLine>, remarks: string | null): Promise<HotelVoucher | null>;
    updateInvoice(id: EntityId, paid: number, remarks: string | null): Promise<Result>;
    updateJournalVoucher(id: EntityId, date: Timestamp, entries: Array<VoucherEntry>, remarks: string | null): Promise<Result>;
    updatePaymentVoucher(id: EntityId, date: Timestamp, supplierId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result>;
    updateReceiptVoucher(id: EntityId, date: Timestamp, clientId: EntityId, amount: number, paymentMethod: PaymentMethod, remarks: string | null): Promise<Result>;
    updateSettings(currency: string, invoicePrefix: string, invoiceNextNo: bigint, voucherPrefix: string, voucherNextNo: bigint, agencyName: string): Promise<Result>;
}
