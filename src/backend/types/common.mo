module {
  public type Timestamp = Int;
  public type EntityId = Text;

  public type Result<T, E> = { #ok : T; #err : E };

  public type PaymentMethod = { #cash; #bank };

  public type ClientType = { #client; #supplier };

  public type BookingType = { #ticket; #visa; #umrah; #tour };

  public type BookingStatus = { #pending; #confirmed; #cancelled };

  public type InvoiceStatus = { #unpaid; #partial; #paid };

  public type VoucherType = { #receipt; #payment; #journal; #contra };

  public type InvoiceType = { #booking; #manual; #proforma; #creditNote; #debitNote };

  public type AdvanceType = { #received; #paid };
};
