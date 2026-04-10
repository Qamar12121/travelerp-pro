import Common "common";

module {
  public type DailyLedgerSummary = {
    date : Text;
    totalDebit : Float;
    totalCredit : Float;
    netBalance : Float;
  };

  public type WeeklyLedgerSummary = {
    weekLabel : Text;
    startDate : Text;
    endDate : Text;
    totalDebit : Float;
    totalCredit : Float;
    netBalance : Float;
  };

  public type ClientLedgerSummary = {
    entityId : Common.EntityId;
    entityName : Text;
    openingBalance : Float;
    totalDebit : Float;
    totalCredit : Float;
    closingBalance : Float;
  };
};
