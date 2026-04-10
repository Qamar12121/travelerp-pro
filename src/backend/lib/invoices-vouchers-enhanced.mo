import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import TypesBI "../types/bookings-invoices";
import TypesVL "../types/vouchers-ledger-reports";
import TypesIVE "../types/invoices-vouchers-enhanced";
import Common "../types/common";

module {
  public type AdvanceVoucherMap = Map.Map<Common.EntityId, TypesIVE.AdvanceVoucher>;
  public type InvoiceMap = Map.Map<Common.EntityId, TypesBI.Invoice>;
  public type VoucherMap = Map.Map<Common.EntityId, TypesVL.Voucher>;

  // --- Advance Voucher ---

  public func addAdvanceVoucher(
    advanceVouchers : AdvanceVoucherMap,
    ledger : List.List<TypesVL.LedgerEntry>,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?TypesIVE.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesIVE.AdvanceVoucherEntry],
    caller : Principal,
  ) : Common.Result<TypesIVE.AdvanceVoucher, Text> {
    Runtime.trap("not implemented");
  };

  public func updateAdvanceVoucher(
    advanceVouchers : AdvanceVoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?TypesIVE.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesIVE.AdvanceVoucherEntry],
    caller : Principal,
  ) : Common.Result<TypesIVE.AdvanceVoucher, Text> {
    Runtime.trap("not implemented");
  };

  public func getAdvanceVouchers(advanceVouchers : AdvanceVoucherMap) : [TypesIVE.AdvanceVoucher] {
    Runtime.trap("not implemented");
  };

  public func getAdvanceVoucherById(
    advanceVouchers : AdvanceVoucherMap,
    id : Common.EntityId,
  ) : ?TypesIVE.AdvanceVoucher {
    Runtime.trap("not implemented");
  };

  // --- Enhanced Invoice queries ---

  public func getInvoicesByType(
    invoices : InvoiceMap,
    invoiceType : TypesIVE.InvoiceType,
  ) : [TypesBI.Invoice] {
    Runtime.trap("not implemented");
  };

  public func getInvoicesSummary(invoices : InvoiceMap) : TypesIVE.InvoicesSummary {
    Runtime.trap("not implemented");
  };

  // --- Enhanced Voucher summary ---

  public func getVouchersSummary(
    vouchers : VoucherMap,
    advanceVouchers : AdvanceVoucherMap,
  ) : TypesIVE.VouchersSummary {
    Runtime.trap("not implemented");
  };
};
