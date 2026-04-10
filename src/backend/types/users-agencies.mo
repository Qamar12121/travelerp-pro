import Map "mo:core/Map";
import Common "common";

module {
  public type AgentRole = { #owner; #agent };

  public type Agency = {
    id : Common.EntityId;
    ownerPrincipal : Principal;
    agencyName : Text;
    logoUrl : ?Text;
    isActive : Bool;
    isOnboarded : Bool;
    phone : ?Text;
    country : ?Text;
    timezone : ?Text;
    createdAt : Common.Timestamp;
    totalAgents : Nat;
  };

  public type AgentProfile = {
    id : Common.EntityId;
    agencyId : Common.EntityId;
    principal : ?Principal;
    email : Text;
    name : Text;
    role : AgentRole;
    isActive : Bool;
    createdAt : Common.Timestamp;
    createdBy : Principal;
  };

  public type AgencyStats = {
    totalBookings : Nat;
    totalRevenue : Float;
    totalProfit : Float;
    activeAgents : Nat;
    lastActivityAt : ?Common.Timestamp;
  };

  public type ActivityLogEntry = {
    id : Common.EntityId;
    agencyId : Common.EntityId;
    eventType : Text;
    description : Text;
    timestamp : Common.Timestamp;
    actorId : ?Text;
  };

  public type AgencyMap = Map.Map<Common.EntityId, Agency>;
  public type AgentMap = Map.Map<Common.EntityId, AgentProfile>;
  public type PrincipalToAgencyMap = Map.Map<Principal, Common.EntityId>;
  public type PrincipalToAgentMap = Map.Map<Principal, Common.EntityId>;
  public type ActivityLogMap = Map.Map<Common.EntityId, ActivityLogEntry>;
};
