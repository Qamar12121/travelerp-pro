import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import List "mo:core/List";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/hotel-vouchers";
import TypesVL "../types/vouchers-ledger-reports";
import HotelVouchersLib "../lib/hotel-vouchers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  hotelVouchers : Types.HotelVoucherMap,
  vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
  ledger : List.List<TypesVL.LedgerEntry>,
  hotelVoucherIdCounter : { var next : Nat },
  appSettings : {
    var currency : Text;
    var invoicePrefix : Text;
    var invoiceNextNo : Nat;
    var voucherPrefix : Text;
    var voucherNextNo : Nat;
    var hotelVoucherNextNo : Nat;
    var agencyName : Text;
  },
) {
  public query func getHotelVouchers(agencyId : Common.EntityId) : async [Types.HotelVoucher] {
    HotelVouchersLib.listHotelVouchers(hotelVouchers, agencyId);
  };

  public query func getHotelVoucherById(id : Common.EntityId) : async ?Types.HotelVoucher {
    HotelVouchersLib.getHotelVoucher(hotelVouchers, id);
  };

  public shared ({ caller }) func addHotelVoucher(
    clientId : Common.EntityId,
    agencyId : Common.EntityId,
    agentId : ?Common.EntityId,
    date : Common.Timestamp,
    hotels : [Types.HotelVoucherLine],
    remarks : ?Text,
  ) : async Types.HotelVoucher {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    HotelVouchersLib.createHotelVoucher(
      hotelVouchers, vouchers, ledger, appSettings,
      clientId, agencyId, agentId, date, hotels, remarks, caller,
    );
  };

  public shared ({ caller }) func updateHotelVoucher(
    id : Common.EntityId,
    clientId : Common.EntityId,
    agentId : ?Common.EntityId,
    date : Common.Timestamp,
    hotels : [Types.HotelVoucherLine],
    remarks : ?Text,
  ) : async ?Types.HotelVoucher {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    HotelVouchersLib.updateHotelVoucher(hotelVouchers, id, clientId, agentId, date, hotels, remarks);
  };

  public shared ({ caller }) func deleteHotelVoucher(id : Common.EntityId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    HotelVouchersLib.deleteHotelVoucher(hotelVouchers, id);
  };
};
