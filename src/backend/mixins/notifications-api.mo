import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Types "../types/notifications";
import NotificationsLib "../lib/notifications";

mixin (
  accessControlState : AccessControl.AccessControlState,
  notifications : Types.NotificationMap,
  notificationIdCounter : { var next : Nat },
) {
  public query ({ caller }) func getNotifications(agencyId : Common.EntityId) : async [Types.InAppNotification] {
    NotificationsLib.listNotifications(notifications, agencyId);
  };

  public query ({ caller }) func getUnreadNotificationCount(agencyId : Common.EntityId) : async Nat {
    NotificationsLib.getUnreadCount(notifications, agencyId);
  };

  public shared ({ caller }) func markNotificationRead(id : Common.EntityId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    NotificationsLib.markAsRead(notifications, id);
  };

  public shared ({ caller }) func markAllNotificationsRead(agencyId : Common.EntityId) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    NotificationsLib.markAllAsRead(notifications, agencyId);
  };

  public shared ({ caller }) func deleteNotification(id : Common.EntityId) : async Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    NotificationsLib.deleteNotification(notifications, id);
  };
};
