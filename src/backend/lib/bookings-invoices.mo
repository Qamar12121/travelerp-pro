import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Int "mo:core/Int";
import TypesBI "../types/bookings-invoices";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";

module {
  public type Booking = TypesBI.Booking;
  public type Invoice = TypesBI.Invoice;
  public type BookingMap = Map.Map<Common.EntityId, TypesBI.Booking>;
  public type InvoiceMap = Map.Map<Common.EntityId, TypesBI.Invoice>;

  public type AddBookingResult = Common.Result<Text, Text>;

  // Helper: get current running balance for an entity in the ledger
  func getEntityBalance(ledger : List.List<TypesVL.LedgerEntry>, entityId : Common.EntityId) : Float {
    var balance : Float = 0.0;
    ledger.forEach(func(e) {
      if (e.entityId == entityId) {
        balance := e.balance;
      };
    });
    balance;
  };

  public func addBooking(
    bookings : BookingMap,
    invoices : InvoiceMap,
    ledger : List.List<TypesVL.LedgerEntry>,
    settings : { var invoiceNextNo : Nat; var invoicePrefix : Text },
    clientId : Common.EntityId,
    bookingType : Common.BookingType,
    pnr : ?Text,
    sector : ?Text,
    airline : ?Text,
    travelDate : ?Common.Timestamp,
    netFare : Float,
    saleFare : Float,
    caller : Principal,
  ) : AddBookingResult {
    let now = Time.now();
    let bookingId = "BK" # now.toText();

    let profit = saleFare - netFare;

    // Auto-generate invoice
    let invoiceNo = settings.invoicePrefix # settings.invoiceNextNo.toText();
    let invoiceId = "INV" # now.toText();
    settings.invoiceNextNo += 1;

    let invoice : TypesBI.Invoice = {
      id = invoiceId;
      invoiceNo;
      bookingId;
      clientId;
      amount = saleFare;
      paid = 0.0;
      due = saleFare;
      status = #unpaid;
      createdAt = now;
    };
    invoices.add(invoiceId, invoice);

    // Save booking with invoiceId link
    let booking : TypesBI.Booking = {
      id = bookingId;
      clientId;
      bookingType;
      pnr;
      sector;
      airline;
      travelDate;
      netFare;
      saleFare;
      profit;
      status = #confirmed;
      invoiceId = ?invoiceId;
      createdAt = now;
      createdBy = caller;
    };
    bookings.add(bookingId, booking);

    // Auto-post ledger entry for client (debit = saleFare)
    let priorBalance = getEntityBalance(ledger, clientId);
    let newBalance = priorBalance + saleFare;
    let ledgerEntry : TypesVL.LedgerEntry = {
      id = "LE-BK-" # bookingId;
      entityId = clientId;
      entityType = #client;
      date = now;
      voucherType = "Journal";
      voucherNo = invoiceNo;
      debit = saleFare;
      credit = 0.0;
      balance = newBalance;
      description = "Booking sale - " # invoiceNo;
    };
    ledger.add(ledgerEntry);

    #ok(bookingId);
  };

  public func updateBooking(
    bookings : BookingMap,
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
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (bookings.get(id)) {
      case null { #err("Booking not found: " # id) };
      case (?existing) {
        let profit = saleFare - netFare;
        bookings.add(id, {
          existing with
          clientId;
          bookingType;
          pnr;
          sector;
          airline;
          travelDate;
          netFare;
          saleFare;
          profit;
          status;
        });
        #ok(());
      };
    };
  };

  public func getBookings(bookings : BookingMap) : [TypesBI.Booking] {
    bookings.values().toArray();
  };

  public func getBookingById(bookings : BookingMap, id : Common.EntityId) : ?TypesBI.Booking {
    bookings.get(id);
  };

  public func getInvoices(invoices : InvoiceMap) : [TypesBI.Invoice] {
    invoices.values().toArray();
  };

  public func getInvoiceById(invoices : InvoiceMap, id : Common.EntityId) : ?TypesBI.Invoice {
    invoices.get(id);
  };

  public func getInvoicesByClient(invoices : InvoiceMap, clientId : Common.EntityId) : [TypesBI.Invoice] {
    invoices.values().filter(func(inv) { inv.clientId == clientId }).toArray();
  };
};
