import Common "../types/common";
import VLR "../types/vouchers-ledger-reports";
import TypesCS "../types/clients-suppliers";
import Types "../types/ledger-summaries";
import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";

module {

  // Nanoseconds per day
  let NS_PER_DAY : Int = 86_400_000_000_000;

  // --- Date formatting helpers ---

  func nsToYMD(ts : Int) : (Int, Int, Int) {
    let days = ts / NS_PER_DAY;
    let n = days + 719468;
    let era : Int = (if (n >= 0) n else n - 146096) / 146097;
    let doe = n - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = mp + (if (mp < 10) 3 else -9);
    let adjY = y + (if (m <= 2) 1 else 0);
    (adjY, m, d)
  };

  func pad2(n : Int) : Text {
    if (n < 10) "0" # n.toText() else n.toText()
  };

  func formatDate(ts : Int) : Text {
    let (y, m, d) = nsToYMD(ts);
    y.toText() # "-" # pad2(m) # "-" # pad2(d)
  };

  func dayIndex(ts : Int) : Int {
    ts / NS_PER_DAY
  };

  func isoWeekYear(ts : Int) : (Int, Int) {
    let (y, m, d) = nsToYMD(ts);
    let days = ts / NS_PER_DAY;
    // 0 = Monday based on Unix epoch (1970-01-01 was Thursday = day 3)
    let dow = Int.rem(days + 3, 7);
    let monthDays : [Int] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let isLeap = (Int.rem(y, 4) == 0 and Int.rem(y, 100) != 0) or Int.rem(y, 400) == 0;
    let leapAdd : Int = if (isLeap and m > 2) 1 else 0;
    let doy = monthDays[(m - 1).toNat()] + d + leapAdd;
    let w = (doy - dow + 10) / 7;
    if (w < 1) {
      let prevY = y - 1;
      let prevIsLeap = (Int.rem(prevY, 4) == 0 and Int.rem(prevY, 100) != 0) or Int.rem(prevY, 400) == 0;
      let daysInPrevYear : Int = if (prevIsLeap) 366 else 365;
      let prevW = (daysInPrevYear - dow + doy + 10) / 7;
      (prevW, prevY)
    } else {
      let isLeapY = (Int.rem(y, 4) == 0 and Int.rem(y, 100) != 0) or Int.rem(y, 400) == 0;
      let daysInYear : Int = if (isLeapY) 366 else 365;
      if (w == 53 and (daysInYear - doy) < (7 - dow)) {
        (1, y + 1)
      } else {
        (w, y)
      }
    }
  };

  func weekKey(ts : Int) : Int {
    let (w, y) = isoWeekYear(ts);
    y * 100 + w
  };

  func buildWeekLabel(ts : Int) : Text {
    let (w, y) = isoWeekYear(ts);
    "Week " # w.toText() # " " # y.toText()
  };

  func weekStartTs(ts : Int) : Int {
    let days = ts / NS_PER_DAY;
    let dow = Int.rem(days + 3, 7);
    (days - dow) * NS_PER_DAY
  };

  func weekEndTs(ts : Int) : Int {
    let days = ts / NS_PER_DAY;
    let dow = Int.rem(days + 3, 7);
    (days + (6 - dow)) * NS_PER_DAY
  };

  // --- Public functions ---

  public func getDailyLedgerSummary(
    ledger : List.List<VLR.LedgerEntry>,
    startDate : Common.Timestamp,
    endDate : Common.Timestamp,
  ) : [Types.DailyLedgerSummary] {
    let dayMap = Map.empty<Int, (Float, Float)>();

    ledger.forEach(func(entry) {
      if (entry.date >= startDate and entry.date <= endDate) {
        let key = dayIndex(entry.date);
        let (prevD, prevC) = switch (dayMap.get(key)) {
          case (?v) v;
          case null (0.0, 0.0);
        };
        dayMap.add(key, (prevD + entry.debit, prevC + entry.credit));
      }
    });

    let results = dayMap.toArray();
    let sorted = results.sort(func(a, b) = Int.compare(a.0, b.0));

    sorted.map<(Int, (Float, Float)), Types.DailyLedgerSummary>(
      func((dayIdx, (d, c))) {
        {
          date = formatDate(dayIdx * NS_PER_DAY);
          totalDebit = d;
          totalCredit = c;
          netBalance = c - d;
        }
      },
    )
  };

  public func getWeeklyLedgerSummary(
    ledger : List.List<VLR.LedgerEntry>,
    startDate : Common.Timestamp,
    endDate : Common.Timestamp,
  ) : [Types.WeeklyLedgerSummary] {
    // Map keyed by week key, value: (totalDebit, totalCredit, representative ts)
    let weekMap = Map.empty<Int, (Float, Float, Int)>();

    ledger.forEach(func(entry) {
      if (entry.date >= startDate and entry.date <= endDate) {
        let key = weekKey(entry.date);
        let (prevD, prevC, prevTs) = switch (weekMap.get(key)) {
          case (?v) v;
          case null (0.0, 0.0, entry.date);
        };
        weekMap.add(key, (prevD + entry.debit, prevC + entry.credit, prevTs));
      }
    });

    let results = weekMap.toArray();
    let sorted = results.sort(func(a, b) = Int.compare(a.0, b.0));

    sorted.map<(Int, (Float, Float, Int)), Types.WeeklyLedgerSummary>(
      func((_, (d, c, ts))) {
        {
          weekLabel = buildWeekLabel(ts);
          startDate = formatDate(weekStartTs(ts));
          endDate = formatDate(weekEndTs(ts));
          totalDebit = d;
          totalCredit = c;
          netBalance = c - d;
        }
      },
    )
  };

  public func getClientLedgerSummaries(
    ledger : List.List<VLR.LedgerEntry>,
    clients : Map.Map<Common.EntityId, TypesCS.Client>,
  ) : [Types.ClientLedgerSummary] {
    type Acc = {
      firstEntry : VLR.LedgerEntry;
      lastEntry : VLR.LedgerEntry;
      totalDebit : Float;
      totalCredit : Float;
    };

    let entityMap = Map.empty<Common.EntityId, Acc>();

    ledger.forEach(func(entry) {
      switch (entityMap.get(entry.entityId)) {
        case null {
          entityMap.add(
            entry.entityId,
            {
              firstEntry = entry;
              lastEntry = entry;
              totalDebit = entry.debit;
              totalCredit = entry.credit;
            },
          );
        };
        case (?acc) {
          let newFirst = if (entry.date < acc.firstEntry.date) entry else acc.firstEntry;
          let newLast = if (entry.date > acc.lastEntry.date) entry else acc.lastEntry;
          entityMap.add(
            entry.entityId,
            {
              firstEntry = newFirst;
              lastEntry = newLast;
              totalDebit = acc.totalDebit + entry.debit;
              totalCredit = acc.totalCredit + entry.credit;
            },
          );
        };
      }
    });

    let entries = entityMap.toArray();

    entries.map<(Common.EntityId, Acc), Types.ClientLedgerSummary>(
      func((eid, acc)) {
        let openingBalance = acc.firstEntry.balance - acc.firstEntry.credit + acc.firstEntry.debit;
        let entityName = switch (clients.get(eid)) {
          case (?c) c.name;
          case null eid;
        };
        {
          entityId = eid;
          entityName;
          openingBalance;
          totalDebit = acc.totalDebit;
          totalCredit = acc.totalCredit;
          closingBalance = acc.lastEntry.balance;
        }
      },
    )
  };
};
