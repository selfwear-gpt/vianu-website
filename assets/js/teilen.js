/*
  Links, die beim Teilen kopiert werden. Schnittstelle: linkFuerKollegen(basis), linkFuerRolle(basis, rolle), mailtoFuerVorlage(text, ersatz), ROLLEN.
  Reine Funktionen ohne Browserbezug.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VianuTeilen = factory();
})(this, function () {
  function startseite(basis) {
    return new URL(".", new URL(basis));
  }

  function linkFuerKollegen(basis) {
    return startseite(basis).href;
  }

  var QUELLE = "mitarbeitende";

  var ROLLEN = [
    { id: "personal", name: "Personal" },
    { id: "geschaeftsfuehrung", name: "Geschäftsführung und Betrieb" },
    { id: "arbeitsschutz", name: "Arbeitsschutz" },
    { id: "einkauf", name: "Einkauf" },
    { id: "betriebsrat", name: "Betriebsrat" }
  ];

  function linkFuerRolle(basis, rolle) {
    var bekannt = ROLLEN.some(function (r) { return r.id === rolle; });
    if (!bekannt) return null;
    var url = new URL("b2b/" + rolle + ".html", startseite(basis));
    url.searchParams.set("quelle", QUELLE);
    return url.href;
  }

  // Mailvorlage als mailto-Link: erste Zeile "Betreff: ..." (englisch "Subject: ...") wird zum Betreff, der Rest zum Text.
  // ersatz tauscht Platzhalter gegen Werte, etwa den Link zur Seite. Kein Empfänger, den trägt die Person selbst ein.
  function mailtoFuerVorlage(text, ersatz) {
    var t = String(text).replace(/\r\n/g, "\n").trim();
    Object.keys(ersatz || {}).forEach(function (platzhalter) {
      t = t.split(platzhalter).join(ersatz[platzhalter]);
    });
    var m = t.match(/^(?:Betreff|Subject):[ \t]*([^\n]*)\n*/);
    var betreff = m ? m[1].trim() : "";
    var text2 = (m ? t.slice(m[0].length) : t).replace(/\n/g, "\r\n");
    return "mailto:?subject=" + encodeURIComponent(betreff) + "&body=" + encodeURIComponent(text2);
  }

  return { linkFuerKollegen: linkFuerKollegen, linkFuerRolle: linkFuerRolle, mailtoFuerVorlage: mailtoFuerVorlage, ROLLEN: ROLLEN };
});
