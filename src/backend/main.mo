import Map "mo:core/Map";
import List "mo:core/List";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import TypesCS "types/clients-suppliers";
import TypesBI "types/bookings-invoices";
import TypesVL "types/vouchers-ledger-reports";
import TypesAV "types/advance-vouchers";
import TypesUA "types/users-agencies";
import TypesHV "types/hotel-vouchers";
import TypesN "types/notifications";
import Common "types/common";
import ClientsSuppliersMixin "mixins/clients-suppliers-api";
import BookingsInvoicesMixin "mixins/bookings-invoices-api";
import VouchersLedgerReportsMixin "mixins/vouchers-ledger-reports-api";
import LedgerSummariesMixin "mixins/ledger-summaries-api";
import SettingsMixin "mixins/settings-api";
import AdvanceVouchersMixin "mixins/advance-vouchers-api";
import UsersAgenciesMixin "mixins/users-agencies-api";
import HotelVouchersMixin "mixins/hotel-vouchers-api";
import NotificationsMixin "mixins/notifications-api";



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

  // Advance Vouchers state
  let advanceVouchers = Map.empty<Common.EntityId, TypesAV.AdvanceVoucher>();

  // Hotel Vouchers state
  let hotelVouchers = Map.empty<Common.EntityId, TypesHV.HotelVoucher>();
  let hotelVoucherIdCounter = { var next : Nat = 1 };

  // Notifications state
  let notifications = Map.empty<Common.EntityId, TypesN.InAppNotification>();
  let notificationIdCounter = { var next : Nat = 1 };

  // Users & Agencies state
  let superAdminRef = { var superAdmin : ?Principal = null };
  let agencies = Map.empty<Common.EntityId, TypesUA.Agency>();
  let agentProfiles = Map.empty<Common.EntityId, TypesUA.AgentProfile>();
  let principalToAgency = Map.empty<Principal, Common.EntityId>();
  let principalToAgent = Map.empty<Principal, Common.EntityId>();
  let agencyIdCounter = { var next : Nat = 1 };
  let activityLog = Map.empty<Common.EntityId, TypesUA.ActivityLogEntry>();
  let activityLogIdCounter = { var next : Nat = 1 };

  // Shared settings state (single mutable record proxy via separate vars)
  let appSettings = {
    var currency = "USD";
    var invoicePrefix = "INV-";
    var invoiceNextNo : Nat = 1;
    var voucherPrefix = "VCH-";
    var voucherNextNo : Nat = 1;
    var hotelVoucherNextNo : Nat = 1;
    var agencyName = "My Travel Agency";
  };

  // Mixin composition
  include ClientsSuppliersMixin(accessControlState, clients, clientIdCounter);
  include BookingsInvoicesMixin(accessControlState, bookings, invoices, vouchers, ledger, notifications, notificationIdCounter, appSettings);
  include VouchersLedgerReportsMixin(accessControlState, vouchers, ledger, bookings, invoices, clients, appSettings);
  include LedgerSummariesMixin(ledger, clients);
  include SettingsMixin(accessControlState, appSettings);
  include AdvanceVouchersMixin(accessControlState, advanceVouchers, vouchers, ledger, appSettings);
  include UsersAgenciesMixin(superAdminRef, agencies, agentProfiles, principalToAgency, principalToAgent, agencyIdCounter, activityLog, activityLogIdCounter, invoices);
  include HotelVouchersMixin(accessControlState, hotelVouchers, vouchers, ledger, hotelVoucherIdCounter, appSettings);
  include NotificationsMixin(accessControlState, notifications, notificationIdCounter);
};
