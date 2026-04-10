import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Int "mo:core/Int";
import Common "../types/common";
import Types "../types/users-agencies";
import TypesBI "../types/bookings-invoices";

module {

  // ── helpers ───────────────────────────────────────────────────────────────

  func nextId(counter : { var next : Nat }) : Common.EntityId {
    let id = counter.next;
    counter.next += 1;
    id.toText();
  };

  func countNonOwnerAgents(agents : Types.AgentMap, agencyId : Common.EntityId) : Nat {
    agents.entries()
      .filter(func((_, a)) { a.agencyId == agencyId and a.role == #agent })
      .size();
  };

  // ── super-admin ───────────────────────────────────────────────────────────

  public func isSuperAdmin(superAdminPrincipal : ?Principal, caller : Principal) : Bool {
    switch (superAdminPrincipal) {
      case (?p) { Principal.equal(p, caller) };
      case null { false };
    };
  };

  public func setSuperAdminPrincipal(
    superAdminRef : { var superAdmin : ?Principal },
    caller : Principal,
  ) : Common.Result<(), Text> {
    switch (superAdminRef.superAdmin) {
      case null {
        superAdminRef.superAdmin := ?caller;
        #ok(());
      };
      case (?existing) {
        if (not Principal.equal(existing, caller)) {
          return #err("Unauthorized: only current super-admin can change super-admin");
        };
        superAdminRef.superAdmin := ?caller;
        #ok(());
      };
    };
  };

  // ── agency ────────────────────────────────────────────────────────────────

  public func createAgency(
    agencies : Types.AgencyMap,
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    principalToAgent : Types.PrincipalToAgentMap,
    idCounter : { var next : Nat },
    caller : Principal,
    agencyName : Text,
  ) : Common.Result<Types.Agency, Text> {
    if (principalToAgency.containsKey(caller)) {
      return #err("Agency already exists for this principal");
    };
    let agencyId = nextId(idCounter);
    let ownerId = nextId(idCounter);
    let now = Time.now();
    let agency : Types.Agency = {
      id = agencyId;
      ownerPrincipal = caller;
      agencyName = agencyName;
      logoUrl = null;
      isActive = true;
      isOnboarded = false;
      phone = null;
      country = null;
      timezone = null;
      createdAt = now;
      totalAgents = 0;
    };
    let ownerProfile : Types.AgentProfile = {
      id = ownerId;
      agencyId = agencyId;
      principal = ?caller;
      email = "";
      name = agencyName # " Owner";
      role = #owner;
      isActive = true;
      createdAt = now;
      createdBy = caller;
    };
    agencies.add(agencyId, agency);
    agents.add(ownerId, ownerProfile);
    principalToAgency.add(caller, agencyId);
    principalToAgent.add(caller, ownerId);
    #ok(agency);
  };

  public func getAgencyByOwner(
    agencies : Types.AgencyMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    caller : Principal,
  ) : ?Types.Agency {
    switch (principalToAgency.get(caller)) {
      case (?agencyId) { agencies.get(agencyId) };
      case null { null };
    };
  };

  public func getAgencyById(
    agencies : Types.AgencyMap,
    agencyId : Common.EntityId,
  ) : ?Types.Agency {
    agencies.get(agencyId);
  };

  public func updateAgencyProfile(
    agencies : Types.AgencyMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    caller : Principal,
    newName : ?Text,
    newLogoUrl : ?Text,
  ) : Common.Result<Types.Agency, Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("No agency found for caller") };
      case (?agencyId) {
        switch (agencies.get(agencyId)) {
          case null { #err("Agency not found") };
          case (?agency) {
            let updated : Types.Agency = {
              agency with
              agencyName = switch (newName) { case (?n) n; case null agency.agencyName };
              logoUrl = switch (newLogoUrl) { case (?l) ?l; case null agency.logoUrl };
            };
            agencies.add(agencyId, updated);
            #ok(updated);
          };
        };
      };
    };
  };

  public func updateAgencyStatus(
    agencies : Types.AgencyMap,
    agencyId : Common.EntityId,
    isActive : Bool,
  ) : Common.Result<(), Text> {
    switch (agencies.get(agencyId)) {
      case null { #err("Agency not found") };
      case (?agency) {
        agencies.add(agencyId, { agency with isActive = isActive });
        #ok(());
      };
    };
  };

  public func getAllAgencies(agencies : Types.AgencyMap) : [Types.Agency] {
    agencies.values().toArray();
  };

  public func completeOnboarding(
    agencies : Types.AgencyMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    caller : Principal,
    phone : ?Text,
    country : ?Text,
    timezone : ?Text,
  ) : Common.Result<Types.Agency, Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("No agency found for caller") };
      case (?agencyId) {
        switch (agencies.get(agencyId)) {
          case null { #err("Agency not found") };
          case (?agency) {
            let updated : Types.Agency = {
              agency with
              isOnboarded = true;
              phone = switch (phone) { case (?p) ?p; case null agency.phone };
              country = switch (country) { case (?c) ?c; case null agency.country };
              timezone = switch (timezone) { case (?t) ?t; case null agency.timezone };
            };
            agencies.add(agencyId, updated);
            #ok(updated);
          };
        };
      };
    };
  };

  // ── agents ────────────────────────────────────────────────────────────────

  public func addAgent(
    agencies : Types.AgencyMap,
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    idCounter : { var next : Nat },
    caller : Principal,
    name : Text,
    email : Text,
  ) : Common.Result<Types.AgentProfile, Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("Caller is not an agency owner") };
      case (?agencyId) {
        switch (agencies.get(agencyId)) {
          case null { #err("Agency not found") };
          case (?agency) {
            if (not agency.isActive) {
              return #err("Agency is inactive");
            };
            if (countNonOwnerAgents(agents, agencyId) >= 4) {
              return #err("Maximum of 4 agents per agency reached");
            };
            let agentId = nextId(idCounter);
            let now = Time.now();
            let agentProfile : Types.AgentProfile = {
              id = agentId;
              agencyId = agencyId;
              principal = null;
              email = email;
              name = name;
              role = #agent;
              isActive = true;
              createdAt = now;
              createdBy = caller;
            };
            agents.add(agentId, agentProfile);
            agencies.add(agencyId, { agency with totalAgents = agency.totalAgents + 1 });
            #ok(agentProfile);
          };
        };
      };
    };
  };

  public func removeAgent(
    agencies : Types.AgencyMap,
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    principalToAgent : Types.PrincipalToAgentMap,
    caller : Principal,
    agentId : Common.EntityId,
  ) : Common.Result<(), Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("Caller is not an agency owner") };
      case (?agencyId) {
        switch (agents.get(agentId)) {
          case null { #err("Agent not found") };
          case (?agent) {
            if (agent.agencyId != agencyId) {
              return #err("Agent does not belong to caller's agency");
            };
            if (agent.role == #owner) {
              return #err("Cannot remove owner");
            };
            switch (agent.principal) {
              case (?p) { principalToAgent.remove(p) };
              case null {};
            };
            agents.remove(agentId);
            switch (agencies.get(agencyId)) {
              case (?agency) {
                let newCount : Nat = if (agency.totalAgents > 0) agency.totalAgents - 1 else 0;
                agencies.add(agencyId, { agency with totalAgents = newCount });
              };
              case null {};
            };
            #ok(());
          };
        };
      };
    };
  };

  public func toggleAgentAccess(
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    caller : Principal,
    agentId : Common.EntityId,
    isActive : Bool,
  ) : Common.Result<(), Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("Caller is not an agency owner") };
      case (?agencyId) {
        switch (agents.get(agentId)) {
          case null { #err("Agent not found") };
          case (?agent) {
            if (agent.agencyId != agencyId) {
              return #err("Agent does not belong to caller's agency");
            };
            if (agent.role == #owner) {
              return #err("Cannot toggle owner access");
            };
            agents.add(agentId, { agent with isActive = isActive });
            #ok(());
          };
        };
      };
    };
  };

  public func getAgentsByAgency(
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    caller : Principal,
  ) : Common.Result<[Types.AgentProfile], Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("No agency found for caller") };
      case (?agencyId) {
        let result = agents.values()
          .filter(func(a) { a.agencyId == agencyId })
          .toArray();
        #ok(result);
      };
    };
  };

  public func getAgentByPrincipal(
    agents : Types.AgentMap,
    principalToAgent : Types.PrincipalToAgentMap,
    p : Principal,
  ) : ?Types.AgentProfile {
    switch (principalToAgent.get(p)) {
      case (?agentId) { agents.get(agentId) };
      case null { null };
    };
  };

  public func linkAgentPrincipal(
    agents : Types.AgentMap,
    principalToAgency : Types.PrincipalToAgencyMap,
    principalToAgent : Types.PrincipalToAgentMap,
    caller : Principal,
    agentId : Common.EntityId,
    newPrincipal : Principal,
  ) : Common.Result<(), Text> {
    switch (principalToAgency.get(caller)) {
      case null { #err("Caller is not an agency owner") };
      case (?agencyId) {
        switch (agents.get(agentId)) {
          case null { #err("Agent not found") };
          case (?agent) {
            if (agent.agencyId != agencyId) {
              return #err("Agent does not belong to caller's agency");
            };
            if (agent.role == #owner) {
              return #err("Cannot re-link owner principal");
            };
            if (principalToAgent.containsKey(newPrincipal)) {
              return #err("Principal already linked to another agent");
            };
            switch (agent.principal) {
              case (?oldP) { principalToAgent.remove(oldP) };
              case null {};
            };
            agents.add(agentId, { agent with principal = ?newPrincipal });
            principalToAgent.add(newPrincipal, agentId);
            #ok(());
          };
        };
      };
    };
  };

  // ── stats ─────────────────────────────────────────────────────────────────

  public func computeAgencyStats(
    agents : Types.AgentMap,
    agencyId : Common.EntityId,
  ) : Types.AgencyStats {
    let activeAgents = agents.values()
      .filter(func(a) { a.agencyId == agencyId and a.isActive })
      .size();
    {
      totalBookings = 0;
      totalRevenue = 0.0;
      totalProfit = 0.0;
      activeAgents = activeAgents;
      lastActivityAt = null;
    };
  };

  // ── platform stats (super-admin) ──────────────────────────────────────────

  public type PlatformStats = {
    totalAgencies : Nat;
    activeAgencies : Nat;
    totalRevenue : Float;
    totalRefunds : Float;
    refundRate : Float;
  };

  public func getPlatformStats(
    agencies : Types.AgencyMap,
    invoices : Map.Map<Common.EntityId, TypesBI.Invoice>,
  ) : PlatformStats {
    let totalAgencies = agencies.size();
    let activeAgencies = agencies.values().filter(func(a) { a.isActive }).size();

    var totalRevenue : Float = 0.0;
    var totalRefunds : Float = 0.0;

    invoices.values().forEach(func(inv) {
      if (inv.invoiceType == #creditNote) {
        // refundedInvoiceId present means it's a refund
        totalRefunds += -(inv.amount); // amount is negative, negate to get positive
      } else {
        totalRevenue += inv.amount;
      };
    });

    let refundRate : Float = if (totalRevenue > 0.0) {
      totalRefunds / totalRevenue * 100.0;
    } else { 0.0 };

    { totalAgencies; activeAgencies; totalRevenue; totalRefunds; refundRate };
  };

  // ── activity log ──────────────────────────────────────────────────────────

  public func addActivityLog(
    activityLog : Types.ActivityLogMap,
    idCounter : { var next : Nat },
    agencyId : Common.EntityId,
    eventType : Text,
    description : Text,
    actorId : ?Text,
  ) {
    let id = "LOG-" # idCounter.next.toText();
    idCounter.next += 1;
    let entry : Types.ActivityLogEntry = {
      id;
      agencyId;
      eventType;
      description;
      timestamp = Time.now();
      actorId;
    };
    activityLog.add(id, entry);
  };

  public func getAgencyActivityLog(
    activityLog : Types.ActivityLogMap,
    agencyId : Common.EntityId,
  ) : [Types.ActivityLogEntry] {
    let all = activityLog.values()
      .filter(func(e) { e.agencyId == agencyId })
      .toArray();
    // Sort descending by timestamp, return last 100
    let sorted = all.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
    if (sorted.size() <= 100) {
      sorted;
    } else {
      sorted.sliceToArray(0, 100);
    };
  };
};
