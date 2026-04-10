import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Common "../types/common";
import Types "../types/notifications";

module {

  public func listNotifications(
    notifications : Types.NotificationMap,
    agencyId : Common.EntityId,
  ) : [Types.InAppNotification] {
    // Return last 50, sorted by createdAt descending
    let all = notifications.values()
      .filter(func(n) { n.agencyId == agencyId })
      .toArray();
    let sorted = all.sort(func(a, b) { Int.compare(b.createdAt, a.createdAt) });
    if (sorted.size() <= 50) {
      sorted;
    } else {
      sorted.sliceToArray(0, 50);
    };
  };

  public func getUnreadCount(
    notifications : Types.NotificationMap,
    agencyId : Common.EntityId,
  ) : Nat {
    notifications.values()
      .filter(func(n) { n.agencyId == agencyId and not n.isRead })
      .size();
  };

  public func markAsRead(
    notifications : Types.NotificationMap,
    id : Common.EntityId,
  ) : Bool {
    switch (notifications.get(id)) {
      case null { false };
      case (?n) {
        notifications.add(id, { n with isRead = true });
        true;
      };
    };
  };

  public func markAllAsRead(
    notifications : Types.NotificationMap,
    agencyId : Common.EntityId,
  ) : Nat {
    var count : Nat = 0;
    notifications.forEach(func(id, n) {
      if (n.agencyId == agencyId and not n.isRead) {
        notifications.add(id, { n with isRead = true });
        count += 1;
      };
    });
    count;
  };

  public func createNotification(
    notifications : Types.NotificationMap,
    notification : Types.InAppNotification,
  ) : Types.InAppNotification {
    notifications.add(notification.id, notification);
    notification;
  };

  public func deleteNotification(
    notifications : Types.NotificationMap,
    id : Common.EntityId,
  ) : Bool {
    switch (notifications.get(id)) {
      case null { false };
      case (?_) {
        notifications.remove(id);
        true;
      };
    };
  };

  public func createRefundNotification(
    notifications : Types.NotificationMap,
    agencyId : Common.EntityId,
    invoiceId : Common.EntityId,
    refundAmount : Float,
    idCounter : { var next : Nat },
  ) : Types.InAppNotification {
    let id = "NOTIF-" # idCounter.next.toText();
    idCounter.next += 1;
    let now = Time.now();
    let notification : Types.InAppNotification = {
      id;
      agencyId;
      notificationType = #refundCreated;
      title = "Refund Created";
      message = "Refund of " # refundAmount.toText() # " created for invoice " # invoiceId;
      isRead = false;
      createdAt = now;
      relatedId = ?invoiceId;
    };
    notifications.add(id, notification);
    notification;
  };
};
