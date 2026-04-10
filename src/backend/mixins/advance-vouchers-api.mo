import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesAV "../types/advance-vouchers";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";
import AVLib "../lib/advance-vouchers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  advanceVouchers : Map.Map<Common.EntityId, TypesAV.AdvanceVoucher>,
  vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
  ledger : List.List<TypesVL.LedgerEntry>,
  appSettings : {
    var voucherNextNo : Nat;
    var voucherPrefix : Text;
  },
) {
  public shared ({ caller }) func addAdvanceVoucher(
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?Common.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesVL.VoucherEntry],
  ) : async Common.Result<TypesAV.AdvanceVoucher, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    AVLib.addAdvanceVoucher(advanceVouchers, ledger, appSettings, date, clientId, supplierId, linkedClientId, linkedSupplierId, advanceType, amount, paymentMethod, remarks, entries, caller);
  };

  public shared ({ caller }) func updateAdvanceVoucher(
    id : Common.EntityId,
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?Common.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesVL.VoucherEntry],
  ) : async Common.Result<TypesAV.AdvanceVoucher, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    AVLib.updateAdvanceVoucher(advanceVouchers, id, date, clientId, supplierId, linkedClientId, linkedSupplierId, advanceType, amount, paymentMethod, remarks, entries, caller);
  };

  public shared ({ caller }) func deleteAdvanceVoucher(
    id : Common.EntityId,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    AVLib.deleteAdvanceVoucher(advanceVouchers, id);
  };

  public query func getAdvanceVouchers() : async [TypesAV.AdvanceVoucher] {
    AVLib.getAdvanceVouchers(advanceVouchers);
  };

  public query func getAdvanceVoucherById(id : Common.EntityId) : async ?TypesAV.AdvanceVoucher {
    AVLib.getAdvanceVoucherById(advanceVouchers, id);
  };

  public query func getVouchersSummary() : async TypesAV.VouchersSummary {
    AVLib.getVouchersSummary(vouchers, advanceVouchers);
  };
};
