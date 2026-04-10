import Map "mo:core/Map";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesBI "../types/bookings-invoices";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";
import BILib "../lib/bookings-invoices";

mixin (
  accessControlState : AccessControl.AccessControlState,
  bookings : Map.Map<Common.EntityId, TypesBI.Booking>,
  invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
  ledger : List.List<TypesVL.LedgerEntry>,
  appSettings : {
    var invoiceNextNo : Nat;
    var invoicePrefix : Text;
    var voucherNextNo : Nat;
    var voucherPrefix : Text;
  },
) {
  public shared ({ caller }) func addBooking(
    clientId : Common.EntityId,
    bookingType : Common.BookingType,
    pnr : ?Text,
    sector : ?Text,
    airline : ?Text,
    travelDate : ?Common.Timestamp,
    netFare : Float,
    saleFare : Float,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    BILib.addBooking(bookings, invoices, ledger, appSettings, clientId, bookingType, pnr, sector, airline, travelDate, netFare, saleFare, caller);
  };

  public shared ({ caller }) func updateBooking(
    id : Common.EntityId,
    clientId : Common.EntityId,
    bookingType : Common.BookingType,
    pnr : ?Text,
    sector : ?Text,
    airline : ?Text,
    travelDate : ?Common.Timestamp,
    netFare : Float,
    saleFare : Float,
    status : Common.BookingStatus,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    BILib.updateBooking(bookings, id, clientId, bookingType, pnr, sector, airline, travelDate, netFare, saleFare, status, caller);
  };

  public query func getBookings() : async [TypesBI.Booking] {
    BILib.getBookings(bookings);
  };

  public query func getBookingById(id : Common.EntityId) : async ?TypesBI.Booking {
    BILib.getBookingById(bookings, id);
  };

  public query func getInvoices() : async [TypesBI.Invoice] {
    BILib.getInvoices(invoices);
  };

  public query func getInvoiceById(id : Common.EntityId) : async ?TypesBI.Invoice {
    BILib.getInvoiceById(invoices, id);
  };

  public query func getInvoicesByClient(clientId : Common.EntityId) : async [TypesBI.Invoice] {
    BILib.getInvoicesByClient(invoices, clientId);
  };
};
