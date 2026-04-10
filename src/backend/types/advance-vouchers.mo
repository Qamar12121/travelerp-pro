import Map "mo:core/Map";
import Common "common";
import TypesVL "vouchers-ledger-reports";

module {
  public type VoucherEntry = TypesVL.VoucherEntry;

  public type AdvanceVoucher = {
    id : Common.EntityId;
    voucherNo : Text;
    date : Common.Timestamp;
    clientId : ?Common.EntityId;
    supplierId : ?Common.EntityId;
    linkedClientId : ?Common.EntityId;
    linkedSupplierId : ?Common.EntityId;
    advanceType : ?Common.AdvanceType;
    amount : Float;
    paymentMethod : ?Common.PaymentMethod;
    remarks : ?Text;
    entries : [VoucherEntry];
    createdAt : Common.Timestamp;
    createdBy : Principal;
  };

  public type VouchersSummary = {
    totalVouchers : Nat;
    totalReceipts : Float;
    totalPayments : Float;
    totalAdvances : Float;
  };

  public type AdvanceVoucherMap = Map.Map<Common.EntityId, AdvanceVoucher>;
};
