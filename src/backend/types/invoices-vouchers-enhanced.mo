import Common "common";

module {
  // Enhanced invoice type classification
  public type InvoiceType = {
    #booking;
    #manual;
    #proforma;
    #creditNote;
    #debitNote;
  };

  // Enhanced Invoice — superset of the original Invoice with additional fields
  public type InvoiceEnhanced = {
    id : Common.EntityId;
    invoiceNo : Text;
    bookingId : Common.EntityId;
    clientId : Common.EntityId;
    amount : Float;
    paid : Float;
    due : Float;
    status : Common.InvoiceStatus;
    invoiceType : InvoiceType;
    taxAmount : Float;
    discountAmount : Float;
    notes : ?Text;
    remarks : ?Text;
    createdAt : Common.Timestamp;
  };

  // Advance / Deposit voucher type identifier
  // (VoucherType #advance is added to common.mo)
  public type AdvanceType = { #received; #paid };

  // Advance Voucher — same shape as Voucher but with advance-specific fields
  public type AdvanceVoucher = {
    id : Common.EntityId;
    voucherNo : Text;
    // voucherType is always #advance (from Common.VoucherType after extension)
    date : Common.Timestamp;
    clientId : ?Common.EntityId;
    supplierId : ?Common.EntityId;
    linkedClientId : ?Common.EntityId;
    linkedSupplierId : ?Common.EntityId;
    advanceType : ?AdvanceType;
    amount : Float;
    paymentMethod : ?Common.PaymentMethod;
    remarks : ?Text;
    entries : [AdvanceVoucherEntry];
    createdAt : Common.Timestamp;
    createdBy : Principal;
  };

  public type AdvanceVoucherEntry = {
    accountId : Common.EntityId;
    accountName : Text;
    debit : Float;
    credit : Float;
  };

  // Summary types for new query APIs
  public type InvoicesSummary = {
    totalInvoices : Nat;
    totalAmount : Float;
    totalPaid : Float;
    totalDue : Float;
  };

  public type VouchersSummary = {
    totalVouchers : Nat;
    totalReceipts : Float;
    totalPayments : Float;
    totalAdvances : Float;
  };
};
