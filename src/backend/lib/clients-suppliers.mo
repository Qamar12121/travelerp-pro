import Map "mo:core/Map";
import Time "mo:core/Time";
import TypesCS "../types/clients-suppliers";
import Common "../types/common";

module {
  public type Client = TypesCS.Client;
  public type ClientMap = Map.Map<Common.EntityId, TypesCS.Client>;

  public func addClient(
    clients : ClientMap,
    idCounter : { var next : Nat },
    name : Text,
    phone : Text,
    email : ?Text,
    openingBalance : Float,
    clientType : Common.ClientType,
    _caller : Principal,
  ) : Common.Result<Text, Text> {
    let id = "C" # idCounter.next.toText();
    idCounter.next += 1;
    let client : TypesCS.Client = {
      id;
      name;
      phone;
      email;
      openingBalance;
      clientType;
      createdAt = Time.now();
    };
    clients.add(id, client);
    #ok(id);
  };

  public func updateClient(
    clients : ClientMap,
    id : Common.EntityId,
    name : Text,
    phone : Text,
    email : ?Text,
    openingBalance : Float,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (clients.get(id)) {
      case null { #err("Client not found: " # id) };
      case (?existing) {
        clients.add(id, { existing with name; phone; email; openingBalance });
        #ok(());
      };
    };
  };

  public func deleteClient(
    clients : ClientMap,
    id : Common.EntityId,
    _caller : Principal,
  ) : Common.Result<(), Text> {
    switch (clients.get(id)) {
      case null { #err("Client not found: " # id) };
      case (?_) {
        clients.remove(id);
        #ok(());
      };
    };
  };

  public func getClients(clients : ClientMap) : [TypesCS.Client] {
    clients.values().filter(func(c) { c.clientType == #client }).toArray();
  };

  public func getSuppliers(clients : ClientMap) : [TypesCS.Client] {
    clients.values().filter(func(c) { c.clientType == #supplier }).toArray();
  };

  public func getClientById(clients : ClientMap, id : Common.EntityId) : ?TypesCS.Client {
    clients.get(id);
  };
};
