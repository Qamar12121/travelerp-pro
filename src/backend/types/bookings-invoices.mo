import Common "common";

module {
  public type Booking = {
    id : Common.EntityId;
    clientId : Common.EntityId;
    bookingType : Common.BookingType;
    pnr : ?Text;
    sector : ?Text;
    airline : ?Text;
    travelDate : ?Common.Timestamp;
    netFare : Float;
    saleFare : Float;
    profit : Float;
    status : Common.BookingStatus;
    invoiceId : ?Common.EntityId;
    createdAt : Common.Timestamp;
    createdBy : Principal;
  };

  public type Invoice = {
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
    refundedInvoiceId : ?Text;
    createdAt : Common.Timestamp;
  };

  public type InvoicesSummary = {
    totalInvoices : Nat;
    totalAmount : Float;
    totalPaid : Float;
    totalDue : Float;
  };
};
