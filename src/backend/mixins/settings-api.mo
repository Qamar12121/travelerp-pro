import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";

mixin (
  accessControlState : AccessControl.AccessControlState,
  appSettings : {
    var currency : Text;
    var invoicePrefix : Text;
    var invoiceNextNo : Nat;
    var voucherPrefix : Text;
    var voucherNextNo : Nat;
    var agencyName : Text;
  },
) {
  public query func getSettings() : async TypesVL.Settings {
    {
      currency = appSettings.currency;
      invoicePrefix = appSettings.invoicePrefix;
      invoiceNextNo = appSettings.invoiceNextNo;
      voucherPrefix = appSettings.voucherPrefix;
      voucherNextNo = appSettings.voucherNextNo;
      agencyName = appSettings.agencyName;
    };
  };

  public shared ({ caller }) func updateSettings(
    currency : Text,
    invoicePrefix : Text,
    invoiceNextNo : Nat,
    voucherPrefix : Text,
    voucherNextNo : Nat,
    agencyName : Text,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update settings");
    };
    appSettings.currency := currency;
    appSettings.invoicePrefix := invoicePrefix;
    appSettings.invoiceNextNo := invoiceNextNo;
    appSettings.voucherPrefix := voucherPrefix;
    appSettings.voucherNextNo := voucherNextNo;
    appSettings.agencyName := agencyName;
    #ok(());
  };
};
