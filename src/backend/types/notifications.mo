import Common "common";
import Map "mo:core/Map";

module {
  public type NotificationType = {
    #paymentReceived;
    #refundCreated;
    #invoiceOverdue;
    #bookingConfirmed;
    #systemAlert;
  };

  public type InAppNotification = {
    id : Common.EntityId;
    agencyId : Common.EntityId;
    notificationType : NotificationType;
    title : Text;
    message : Text;
    isRead : Bool;
    createdAt : Common.Timestamp;
    relatedId : ?Text;
  };

  public type RefundRequest = {
    invoiceId : Common.EntityId;
    refundAmount : Float;
    reason : Text;
    refundDate : Common.Timestamp;
  };

  public type NotificationMap = Map.Map<Common.EntityId, InAppNotification>;
};
