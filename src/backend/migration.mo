import Map "mo:core/Map";
import TypesBI "types/bookings-invoices";
import TypesUA "types/users-agencies";
import Common "types/common";

module {
  // ── Old types (inlined from .old/src/backend/types/) ─────────────────────

  // From .old/src/backend/types/bookings-invoices.mo — Invoice already had
  // invoiceType, taxAmount, discountAmount, notes, remarks; missing refundedInvoiceId
  type OldInvoice = {
    id : Common.EntityId;
    invoiceNo : Text;
    bookingId : Common.EntityId;
    clientId : Common.EntityId;
    amount : Float;
    paid : Float;
    due : Float;
    status : Common.InvoiceStatus;
    invoiceType : Common.InvoiceType;
    taxAmount : Float;
    discountAmount : Float;
    notes : ?Text;
    remarks : ?Text;
    createdAt : Common.Timestamp;
  };

  // From .old/src/backend/types/users-agencies.mo — Agency missing isOnboarded, phone, country, timezone
  type OldAgency = {
    id : Common.EntityId;
    ownerPrincipal : Principal;
    agencyName : Text;
    logoUrl : ?Text;
    isActive : Bool;
    createdAt : Common.Timestamp;
    totalAgents : Nat;
  };

  // ── Old settings shape (without hotelVoucherNextNo) ──────────────────────

  type OldAppSettings = {
    var currency : Text;
    var invoicePrefix : Text;
    var invoiceNextNo : Nat;
    var voucherPrefix : Text;
    var voucherNextNo : Nat;
    var agencyName : Text;
  };

  type NewAppSettings = {
    var currency : Text;
    var invoicePrefix : Text;
    var invoiceNextNo : Nat;
    var voucherPrefix : Text;
    var voucherNextNo : Nat;
    var hotelVoucherNextNo : Nat;
    var agencyName : Text;
  };

  // ── Actor state shapes ────────────────────────────────────────────────────

  type OldActor = {
    invoices : Map.Map<Common.EntityId, OldInvoice>;
    agencies : Map.Map<Common.EntityId, OldAgency>;
    appSettings : OldAppSettings;
  };

  type NewActor = {
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>;
    agencies : Map.Map<Common.EntityId, TypesUA.Agency>;
    appSettings : NewAppSettings;
  };

  // ── Migration function ────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let invoices = old.invoices.map<Common.EntityId, OldInvoice, TypesBI.Invoice>(
      func(_id, inv) {
        { inv with refundedInvoiceId = null }
      }
    );

    let agencies = old.agencies.map<Common.EntityId, OldAgency, TypesUA.Agency>(
      func(_id, ag) {
        {
          ag with
          isOnboarded = true;
          phone = null;
          country = null;
          timezone = null;
        }
      }
    );

    let appSettings : NewAppSettings = {
      var currency = old.appSettings.currency;
      var invoicePrefix = old.appSettings.invoicePrefix;
      var invoiceNextNo = old.appSettings.invoiceNextNo;
      var voucherPrefix = old.appSettings.voucherPrefix;
      var voucherNextNo = old.appSettings.voucherNextNo;
      var hotelVoucherNextNo = 1;
      var agencyName = old.appSettings.agencyName;
    };

    { invoices; agencies; appSettings };
  };
};
