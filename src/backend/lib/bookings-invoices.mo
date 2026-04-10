import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import TypesBI "../types/bookings-invoices";
import TypesVL "../types/vouchers-ledger-reports";
import TypesN "../types/notifications";
import Common "../types/common";
import NotificationsLib "notifications";

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
      invoiceType = #booking;
      taxAmount = 0.0;
      discountAmount = 0.0;
      notes = null;
      remarks = null;
      refundedInvoiceId = null;
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

  public func getInvoicesByStatus(invoices : InvoiceMap, status : Common.InvoiceStatus) : [TypesBI.Invoice] {
    invoices.values().filter(func(inv) { inv.status == status }).toArray();
  };

  public func updateInvoice(
    invoices : InvoiceMap,
    id : Common.EntityId,
    paid : Float,
    remarks : ?Text,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (invoices.get(id)) {
      case null { #err("Invoice not found: " # id) };
      case (?existing) {
        let newPaid = if (paid < 0.0) { 0.0 } else { paid };
        let newDue = existing.amount - newPaid;
        let newStatus : Common.InvoiceStatus = if (newPaid <= 0.0) {
          #unpaid;
        } else if (newPaid >= existing.amount) {
          #paid;
        } else {
          #partial;
        };
        invoices.add(id, { existing with paid = newPaid; due = newDue; status = newStatus; remarks });
        #ok(());
      };
    };
  };

  public func deleteInvoice(
    invoices : InvoiceMap,
    bookings : BookingMap,
    id : Common.EntityId,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (invoices.get(id)) {
      case null { #err("Invoice not found: " # id) };
      case (?inv) {
        // Check if linked booking is still active
        let linkedActive = bookings.values().any(func(b) {
          b.invoiceId == ?inv.id and b.status != #cancelled
        });
        if (linkedActive) {
          return #err("Cannot delete invoice linked to an active booking. Cancel the booking first.");
        };
        invoices.remove(id);
        #ok(());
      };
    };
  };

  public func getInvoicesByType(invoices : InvoiceMap, invoiceType : Common.InvoiceType) : [TypesBI.Invoice] {
    invoices.values().filter(func(inv) { inv.invoiceType == invoiceType }).toArray();
  };

  public func getInvoicesSummary(invoices : InvoiceMap) : TypesBI.InvoicesSummary {
    var totalInvoices : Nat = 0;
    var totalAmount : Float = 0.0;
    var totalPaid : Float = 0.0;
    var totalDue : Float = 0.0;
    invoices.values().forEach(func(inv) {
      totalInvoices += 1;
      totalAmount += inv.amount;
      totalPaid += inv.paid;
      totalDue += inv.due;
    });
    { totalInvoices; totalAmount; totalPaid; totalDue };
  };

  public func createRefundInvoice(
    invoices : InvoiceMap,
    vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
    ledger : List.List<TypesVL.LedgerEntry>,
    notifications : TypesN.NotificationMap,
    settings : { var invoiceNextNo : Nat; var invoicePrefix : Text; var voucherNextNo : Nat; var voucherPrefix : Text },
    notificationIdCounter : { var next : Nat },
    agencyId : Common.EntityId,
    req : TypesN.RefundRequest,
    caller : Principal,
  ) : Common.Result<TypesBI.Invoice, Text> {
    switch (invoices.get(req.invoiceId)) {
      case null { #err("Original invoice not found: " # req.invoiceId) };
      case (?original) {
        let now = Time.now();
        let refundInvoiceNo = settings.invoicePrefix # settings.invoiceNextNo.toText();
        let refundInvoiceId = "RINV-" # now.toText();
        settings.invoiceNextNo += 1;

        // Credit note: negative amount
        let refundAmt = if (req.refundAmount > 0.0) { -req.refundAmount } else { req.refundAmount };

        let refundInvoice : TypesBI.Invoice = {
          id = refundInvoiceId;
          invoiceNo = refundInvoiceNo;
          bookingId = original.bookingId;
          clientId = original.clientId;
          amount = refundAmt;
          paid = refundAmt;
          due = 0.0;
          status = #paid;
          invoiceType = #creditNote;
          taxAmount = 0.0;
          discountAmount = 0.0;
          notes = ?("Refund: " # req.reason);
          remarks = ?req.reason;
          refundedInvoiceId = ?req.invoiceId;
          createdAt = now;
        };
        invoices.add(refundInvoiceId, refundInvoice);

        // Reversing journal voucher: debit revenue, credit client
        let jvNo = settings.voucherPrefix # settings.voucherNextNo.toText();
        let jvId = "JV-REF-" # now.toText();
        settings.voucherNextNo += 1;
        let journalVoucher : TypesVL.Voucher = {
          id = jvId;
          voucherNo = jvNo;
          voucherType = #journal;
          date = req.refundDate;
          clientId = ?original.clientId;
          supplierId = null;
          amount = req.refundAmount;
          paymentMethod = null;
          remarks = ?("Refund reversal for invoice " # req.invoiceId);
          entries = [
            {
              accountId = "revenue-account";
              accountName = "Revenue";
              debit = req.refundAmount;
              credit = 0.0;
            },
            {
              accountId = original.clientId;
              accountName = "Client Account";
              debit = 0.0;
              credit = req.refundAmount;
            },
          ];
          createdAt = now;
          createdBy = caller;
        };
        vouchers.add(jvId, journalVoucher);

        // Post reversing ledger entry (credit client to reduce their balance)
        let priorBalance = getEntityBalance(ledger, original.clientId);
        let newBalance = priorBalance - req.refundAmount;
        let ledgerEntry : TypesVL.LedgerEntry = {
          id = "LE-REF-" # refundInvoiceId;
          entityId = original.clientId;
          entityType = #client;
          date = now;
          voucherType = "CreditNote";
          voucherNo = refundInvoiceNo;
          debit = 0.0;
          credit = req.refundAmount;
          balance = newBalance;
          description = "Refund - " # req.reason;
        };
        ledger.add(ledgerEntry);

        // Auto-create refund notification
        ignore NotificationsLib.createRefundNotification(
          notifications,
          agencyId,
          req.invoiceId,
          req.refundAmount,
          notificationIdCounter,
        );

        #ok(refundInvoice);
      };
    };
  };

  public func recordInvoicePayment(
    invoices : InvoiceMap,
    ledger : List.List<TypesVL.LedgerEntry>,
    id : Common.EntityId,
    amount : Float,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (invoices.get(id)) {
      case null { #err("Invoice not found: " # id) };
      case (?existing) {
        let newPaid = existing.paid + amount;
        let newDue = existing.amount - newPaid;
        let newStatus : Common.InvoiceStatus = if (newPaid <= 0.0) {
          #unpaid;
        } else if (newPaid >= existing.amount) {
          #paid;
        } else {
          #partial;
        };
        invoices.add(id, { existing with paid = newPaid; due = newDue; status = newStatus });

        // Ledger credit entry
        let priorBalance = getEntityBalance(ledger, existing.clientId);
        let newBalance = priorBalance - amount;
        let now = Time.now();
        ledger.add({
          id = "LE-PAY-" # id # now.toText();
          entityId = existing.clientId;
          entityType = #client;
          date = now;
          voucherType = "Receipt";
          voucherNo = existing.invoiceNo;
          debit = 0.0;
          credit = amount;
          balance = newBalance;
          description = "Payment for invoice " # existing.invoiceNo;
        });
        #ok(());
      };
    };
  };

};
