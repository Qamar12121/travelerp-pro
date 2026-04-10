import Common "common";

module {
  public type Client = {
    id : Common.EntityId;
    name : Text;
    phone : Text;
    email : ?Text;
    openingBalance : Float;
    clientType : Common.ClientType;
    createdAt : Common.Timestamp;
  };
};
