import Common "../types/common";
import VLR "../types/vouchers-ledger-reports";
import TypesCS "../types/clients-suppliers";
import Types "../types/ledger-summaries";
import Lib "../lib/ledger-summaries";
import List "mo:core/List";
import Map "mo:core/Map";

mixin (
  ledger : List.List<VLR.LedgerEntry>,
  clients : Map.Map<Common.EntityId, TypesCS.Client>,
) {
  public query func getDailyLedgerSummary(
    startDate : Common.Timestamp,
    endDate : Common.Timestamp,
  ) : async [Types.DailyLedgerSummary] {
    Lib.getDailyLedgerSummary(ledger, startDate, endDate)
  };

  public query func getWeeklyLedgerSummary(
    startDate : Common.Timestamp,
    endDate : Common.Timestamp,
  ) : async [Types.WeeklyLedgerSummary] {
    Lib.getWeeklyLedgerSummary(ledger, startDate, endDate)
  };

  public query func getClientLedgerSummaries() : async [Types.ClientLedgerSummary] {
    Lib.getClientLedgerSummaries(ledger, clients)
  };
};
