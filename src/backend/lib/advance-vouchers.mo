import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import TypesAV "../types/advance-vouchers";
import TypesVL "../types/vouchers-ledger-reports";
import Common "../types/common";

module {
  public type AdvanceVoucher = TypesAV.AdvanceVoucher;
  public type AdvanceVoucherMap = TypesAV.AdvanceVoucherMap;
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

  public func addAdvanceVoucher(
    map : AdvanceVoucherMap,
    ledger : LedgerList,
    settings : { var voucherNextNo : Nat; var voucherPrefix : Text },
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?Common.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesVL.VoucherEntry],
    caller : Principal,
  ) : Common.Result<TypesAV.AdvanceVoucher, Text> {
    if (amount <= 0.0) {
      return #err("Amount must be greater than zero");
    };
    let now = Time.now();
    let voucherNo = settings.voucherPrefix # settings.voucherNextNo.toText();
    settings.voucherNextNo += 1;
    let voucherId = "ADV-" # now.toText();

    // Determine entity for ledger posting
    let entityId = switch (clientId) {
      case (?cid) cid;
      case null {
        switch (supplierId) {
          case (?sid) sid;
          case null { "ADVANCE" };
        };
      };
    };

    let entityType : Common.ClientType = switch (supplierId) {
      case (?_) { #supplier };
      case null { #client };
    };

    let advanceVoucher : TypesAV.AdvanceVoucher = {
      id = voucherId;
      voucherNo;
      date;
      clientId;
      supplierId;
      linkedClientId;
      linkedSupplierId;
      advanceType;
      amount;
      paymentMethod;
      remarks;
      entries;
      createdAt = now;
      createdBy = caller;
    };
    map.add(voucherId, advanceVoucher);

    // Post ledger entry for advance
    let priorBalance = getEntityBalance(ledger, entityId);
    let (debit, credit) = switch (advanceType) {
      case (?#received) { (0.0, amount) }; // advance received from client: credit client
      case (?#paid) { (amount, 0.0) };     // advance paid to supplier: debit supplier
      case null { (amount, 0.0) };
    };
    let newBalance = priorBalance + debit - credit;
    ledger.add({
      id = "LE-ADV-" # voucherId;
      entityId;
      entityType;
      date;
      voucherType = "Advance";
      voucherNo;
      debit;
      credit;
      balance = newBalance;
      description = switch (remarks) { case (?r) r; case null "Advance/Deposit voucher" };
    });

    #ok(advanceVoucher);
  };

  public func updateAdvanceVoucher(
    map : AdvanceVoucherMap,
    id : Common.EntityId,
    date : Common.Timestamp,
    clientId : ?Common.EntityId,
    supplierId : ?Common.EntityId,
    linkedClientId : ?Common.EntityId,
    linkedSupplierId : ?Common.EntityId,
    advanceType : ?Common.AdvanceType,
    amount : Float,
    paymentMethod : ?Common.PaymentMethod,
    remarks : ?Text,
    entries : [TypesVL.VoucherEntry],
    _caller : Principal,
  ) : Common.Result<TypesAV.AdvanceVoucher, Text> {
    switch (map.get(id)) {
      case null { #err("Advance voucher not found: " # id) };
      case (?existing) {
        if (amount <= 0.0) {
          return #err("Amount must be greater than zero");
        };
        let updated : TypesAV.AdvanceVoucher = {
          existing with
          date;
          clientId;
          supplierId;
          linkedClientId;
          linkedSupplierId;
          advanceType;
          amount;
          paymentMethod;
          remarks;
          entries;
        };
        map.add(id, updated);
        #ok(updated);
      };
    };
  };

  public func deleteAdvanceVoucher(
    map : AdvanceVoucherMap,
    id : Common.EntityId,
  ) : Common.Result<(), Text> {
    switch (map.get(id)) {
      case null { #err("Advance voucher not found: " # id) };
      case (_) {
        map.remove(id);
        #ok(());
      };
    };
  };

  public func getAdvanceVouchers(map : AdvanceVoucherMap) : [TypesAV.AdvanceVoucher] {
    map.values().toArray();
  };

  public func getAdvanceVoucherById(map : AdvanceVoucherMap, id : Common.EntityId) : ?TypesAV.AdvanceVoucher {
    map.get(id);
  };

  public func getVouchersSummary(
    vouchers : VoucherMap,
    advanceVouchers : AdvanceVoucherMap,
  ) : TypesAV.VouchersSummary {
    var totalVouchers : Nat = 0;
    var totalReceipts : Float = 0.0;
    var totalPayments : Float = 0.0;
    var totalAdvances : Float = 0.0;

    vouchers.values().forEach(func(v) {
      totalVouchers += 1;
      switch (v.voucherType) {
        case (#receipt) { totalReceipts += v.amount };
        case (#payment) { totalPayments += v.amount };
        case (_) {};
      };
    });

    advanceVouchers.values().forEach(func(av) {
      totalVouchers += 1;
      totalAdvances += av.amount;
    });

    { totalVouchers; totalReceipts; totalPayments; totalAdvances };
  };
};
