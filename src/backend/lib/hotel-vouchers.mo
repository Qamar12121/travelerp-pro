import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Common "../types/common";
import Types "../types/hotel-vouchers";
import TypesVL "../types/vouchers-ledger-reports";

module {
  public func listHotelVouchers(
    hotelVouchers : Types.HotelVoucherMap,
    agencyId : Common.EntityId,
  ) : [Types.HotelVoucher] {
    hotelVouchers.values()
      .filter(func(v) { v.agencyId == agencyId })
      .toArray();
  };

  public func getHotelVoucher(
    hotelVouchers : Types.HotelVoucherMap,
    id : Common.EntityId,
  ) : ?Types.HotelVoucher {
    hotelVouchers.get(id);
  };

  public func createHotelVoucher(
    hotelVouchers : Types.HotelVoucherMap,
    vouchers : Map.Map<Common.EntityId, TypesVL.Voucher>,
    ledger : List.List<TypesVL.LedgerEntry>,
    settings : {
      var voucherPrefix : Text;
      var voucherNextNo : Nat;
      var hotelVoucherNextNo : Nat;
    },
    clientId : Common.EntityId,
    agencyId : Common.EntityId,
    agentId : ?Common.EntityId,
    date : Common.Timestamp,
    hotels : [Types.HotelVoucherLine],
    remarks : ?Text,
    caller : Principal,
  ) : Types.HotelVoucher {
    let now = Time.now();
    let voucherNo = "HV-" # settings.voucherPrefix # settings.hotelVoucherNextNo.toText();
    settings.hotelVoucherNextNo += 1;

    let totalAmount = hotels.foldLeft(0.0, func(acc : Float, h : Types.HotelVoucherLine) : Float { acc + h.totalAmount });

    let id = "HV" # now.toText();

    let voucher : Types.HotelVoucher = {
      id;
      voucherNo;
      date;
      clientId;
      agencyId;
      agentId;
      remarks;
      hotels;
      totalAmount;
      createdAt = now;
      createdBy = caller.toText();
    };
    hotelVouchers.add(id, voucher);

    // Auto-create payment voucher entry for total amount
    let pvNo = settings.voucherPrefix # settings.voucherNextNo.toText();
    settings.voucherNextNo += 1;
    let pvId = "PV-HV-" # now.toText();
    let paymentVoucher : TypesVL.Voucher = {
      id = pvId;
      voucherNo = pvNo;
      voucherType = #payment;
      date;
      clientId = ?clientId;
      supplierId = null;
      amount = totalAmount;
      paymentMethod = null;
      remarks = ?("Hotel voucher payment - " # voucherNo);
      entries = [
        {
          accountId = clientId;
          accountName = "Client Account";
          debit = 0.0;
          credit = totalAmount;
        },
        {
          accountId = "supplier-account";
          accountName = "Supplier Payable";
          debit = totalAmount;
          credit = 0.0;
        },
      ];
      createdAt = now;
      createdBy = caller;
    };
    vouchers.add(pvId, paymentVoucher);

    // Post ledger entry
    let ledgerEntry : TypesVL.LedgerEntry = {
      id = "LE-HV-" # id;
      entityId = clientId;
      entityType = #client;
      date = now;
      voucherType = "HotelVoucher";
      voucherNo;
      debit = totalAmount;
      credit = 0.0;
      balance = totalAmount;
      description = "Hotel voucher - " # voucherNo;
    };
    ledger.add(ledgerEntry);

    voucher;
  };

  public func updateHotelVoucher(
    hotelVouchers : Types.HotelVoucherMap,
    id : Common.EntityId,
    clientId : Common.EntityId,
    agentId : ?Common.EntityId,
    date : Common.Timestamp,
    hotels : [Types.HotelVoucherLine],
    remarks : ?Text,
  ) : ?Types.HotelVoucher {
    switch (hotelVouchers.get(id)) {
      case null { null };
      case (?existing) {
        let totalAmount = hotels.foldLeft(0.0, func(acc : Float, h : Types.HotelVoucherLine) : Float { acc + h.totalAmount });
        let updated : Types.HotelVoucher = {
          existing with
          clientId;
          agentId;
          date;
          hotels;
          remarks;
          totalAmount;
        };
        hotelVouchers.add(id, updated);
        ?updated;
      };
    };
  };

  public func deleteHotelVoucher(
    hotelVouchers : Types.HotelVoucherMap,
    id : Common.EntityId,
  ) : Bool {
    switch (hotelVouchers.get(id)) {
      case null { false };
      case (?_) {
        hotelVouchers.remove(id);
        true;
      };
    };
  };
};
