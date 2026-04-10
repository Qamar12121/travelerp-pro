import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Int "mo:core/Int";
import TypesVL "../types/vouchers-ledger-reports";
import TypesBI "../types/bookings-invoices";
import TypesCS "../types/clients-suppliers";
import Common "../types/common";

module {
  public type Voucher = TypesVL.Voucher;
  public type LedgerEntry = TypesVL.LedgerEntry;
  public type VoucherMap = Map.Map<Common.EntityId, TypesVL.Voucher>;
  public type LedgerList = List.List<TypesVL.LedgerEntry>;

  // Get last running balance for an entity in the ledger
  func getEntityBalance(ledger : LedgerList, entityId : Common.EntityId) : Float {
    var balance : Float = 0.0;
    ledger.forEach(func(e) {
      if (e.entityId == entityId) {
        balance := e.balance;
      };
    });
    balance;
  };

  // Generate next voucher number
  func nextVoucherNo(settings : { var voucherNextNo : Nat; var voucherPrefix : Text }) : Text {
    let no = settings.voucherPrefix # settings.voucherNextNo.toText();
    settings.voucherNextNo += 1;
    no;
  };

  // Update invoices for a client after receipt — apply payment to oldest unpaid first
  func applyPaymentToInvoices(
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
    clientId : Common.EntityId,
    amount : Float,
  ) {
    // Collect unpaid/partial invoices for this client, sorted by createdAt ascending
    let clientInvoices = invoices.values()
      .filter(func(inv) { inv.clientId == clientId and inv.status != #paid })
      .toArray();
    let sorted = clientInvoices.sort(func(a, b) { Int.compare(a.createdAt, b.createdAt) });

    var remaining = amount;
    for (inv in sorted.values()) {
      if (remaining <= 0.0) {
        // nothing left to allocate
      } else if (remaining >= inv.due) {
        remaining -= inv.due;
        invoices.add(inv.id, { inv with paid = inv.amount; due = 0.0; status = #paid });
      } else {
        let newPaid = inv.paid + remaining;
        let newDue = inv.amount - newPaid;
        remaining := 0.0;
        invoices.add(inv.id, { inv with paid = newPaid; due = newDue; status = #partial });
      };
    };
  };

  public func addReceiptVoucher(
    vouchers : VoucherMap,
    ledger : LedgerList,
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    clientId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
    caller : Principal,
  ) : Common.Result<Text, Text> {
    if (amount <= 0.0) {
      return #err("Amount must be greater than zero");
    };
    let now = Time.now();
    let voucherNo = nextVoucherNo(settings);
    let voucherId = "RV-" # now.toText();

    let cashAccountName = switch (paymentMethod) {
      case (#cash) "Cash";
      case (#bank) "Bank";
    };

    let entries : [TypesVL.VoucherEntry] = [
      { accountId = "CASH"; accountName = cashAccountName; debit = amount; credit = 0.0 },
      { accountId = clientId; accountName = "Client"; debit = 0.0; credit = amount },
    ];

    let voucher : TypesVL.Voucher = {
      id = voucherId;
      voucherNo;
      voucherType = #receipt;
      date;
      clientId = ?clientId;
      supplierId = null;
      amount;
      paymentMethod = ?paymentMethod;
      remarks;
      entries;
      createdAt = now;
      createdBy = caller;
    };
    vouchers.add(voucherId, voucher);

    // Post client ledger: credit = amount
    let priorBalance = getEntityBalance(ledger, clientId);
    let newBalance = priorBalance - amount;
    ledger.add({
      id = "LE-RV-" # voucherId;
      entityId = clientId;
      entityType = #client;
      date;
      voucherType = "Receipt";
      voucherNo;
      debit = 0.0;
      credit = amount;
      balance = newBalance;
      description = "Receipt from client";
    });

    // Update invoices
    applyPaymentToInvoices(invoices, clientId, amount);

    #ok(voucherId);
  };

  public func addPaymentVoucher(
    vouchers : VoucherMap,
    ledger : LedgerList,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    supplierId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
    caller : Principal,
  ) : Common.Result<Text, Text> {
    if (amount <= 0.0) {
      return #err("Amount must be greater than zero");
    };
    let now = Time.now();
    let voucherNo = nextVoucherNo(settings);
    let voucherId = "PV-" # now.toText();

    let cashAccountName = switch (paymentMethod) {
      case (#cash) "Cash";
      case (#bank) "Bank";
    };

    let entries : [TypesVL.VoucherEntry] = [
      { accountId = supplierId; accountName = "Supplier"; debit = amount; credit = 0.0 },
      { accountId = "CASH"; accountName = cashAccountName; debit = 0.0; credit = amount },
    ];

    let voucher : TypesVL.Voucher = {
      id = voucherId;
      voucherNo;
      voucherType = #payment;
      date;
      clientId = null;
      supplierId = ?supplierId;
      amount;
      paymentMethod = ?paymentMethod;
      remarks;
      entries;
      createdAt = now;
      createdBy = caller;
    };
    vouchers.add(voucherId, voucher);

    // Post supplier ledger: debit = amount (reduce payable)
    let priorBalance = getEntityBalance(ledger, supplierId);
    let newBalance = priorBalance + amount;
    ledger.add({
      id = "LE-PV-" # voucherId;
      entityId = supplierId;
      entityType = #supplier;
      date;
      voucherType = "Payment";
      voucherNo;
      debit = amount;
      credit = 0.0;
      balance = newBalance;
      description = "Payment to supplier";
    });

    #ok(voucherId);
  };

  public func addJournalVoucher(
    vouchers : VoucherMap,
    ledger : LedgerList,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    entries : [TypesVL.VoucherEntry],
    remarks : ?Text,
    caller : Principal,
  ) : Common.Result<Text, Text> {
    // Validate: sum of debits must equal sum of credits
    var totalDebit : Float = 0.0;
    var totalCredit : Float = 0.0;
    for (e in entries.values()) {
      totalDebit += e.debit;
      totalCredit += e.credit;
    };
    // Allow small float epsilon
    let diff = totalDebit - totalCredit;
    let absDiff = if (diff < 0.0) { -diff } else { diff };
    if (absDiff > 0.001) {
      return #err("Journal entries do not balance: debits=" # debug_show(totalDebit) # " credits=" # debug_show(totalCredit));
    };

    let now = Time.now();
    let voucherNo = nextVoucherNo(settings);
    let voucherId = "JV-" # now.toText();

    let totalAmount = totalDebit;

    let voucher : TypesVL.Voucher = {
      id = voucherId;
      voucherNo;
      voucherType = #journal;
      date;
      clientId = null;
      supplierId = null;
      amount = totalAmount;
      paymentMethod = null;
      remarks;
      entries;
      createdAt = now;
      createdBy = caller;
    };
    vouchers.add(voucherId, voucher);

    // Post each entry to ledger (entries with non-zero debit or credit on recognized entity IDs)
    for (e in entries.values()) {
      if (e.debit > 0.0 or e.credit > 0.0) {
        let priorBalance = getEntityBalance(ledger, e.accountId);
        let newBalance = priorBalance + e.debit - e.credit;
        ledger.add({
          id = "LE-JV-" # voucherId # "-" # e.accountId;
          entityId = e.accountId;
          entityType = #client;
          date;
          voucherType = "Journal";
          voucherNo;
          debit = e.debit;
          credit = e.credit;
          balance = newBalance;
          description = switch (remarks) { case (?r) r; case null "Journal entry" };
        });
      };
    };

    #ok(voucherId);
  };

  public func addContraVoucher(
    vouchers : VoucherMap,
    ledger : LedgerList,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    fromAccount : Text,
    toAccount : Text,
    amount : Float,
    remarks : ?Text,
    caller : Principal,
  ) : Common.Result<Text, Text> {
    if (amount <= 0.0) {
      return #err("Amount must be greater than zero");
    };
    let now = Time.now();
    let voucherNo = nextVoucherNo(settings);
    let voucherId = "CV-" # now.toText();

    let entries : [TypesVL.VoucherEntry] = [
      { accountId = toAccount; accountName = toAccount; debit = amount; credit = 0.0 },
      { accountId = fromAccount; accountName = fromAccount; debit = 0.0; credit = amount },
    ];

    let voucher : TypesVL.Voucher = {
      id = voucherId;
      voucherNo;
      voucherType = #contra;
      date;
      clientId = null;
      supplierId = null;
      amount;
      paymentMethod = null;
      remarks;
      entries;
      createdAt = now;
      createdBy = caller;
    };
    vouchers.add(voucherId, voucher);

    // Post ledger for both accounts
    let fromBalance = getEntityBalance(ledger, fromAccount);
    ledger.add({
      id = "LE-CV-FROM-" # voucherId;
      entityId = fromAccount;
      entityType = #client;
      date;
      voucherType = "Contra";
      voucherNo;
      debit = 0.0;
      credit = amount;
      balance = fromBalance - amount;
      description = "Contra transfer to " # toAccount;
    });

    let toBalance = getEntityBalance(ledger, toAccount);
    ledger.add({
      id = "LE-CV-TO-" # voucherId;
      entityId = toAccount;
      entityType = #client;
      date;
      voucherType = "Contra";
      voucherNo;
      debit = amount;
      credit = 0.0;
      balance = toBalance + amount;
      description = "Contra transfer from " # fromAccount;
    });

    #ok(voucherId);
  };

  public func getVouchers(vouchers : VoucherMap) : [TypesVL.Voucher] {
    vouchers.values().toArray();
  };

  public func getVoucherById(vouchers : VoucherMap, id : Common.EntityId) : ?TypesVL.Voucher {
    vouchers.get(id);
  };

  public func updateReceiptVoucher(
    vouchers : VoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    clientId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (vouchers.get(id)) {
      case null { #err("Voucher not found: " # id) };
      case (?existing) {
        if (existing.voucherType != #receipt) {
          return #err("Voucher is not a receipt voucher");
        };
        let cashAccountName = switch (paymentMethod) {
          case (#cash) "Cash";
          case (#bank) "Bank";
        };
        let entries : [TypesVL.VoucherEntry] = [
          { accountId = "CASH"; accountName = cashAccountName; debit = amount; credit = 0.0 },
          { accountId = clientId; accountName = "Client"; debit = 0.0; credit = amount },
        ];
        vouchers.add(id, { existing with date; clientId = ?clientId; amount; paymentMethod = ?paymentMethod; remarks; entries });
        #ok(());
      };
    };
  };

  public func updatePaymentVoucher(
    vouchers : VoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    supplierId : Common.EntityId,
    amount : Float,
    paymentMethod : Common.PaymentMethod,
    remarks : ?Text,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (vouchers.get(id)) {
      case null { #err("Voucher not found: " # id) };
      case (?existing) {
        if (existing.voucherType != #payment) {
          return #err("Voucher is not a payment voucher");
        };
        let cashAccountName = switch (paymentMethod) {
          case (#cash) "Cash";
          case (#bank) "Bank";
        };
        let entries : [TypesVL.VoucherEntry] = [
          { accountId = supplierId; accountName = "Supplier"; debit = amount; credit = 0.0 },
          { accountId = "CASH"; accountName = cashAccountName; debit = 0.0; credit = amount },
        ];
        vouchers.add(id, { existing with date; supplierId = ?supplierId; amount; paymentMethod = ?paymentMethod; remarks; entries });
        #ok(());
      };
    };
  };

  public func updateJournalVoucher(
    vouchers : VoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    entries : [TypesVL.VoucherEntry],
    remarks : ?Text,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (vouchers.get(id)) {
      case null { #err("Voucher not found: " # id) };
      case (?existing) {
        if (existing.voucherType != #journal) {
          return #err("Voucher is not a journal voucher");
        };
        // Validate balance
        var totalDebit : Float = 0.0;
        var totalCredit : Float = 0.0;
        for (e in entries.values()) {
          totalDebit += e.debit;
          totalCredit += e.credit;
        };
        let diff = totalDebit - totalCredit;
        let absDiff = if (diff < 0.0) { -diff } else { diff };
        if (absDiff > 0.001) {
          return #err("Journal entries do not balance: debits=" # debug_show(totalDebit) # " credits=" # debug_show(totalCredit));
        };
        vouchers.add(id, { existing with date; entries; remarks; amount = totalDebit });
        #ok(());
      };
    };
  };

  public func updateContraVoucher(
    vouchers : VoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    fromAccount : Text,
    toAccount : Text,
    amount : Float,
    remarks : ?Text,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (vouchers.get(id)) {
      case null { #err("Voucher not found: " # id) };
      case (?existing) {
        if (existing.voucherType != #contra) {
          return #err("Voucher is not a contra voucher");
        };
        if (amount <= 0.0) {
          return #err("Amount must be greater than zero");
        };
        let entries : [TypesVL.VoucherEntry] = [
          { accountId = toAccount; accountName = toAccount; debit = amount; credit = 0.0 },
          { accountId = fromAccount; accountName = fromAccount; debit = 0.0; credit = amount },
        ];
        vouchers.add(id, { existing with date; amount; remarks; entries });
        #ok(());
      };
    };
  };

  public func deleteVoucher(
    vouchers : VoucherMap,
    id : Common.EntityId,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (vouchers.get(id)) {
      case null { #err("Voucher not found: " # id) };
      case (_) {
        vouchers.remove(id);
        #ok(());
      };
    };
  };

  public func getVouchersByType(vouchers : VoucherMap, voucherType : Common.VoucherType) : [TypesVL.Voucher] {
    vouchers.values().filter(func(v) { v.voucherType == voucherType }).toArray();
  };

  public func getLedgerByEntity(ledger : LedgerList, entityId : Common.EntityId) : [TypesVL.LedgerEntry] {
    let entries = ledger.filter(func(e) { e.entityId == entityId }).toArray();
    entries.sort(func(a, b) { Int.compare(a.date, b.date) });
  };

  public func getRunningBalance(ledger : LedgerList, entityId : Common.EntityId) : Float {
    getEntityBalance(ledger, entityId);
  };

  public func getProfitLossReport(
    bookings : Map.Map<Common.EntityId, TypesBI.Booking>,
  ) : TypesVL.ProfitLossReport {
    var totalSales : Float = 0.0;
    var totalCost : Float = 0.0;
    bookings.values().forEach(func(b) {
      totalSales += b.saleFare;
      totalCost += b.netFare;
    });
    let grossProfit = totalSales - totalCost;
    {
      totalSales;
      totalCost;
      grossProfit;
      netProfit = grossProfit;
    };
  };

  public func getTrialBalance(
    _vouchers : VoucherMap,
    ledger : LedgerList,
  ) : [TypesVL.TrialBalanceEntry] {
    // Aggregate debits and credits per accountId from all ledger entries
    let accountMap = Map.empty<Text, (Float, Float)>();
    ledger.forEach(func(e) {
      let (d, c) = switch (accountMap.get(e.entityId)) {
        case null { (0.0, 0.0) };
        case (?v) { v };
      };
      accountMap.add(e.entityId, (d + e.debit, c + e.credit));
    });
    accountMap.entries().map<(Text, (Float, Float)), TypesVL.TrialBalanceEntry>(func((accountId, (debit, credit))) {
      { accountName = accountId; debit; credit };
    }).toArray();
  };

  public func getOutstandingReport(
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
    clients : Map.Map<Common.EntityId, TypesCS.Client>,
  ) : [TypesVL.OutstandingEntry] {
    invoices.values()
      .filter(func(inv) { inv.status != #paid })
      .map<TypesBI.Invoice, TypesVL.OutstandingEntry>(func(inv) {
        let clientName = switch (clients.get(inv.clientId)) {
          case (?c) { c.name };
          case null { inv.clientId };
        };
        { clientName; invoiceNo = inv.invoiceNo; amount = inv.amount; paid = inv.paid; due = inv.due };
      })
      .toArray();
  };

  public func getDashboardStats(
    bookings : Map.Map<Common.EntityId, TypesBI.Booking>,
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
    ledger : LedgerList,
    vouchers : VoucherMap,
  ) : TypesVL.DashboardStats {
    var totalSales : Float = 0.0;
    var totalProfit : Float = 0.0;
    bookings.values().forEach(func(b) {
      totalSales += b.saleFare;
      totalProfit += b.profit;
    });

    var totalReceivable : Float = 0.0;
    invoices.values().forEach(func(inv) {
      if (inv.status != #paid) {
        totalReceivable += inv.due;
      };
    });

    // totalPayable: sum of supplier ledger balances where balance > 0
    let supplierBalances = Map.empty<Text, Float>();
    ledger.forEach(func(e) {
      if (e.entityType == #supplier) {
        supplierBalances.add(e.entityId, e.balance);
      };
    });
    var totalPayable : Float = 0.0;
    supplierBalances.values().forEach(func(bal) {
      if (bal > 0.0) { totalPayable += bal };
    });

    // todayTransactions: count bookings + vouchers created today (within last 24h)
    let oneDayNanos : Int = 86_400_000_000_000;
    let cutoff = Time.now() - oneDayNanos;
    var todayCount : Nat = 0;
    bookings.values().forEach(func(b) {
      if (b.createdAt >= cutoff) { todayCount += 1 };
    });
    vouchers.values().forEach(func(v) {
      if (v.createdAt >= cutoff) { todayCount += 1 };
    });

    {
      totalSales;
      totalProfit;
      totalReceivable;
      totalPayable;
      todayTransactions = todayCount;
    };
  };
};
