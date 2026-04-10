import Map "mo:core/Map";
import List "mo:core/List";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import TypesCS "types/clients-suppliers";
import TypesBI "types/bookings-invoices";
import TypesVL "types/vouchers-ledger-reports";
import Common "types/common";
import ClientsSuppliersMixin "mixins/clients-suppliers-api";
import BookingsInvoicesMixin "mixins/bookings-invoices-api";
import VouchersLedgerReportsMixin "mixins/vouchers-ledger-reports-api";
import SettingsMixin "mixins/settings-api";

actor {
  // Authorization state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Clients & Suppliers state
  let clients = Map.empty<Common.EntityId, TypesCS.Client>();
  let clientIdCounter = { var next : Nat = 1 };

  // Bookings & Invoices state
  let bookings = Map.empty<Common.EntityId, TypesBI.Booking>();
  let invoices = Map.empty<Common.EntityId, TypesBI.Invoice>();

  // Vouchers & Ledger state
  let vouchers = Map.empty<Common.EntityId, TypesVL.Voucher>();
  let ledger = List.empty<TypesVL.LedgerEntry>();

  // Shared settings state (single mutable record proxy via separate vars)
  let appSettings = {
    var currency = "USD";
    var invoicePrefix = "INV-";
    var invoiceNextNo : Nat = 1;
    var voucherPrefix = "VCH-";
    var voucherNextNo : Nat = 1;
    var agencyName = "My Travel Agency";
  };

  // Mixin composition
  include ClientsSuppliersMixin(accessControlState, clients, clientIdCounter);
  include BookingsInvoicesMixin(accessControlState, bookings, invoices, ledger, appSettings);
  include VouchersLedgerReportsMixin(accessControlState, vouchers, ledger, bookings, invoices, clients, appSettings);
  include SettingsMixin(accessControlState, appSettings);
};
