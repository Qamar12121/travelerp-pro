import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesBI "../types/bookings-invoices";
import TypesVL "../types/vouchers-ledger-reports";
import TypesIVE "../types/invoices-vouchers-enhanced";
import Common "../types/common";
import IVELib "../lib/invoices-vouchers-enhanced";

mixin (
  accessControlState : AccessControl.AccessControlState,
  invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
  vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
  advanceVouchers : Map.Map<Common.EntityId, TypesIVE.AdvanceVoucher>,
  ledger : List.List<TypesVL.LedgerEntry>,
  appSettings : {
    var voucherNextNo : Nat;
    var voucherPrefix : Text;
  },
) {
  // --- Advance Voucher API ---

  public shared ({ caller }) func addAdvanceVoucher(
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
  ) : async Common.Result<TypesIVE.AdvanceVoucher, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    IVELib.addAdvanceVoucher(
      advanceVouchers, ledger, appSettings,
      date, clientId, supplierId, linkedClientId, linkedSupplierId,
      advanceType, amount, paymentMethod, remarks, entries, caller,
    );
  };

  public shared ({ caller }) func updateAdvanceVoucher(
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
  ) : async Common.Result<TypesIVE.AdvanceVoucher, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    IVELib.updateAdvanceVoucher(
      advanceVouchers, id,
      date, clientId, supplierId, linkedClientId, linkedSupplierId,
      advanceType, amount, paymentMethod, remarks, entries, caller,
    );
  };

  public query func getAdvanceVouchers() : async [TypesIVE.AdvanceVoucher] {
    IVELib.getAdvanceVouchers(advanceVouchers);
  };

  public query func getAdvanceVoucherById(id : Common.EntityId) : async ?TypesIVE.AdvanceVoucher {
    IVELib.getAdvanceVoucherById(advanceVouchers, id);
  };

  // --- Enhanced Invoice query API ---

  public query func getInvoicesByType(invoiceType : TypesIVE.InvoiceType) : async [TypesBI.Invoice] {
    IVELib.getInvoicesByType(invoices, invoiceType);
  };

  public query func getInvoicesSummary() : async TypesIVE.InvoicesSummary {
    IVELib.getInvoicesSummary(invoices);
  };

  // --- Enhanced Voucher summary API ---

  public query func getVouchersSummary() : async TypesIVE.VouchersSummary {
    IVELib.getVouchersSummary(vouchers, advanceVouchers);
  };
};
