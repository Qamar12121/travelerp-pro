import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import TypesCS "../types/clients-suppliers";
import Common "../types/common";
import CSLib "../lib/clients-suppliers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  clients : Map.Map<Common.EntityId, TypesCS.Client>,
  clientIdCounter : { var next : Nat },
) {
  public shared ({ caller }) func addClient(
    name : Text,
    phone : Text,
    email : ?Text,
    openingBalance : Float,
    clientType : Common.ClientType,
  ) : async Common.Result<Text, Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    CSLib.addClient(clients, clientIdCounter, name, phone, email, openingBalance, clientType, caller);
  };

  public shared ({ caller }) func updateClient(
    id : Common.EntityId,
    name : Text,
    phone : Text,
    email : ?Text,
    openingBalance : Float,
  ) : async Common.Result<(), Text> {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
    CSLib.updateClient(clients, id, name, phone, email, openingBalance, caller);
  };

  public shared ({ caller }) func deleteClient(id : Common.EntityId) : async Common.Result<(), Text> {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete clients");
    };
    CSLib.deleteClient(clients, id, caller);
  };

  public query func getClients() : async [TypesCS.Client] {
    CSLib.getClients(clients);
  };

  public query func getSuppliers() : async [TypesCS.Client] {
    CSLib.getSuppliers(clients);
  };

  public query func getClientById(id : Common.EntityId) : async ?TypesCS.Client {
    CSLib.getClientById(clients, id);
  };
};
