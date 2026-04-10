import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesBI "../types/bookings-invoices";
import TypesCS "../types/clients-suppliers";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";
import VLLib "../lib/vouchers-ledger-reports";

mixin (
  accessControlState : AccessControl.AccessControlState,
  vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
  ledger : List.List<TypesVL.LedgerEntry>,
  bookings : Map.Map<Common.EntityId, TypesBI.Booking>,
  invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
  clients : Map.Map<Common.EntityId, TypesCS.Client>,
  appSettings : {
    var voucherNextNo : Nat;
    var voucherPrefix : Text;
  },
) {
  public shared ({ caller }) func addReceiptVoucher(
    date : Common.Timestamp,
    clientId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.addReceiptVoucher(vouchers, ledger, invoices, appSettings, date, clientId, amount, paymentMethod, remarks, caller);
  };

  public shared ({ caller }) func addPaymentVoucher(
    date : Common.Timestamp,
    supplierId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.addPaymentVoucher(vouchers, ledger, appSettings, date, supplierId, amount, paymentMethod, remarks, caller);
  };

  public shared ({ caller }) func addJournalVoucher(
    date : Common.Timestamp,
    entries : [TypesVL.VoucherEntry],
    remarks : ?Text,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.addJournalVoucher(vouchers, ledger, appSettings, date, entries, remarks, caller);
  };

  public shared ({ caller }) func addContraVoucher(
    date : Common.Timestamp,
    fromAccount : Text,
    toAccount : Text,
    amount : Float,
    remarks : ?Text,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.addContraVoucher(vouchers, ledger, appSettings, date, fromAccount, toAccount, amount, remarks, caller);
  };

  public query func getVouchers() : async [TypesVL.Voucher] {
    VLLib.getVouchers(vouchers);
  };

  public query func getVoucherById(id : Common.EntityId) : async ?TypesVL.Voucher {
    VLLib.getVoucherById(vouchers, id);
  };

  public query func getVouchersByType(voucherType : Common.VoucherType) : async [TypesVL.Voucher] {
    VLLib.getVouchersByType(vouchers, voucherType);
  };

  public shared ({ caller }) func updateReceiptVoucher(
    id : Common.EntityId,
    date : Common.Timestamp,
    clientId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.updateReceiptVoucher(vouchers, id, date, clientId, amount, paymentMethod, remarks, caller);
  };

  public shared ({ caller }) func updatePaymentVoucher(
    id : Common.EntityId,
    date : Common.Timestamp,
    supplierId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.updatePaymentVoucher(vouchers, id, date, supplierId, amount, paymentMethod, remarks, caller);
  };

  public shared ({ caller }) func updateJournalVoucher(
    id : Common.EntityId,
    date : Common.Timestamp,
    entries : [TypesVL.VoucherEntry],
    remarks : ?Text,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.updateJournalVoucher(vouchers, id, date, entries, remarks, caller);
  };

  public shared ({ caller }) func updateContraVoucher(
    id : Common.EntityId,
    date : Common.Timestamp,
    fromAccount : Text,
    toAccount : Text,
    amount : Float,
    remarks : ?Text,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.updateContraVoucher(vouchers, id, date, fromAccount, toAccount, amount, remarks, caller);
  };

  public shared ({ caller }) func deleteVoucher(
    id : Common.EntityId,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    VLLib.deleteVoucher(vouchers, id, caller);
  };

  public query func getLedgerByEntity(entityId : Common.EntityId) : async [TypesVL.LedgerEntry] {
    VLLib.getLedgerByEntity(ledger, entityId);
  };

  public query func getRunningBalance(entityId : Common.EntityId) : async Float {
    VLLib.getRunningBalance(ledger, entityId);
  };

  public query func getProfitLossReport() : async TypesVL.ProfitLossReport {
    VLLib.getProfitLossReport(bookings);
  };

  public query func getTrialBalance() : async [TypesVL.TrialBalanceEntry] {
    VLLib.getTrialBalance(vouchers, ledger);
  };

  public query func getOutstandingReport() : async [TypesVL.OutstandingEntry] {
    VLLib.getOutstandingReport(invoices, clients);
  };

  public query func getDashboardStats() : async TypesVL.DashboardStats {
    VLLib.getDashboardStats(bookings, invoices, ledger, vouchers);
  };
};
