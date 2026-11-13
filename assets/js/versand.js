/*
  Versand an HubSpot. Schnittstelle: VianuVersand.sende(nutzlast, ziel[, abruf]) -> Promise<boolean>, VianuVersand.ADRESSEN.
  ziel "strecke": Anfrage-Strecke an das Formular "VIANU_Anfrage_Strecke_DE" (ADR 0004).
  ziel "kontakt": Kontaktformular im Popup an das Formular "B2E_Contact_HoReCa_DE" (ADR 0005).
  Portal 148774847, Region EU. Gesendet wird erst beim Absenden, beim Laden der Seite geht nichts an HubSpot.
  true heißt: HubSpot hat mit 2xx geantwortet. Bei Fehler, Netzausfall, fehlender Nutzlast oder unbekanntem Ziel kommt false.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VianuVersand = factory();
})(this, function () {
  var BASIS = "https://api-eu1.hsforms.com/submissions/v3/integration/submit/148774847/";
  var ADRESSEN = {
    strecke: BASIS + "25ad3edf-217a-44f3-9620-20c39402c65c",
    kontakt: BASIS + "82eaa356-32c7-4201-a4da-407abd285d1a"
  };

  function sende(nutzlast, ziel, abruf) {
    var hole = abruf || (typeof fetch === "function" ? fetch : null);
    var adresse = Object.prototype.hasOwnProperty.call(ADRESSEN, ziel) ? ADRESSEN[ziel] : null;
    if (!nutzlast || !hole || !adresse) return Promise.resolve(false);
    return Promise.resolve()
      .then(function () {
        return hole(adresse, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nutzlast), credentials: "omit" });
      })
      .then(function (antwort) { return !!(antwort && antwort.ok); }, function () { return false; });
  }

  return { sende: sende, ADRESSEN: ADRESSEN };
});
