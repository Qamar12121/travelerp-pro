import Common "common";
import Map "mo:core/Map";

module {
  public type HotelVoucherLine = {
    hotelName : Text;
    city : Text;
    checkIn : Common.Timestamp;
    checkOut : Common.Timestamp;
    roomType : Text;
    nights : Nat;
    ratePerNight : Float;
    totalAmount : Float;
    guestName : Text;
    confirmationNo : Text;
    supplierId : Common.EntityId;
  };

  public type HotelVoucher = {
    id : Common.EntityId;
    voucherNo : Text;
    date : Common.Timestamp;
    clientId : Common.EntityId;
    agencyId : Common.EntityId;
    agentId : ?Common.EntityId;
    remarks : ?Text;
    hotels : [HotelVoucherLine];
    totalAmount : Float;
    createdAt : Common.Timestamp;
    createdBy : Text;
  };

  public type HotelVoucherMap = Map.Map<Common.EntityId, HotelVoucher>;
};
