import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import Types "../types/users-agencies";
import TypesBI "../types/bookings-invoices";
import Lib "../lib/users-agencies";

mixin (
  superAdminRef : { var superAdmin : ?Principal },
  agencies : Types.AgencyMap,
  agents : Types.AgentMap,
  principalToAgency : Types.PrincipalToAgencyMap,
  principalToAgent : Types.PrincipalToAgentMap,
  agencyIdCounter : { var next : Nat },
  activityLog : Types.ActivityLogMap,
  activityLogIdCounter : { var next : Nat },
  invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
) {

  // ── super-admin ───────────────────────────────────────────────────────────

  public query ({ caller }) func isSuperAdmin() : async Bool {
    Lib.isSuperAdmin(superAdminRef.superAdmin, caller);
  };

  /// Bootstrap: callable once when no super-admin is set; afterwards only by current super-admin.
  public shared ({ caller }) func setSuperAdminPrincipal() : async Common.Result<(), Text> {
    Lib.setSuperAdminPrincipal(superAdminRef, caller);
  };

  // ── agency management ──────────────────────────────────────────────────────

  public shared ({ caller }) func createAgency(agencyName : Text) : async Common.Result<Types.Agency, Text> {
    Lib.createAgency(agencies, agents, principalToAgency, principalToAgent, agencyIdCounter, caller, agencyName);
  };

  public query ({ caller }) func getMyAgency() : async ?Types.Agency {
    Lib.getAgencyByOwner(agencies, principalToAgency, caller);
  };

  public shared ({ caller }) func updateAgencyProfile(
    newName : ?Text,
    newLogoUrl : ?Text,
  ) : async Common.Result<Types.Agency, Text> {
    Lib.updateAgencyProfile(agencies, principalToAgency, caller, newName, newLogoUrl);
  };

  public shared ({ caller }) func completeOnboarding(
    phone : ?Text,
    country : ?Text,
    timezone : ?Text,
  ) : async Common.Result<Types.Agency, Text> {
    Lib.completeOnboarding(agencies, principalToAgency, caller, phone, country, timezone);
  };

  // ── agent management ───────────────────────────────────────────────────────

  public shared ({ caller }) func addAgent(
    name : Text,
    email : Text,
  ) : async Common.Result<Types.AgentProfile, Text> {
    Lib.addAgent(agencies, agents, principalToAgency, agencyIdCounter, caller, name, email);
  };

  public shared ({ caller }) func removeAgent(agentId : Common.EntityId) : async Common.Result<(), Text> {
    Lib.removeAgent(agencies, agents, principalToAgency, principalToAgent, caller, agentId);
  };

  public shared ({ caller }) func toggleAgentAccess(
    agentId : Common.EntityId,
    isActive : Bool,
  ) : async Common.Result<(), Text> {
    Lib.toggleAgentAccess(agents, principalToAgency, caller, agentId, isActive);
  };

  public query ({ caller }) func getMyAgents() : async Common.Result<[Types.AgentProfile], Text> {
    Lib.getAgentsByAgency(agents, principalToAgency, caller);
  };

  public query ({ caller }) func getAgentProfile() : async ?Types.AgentProfile {
    Lib.getAgentByPrincipal(agents, principalToAgent, caller);
  };

  /// Agency owner links an Internet Identity principal to an agent slot.
  public shared ({ caller }) func linkMyAgentPrincipal(
    agentId : Common.EntityId,
    agentPrincipal : Principal,
  ) : async Common.Result<(), Text> {
    Lib.linkAgentPrincipal(agents, principalToAgency, principalToAgent, caller, agentId, agentPrincipal);
  };

  // ── super-admin only ───────────────────────────────────────────────────────

  public query ({ caller }) func getAllAgencies() : async Common.Result<[Types.Agency], Text> {
    if (not Lib.isSuperAdmin(superAdminRef.superAdmin, caller)) {
      return #err("Unauthorized: super-admin only");
    };
    #ok(Lib.getAllAgencies(agencies));
  };

  public query ({ caller }) func getAgencyStats(agencyId : Common.EntityId) : async Common.Result<Types.AgencyStats, Text> {
    if (not Lib.isSuperAdmin(superAdminRef.superAdmin, caller)) {
      return #err("Unauthorized: super-admin only");
    };
    #ok(Lib.computeAgencyStats(agents, agencyId));
  };

  public shared ({ caller }) func updateAgencyStatus(
    agencyId : Common.EntityId,
    isActive : Bool,
  ) : async Common.Result<(), Text> {
    if (not Lib.isSuperAdmin(superAdminRef.superAdmin, caller)) {
      return #err("Unauthorized: super-admin only");
    };
    Lib.updateAgencyStatus(agencies, agencyId, isActive);
  };

  public query ({ caller }) func getPlatformStats() : async Common.Result<Lib.PlatformStats, Text> {
    if (not Lib.isSuperAdmin(superAdminRef.superAdmin, caller)) {
      return #err("Unauthorized: super-admin only");
    };
    #ok(Lib.getPlatformStats(agencies, invoices));
  };

  public query ({ caller }) func getAgencyActivityLog(agencyId : Common.EntityId) : async Common.Result<[Types.ActivityLogEntry], Text> {
    if (not Lib.isSuperAdmin(superAdminRef.superAdmin, caller)) {
      // Also allow agency owner to view their own log
      switch (principalToAgency.get(caller)) {
        case (?ownedAgencyId) {
          if (ownedAgencyId != agencyId) {
            return #err("Unauthorized: can only view your own agency log");
          };
        };
        case null {
          return #err("Unauthorized");
        };
      };
    };
    #ok(Lib.getAgencyActivityLog(activityLog, agencyId));
  };
};
