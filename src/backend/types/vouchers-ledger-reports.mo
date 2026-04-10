import Common "common";

module {
  public type VoucherEntry = {
    accountId : Common.EntityId;
    accountName : Text;
    debit : Float;
    credit : Float;
  };

  public type Voucher = {
    id : Common.EntityId;
    voucherNo : Text;
    voucherType : Common.VoucherType;
    date : Common.Timestamp;
    clientId : ?Common.EntityId;
    supplierId : ?Common.EntityId;
    amount : Float;
    paymentMethod : ?Common.PaymentMethod;
    remarks : ?Text;
    entries : [VoucherEntry];
    createdAt : Common.Timestamp;
    createdBy : Principal;
  };

  public type LedgerEntry = {
    id : Common.EntityId;
    entityId : Common.EntityId;
    entityType : Common.ClientType;
    date : Common.Timestamp;
    voucherType : Text;
    voucherNo : Text;
    debit : Float;
    credit : Float;
    balance : Float;
    description : Text;
  };

  public type ProfitLossReport = {
    totalSales : Float;
    totalCost : Float;
    grossProfit : Float;
    netProfit : Float;
  };

  public type TrialBalanceEntry = {
    accountName : Text;
    debit : Float;
    credit : Float;
  };

  public type OutstandingEntry = {
    clientName : Text;
    invoiceNo : Text;
    amount : Float;
    paid : Float;
    due : Float;
  };

  public type DashboardStats = {
    totalSales : Float;
    totalProfit : Float;
    totalReceivable : Float;
    totalPayable : Float;
    todayTransactions : Nat;
  };

  public type Settings = {
    currency : Text;
    invoicePrefix : Text;
    invoiceNextNo : Nat;
    voucherPrefix : Text;
    voucherNextNo : Nat;
    hotelVoucherNextNo : Nat;
    agencyName : Text;
  };
};
