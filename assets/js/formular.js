/*
  Prüfung der Pilotanfrage. Schnittstelle: pruefeAnfrage(daten, sprache) -> { ok, fehler }, anfrageAlsText(daten, sprache), hubspotNutzlast(daten, kontext), pruefeKontakt(daten, sprache), kontaktNutzlast(daten, kontext), FIRMENGROESSEN, SCHRITTE_KONTAKT, ROLLEN, QUELLEN, quelleName(id, sprache), emailGueltig(wert), mitarbeitendeGueltig(wert, minimum), unternehmenGueltig(wert), stundenGueltig(wert), BRANCHEN, brancheName(id, sprache).
  Reine Funktionen ohne Browserbezug. hubspotNutzlast baut aus einer gültigen Anfrage die Daten für HubSpot, verschickt wird in versand.js.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./texte.js"));
  else root.VianuFormular = factory(root.VianuTexte);
})(this, function (texte) {
  var ROLLEN = [
    { id: "personal", name: "Personal" },
    { id: "geschaeftsfuehrung", name: "Geschäftsführung und Betrieb" },
    { id: "arbeitsschutz", name: "Arbeitsschutz" },
    { id: "einkauf", name: "Einkauf" },
    { id: "betriebsrat", name: "Betriebsrat" },
    { id: "andere", name: "Andere Rolle" }
  ];
  // Wie die Anfrager auf VIANU aufmerksam geworden sind. Die Antworten überschneiden sich nicht (nach Weg und Auslöser getrennt)
  // und decken alles ab: eigene Suche (KI, klassisch), soziale Netzwerke, Empfehlung (Unternehmen, Mitarbeitende),
  // Ansprache durch uns, Presse und Veranstaltungen, sonstiges. "Anderer Weg" steht immer zuletzt.
  var QUELLEN = [
    { id: "ki", name: "Suche mit einer KI" },
    { id: "suchmaschine", name: "Suche bei Google oder einer anderen Suchmaschine" },
    { id: "soziale-netzwerke", name: "Soziale Netzwerke" },
    { id: "empfehlung-unternehmen", name: "Empfehlung eines anderen Unternehmens" },
    { id: "empfehlung-mitarbeitende", name: "Empfehlung einer Mitarbeiterin oder eines Mitarbeiters" },
    { id: "kontakt-durch-vianu", name: "Kontaktaufnahme durch VIANU" },
    { id: "presse-veranstaltung", name: "Presse, Fachmedium oder Veranstaltung" },
    { id: "anderer", name: "Anderer Weg" }
  ];
  // Die Branchen sind dieselbe Liste wie die Tätigkeitskacheln auf der Startseite (docs/research/taetigkeiten.md)
  var BRANCHEN = [
    { id: "hotel-gastronomie", name: "Hotel und Gastronomie" },
    { id: "einzelhandel", name: "Einzelhandel" },
    { id: "lager-logistik", name: "Lager und Logistik" },
    { id: "produktion-industrie", name: "Produktion und Industrie" },
    { id: "pflege-gesundheit", name: "Pflege und Gesundheit" },
    { id: "handwerk-bau", name: "Handwerk und Bau" },
    { id: "reinigung-facility", name: "Reinigung und Facility" },
    { id: "sicherheit-empfang", name: "Sicherheit und Empfang" },
    { id: "bildung-betreuung", name: "Bildung und Betreuung" },
    { id: "koerpernahe-dienste", name: "Körpernahe Dienste" },
    { id: "verkehr-flughafen", name: "Verkehr und Flughafen" },
    { id: "landwirtschaft-gartenbau", name: "Landwirtschaft und Gartenbau" },
    { id: "veranstaltung-messe", name: "Veranstaltung und Messe" },
    { id: "andere-taetigkeit", name: "Andere Tätigkeit" }
  ];
  var MAX_NAME = 120;
  var MAX_FREITEXT = 500;
  var MAX_ZAHL = 100000;
  var MAX_STUNDEN = 12;

  function rolleName(id, sprache) {
    for (var i = 0; i < ROLLEN.length; i++) if (ROLLEN[i].id === id) return sprache ? texte.text("rolle." + id, null, sprache) : ROLLEN[i].name;
    return null;
  }

  function brancheName(id, sprache) {
    for (var i = 0; i < BRANCHEN.length; i++) if (BRANCHEN[i].id === id) return sprache ? texte.text("branche." + id, null, sprache) : BRANCHEN[i].name;
    return null;
  }

  // Stunden pro Tag auf den Beinen: ganze Zahl von 1 bis 12
  function stundenGueltig(wert) {
    var zahl = String(wert == null ? "" : wert).trim();
    return /^\d+$/.test(zahl) && Number(zahl) >= 1 && Number(zahl) <= MAX_STUNDEN;
  }

  function quelleName(id, sprache) {
    for (var i = 0; i < QUELLEN.length; i++) {
      if (QUELLEN[i].id !== id) continue;
      return sprache === "en" ? texte.text("quelle." + id, null, "en").replace(/ \(.*\)$/, "") : QUELLEN[i].name;
    }
    return null;
  }

  // E-Mail: etwas@etwas.etwas ohne Leerzeichen. Telefon: nur Ziffern und + ( ) / - und Leerzeichen, mindestens 6 Ziffern.
  function kontaktGueltig(wert) {
    var k = String(wert == null ? "" : wert).trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(k)) return true;
    if (!/^\+?[\d\s()\/.-]+$/.test(k)) return false;
    return (k.match(/\d/g) || []).length >= 6;
  }

  // Nur E-Mail, für die Anfrage-Strecke auf der Startseite
  function emailGueltig(wert) {
    return /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(String(wert == null ? "" : wert).trim());
  }

  // Ganze Zahl von minimum (Standard 1) bis zur Obergrenze
  function mitarbeitendeGueltig(wert, minimum) {
    var zahl = String(wert == null ? "" : wert).trim();
    if (!/^\d+$/.test(zahl)) return false;
    return Number(zahl) >= (minimum || 1) && Number(zahl) <= MAX_ZAHL;
  }

  function unternehmenGueltig(wert) {
    var name = String(wert == null ? "" : wert).trim();
    return name.length > 0 && name.length <= MAX_NAME;
  }

  function pruefeAnfrage(daten, sprache) {
    function t(k, w) { return texte.text(k, w, sprache || "de"); }
    var fehler = {};
    var name = String(daten.unternehmen == null ? "" : daten.unternehmen).trim();
    if (!name) fehler.unternehmen = t("formular.unternehmen.leer");
    else if (name.length > MAX_NAME) fehler.unternehmen = t("formular.unternehmen.lang", { max: MAX_NAME });

    if (!rolleName(daten.rolle)) fehler.rolle = t("formular.rolle");

    var zahl = String(daten.mitarbeitende == null ? "" : daten.mitarbeitende).trim();
    if (!/^\d+$/.test(zahl) || Number(zahl) < 1 || Number(zahl) > MAX_ZAHL) {
      fehler.mitarbeitende = t("formular.mitarbeitende", { max: MAX_ZAHL });
    }

    if (!brancheName(daten.branche)) fehler.branche = t("formular.branche");
    if (!stundenGueltig(daten.stunden)) fehler.stunden = t("formular.stunden", { max: MAX_STUNDEN });

    if (!kontaktGueltig(daten.kontakt)) fehler.kontakt = t("formular.kontakt");
    if (!quelleName(daten.quelle)) fehler.quelle = t("formular.quelle");
    var frei = String(daten.freitext == null ? "" : daten.freitext).trim();
    if (!frei || frei.length > MAX_FREITEXT) fehler.freitext = t("formular.freitext", { max: MAX_FREITEXT });

    var anliegen = String(daten.anliegen == null ? "" : daten.anliegen).trim();
    if (!anliegen || anliegen.length > MAX_FREITEXT) fehler.anliegen = t("formular.anliegen", { max: MAX_FREITEXT });

    if (daten.einwilligung !== true) fehler.einwilligung = t("formular.einwilligung");

    return { ok: Object.keys(fehler).length === 0, fehler: fehler };
  }

  function anfrageAlsText(daten, sprache) {
    var sp = sprache || "de";
    function t(k) { return texte.text(k, null, sp); }
    return [
      t("anfrage.titel"),
      t("anfrage.unternehmen") + ": " + String(daten.unternehmen).trim(),
      t("anfrage.rolle") + ": " + (rolleName(daten.rolle, sp) || ""),
      t("anfrage.mitarbeitende") + ": " + String(daten.mitarbeitende).trim(),
      t("anfrage.branche") + ": " + (brancheName(daten.branche, sp) || ""),
      t("anfrage.stunden") + ": " + String(daten.stunden).trim(),
      t("anfrage.kontakt") + ": " + String(daten.kontakt).trim(),
      t("anfrage.quelle") + ": " + (quelleName(daten.quelle, sp) || ""),
      t("anfrage.freitext") + ": " + String(daten.freitext).trim(),
      t("anfrage.anliegen") + ": " + String(daten.anliegen).trim()
    ].join("\n");
  }

  // Firmengrößen: interne Werte der HubSpot-Eigenschaft companysize (gleich den sichtbaren Texten)
  var FIRMENGROESSEN = ["<50", "51 - 100", "101 - 250", "251 +"];

  // Kontaktformular im Popup: welche Felder in welchem Schritt stehen (ADR 0005)
  var SCHRITTE_KONTAKT = [
    ["anliegen"],
    ["branche", "firmengroesse"],
    ["unternehmen", "rolle", "stadt"],
    ["quelle", "freitext"],
    ["vorname", "nachname", "kontakt", "einwilligung"]
  ];

  function text(wert) { return String(wert == null ? "" : wert).trim(); }

  // Pflicht: Firmengröße, Firma, Weg der Aufmerksamkeit, Vorname, Nachname, E-Mail, Einwilligung. Der Rest ist freiwillig,
  // muss aber eine bekannte Auswahl sein bzw. darf nicht zu lang sein.
  function pruefeKontakt(daten, sprache) {
    function t(k, w) { return texte.text(k, w, sprache || "de"); }
    var fehler = {};
    var anliegen = text(daten.anliegen);
    if (anliegen.length > MAX_FREITEXT) fehler.anliegen = t("formular.anliegen", { max: MAX_FREITEXT });
    if (text(daten.branche) && !brancheName(text(daten.branche))) fehler.branche = t("formular.branche");
    if (FIRMENGROESSEN.indexOf(text(daten.firmengroesse)) < 0) fehler.firmengroesse = t("formular.firmengroesse");
    var name = text(daten.unternehmen);
    if (!name) fehler.unternehmen = t("formular.unternehmen.leer");
    else if (name.length > MAX_NAME) fehler.unternehmen = t("formular.unternehmen.lang", { max: MAX_NAME });
    if (text(daten.rolle) && !rolleName(text(daten.rolle))) fehler.rolle = t("formular.rolle");
    if (text(daten.stadt).length > MAX_NAME) fehler.stadt = t("formular.stadt", { max: MAX_NAME });
    if (!quelleName(text(daten.quelle))) fehler.quelle = t("formular.quelle");
    if (text(daten.freitext).length > MAX_FREITEXT) fehler.freitext = t("formular.freitext", { max: MAX_FREITEXT });
    var vorname = text(daten.vorname);
    if (!vorname || vorname.length > MAX_NAME) fehler.vorname = t("formular.vorname", { max: MAX_NAME });
    var nachname = text(daten.nachname);
    if (!nachname || nachname.length > MAX_NAME) fehler.nachname = t("formular.nachname", { max: MAX_NAME });
    if (!emailGueltig(daten.kontakt)) fehler.kontakt = t("formular.email");
    if (daten.einwilligung !== true) fehler.einwilligung = t("formular.einwilligung");
    return { ok: Object.keys(fehler).length === 0, fehler: fehler };
  }

  // Die internen Namen der Eigenschaften in HubSpot (ADR 0004 und 0005). Die Stadt gehört zum Unternehmen (Objekt 0-2), alles andere zum Kontakt (0-1).
  // Gesendet wird die Kennung (z. B. "personal"), nicht der sichtbare Text, damit DE und EN gleich ankommen.
  var HUBSPOT = [
    ["email", "kontakt"], ["firma", "unternehmen"], ["vianu_mitarbeitende", "mitarbeitende"], ["vianu_rolle", "rolle"],
    ["vianu_stunden", "stunden"], ["vianu_branche", "branche"], ["vianu_quelle", "quelle"], ["vianu_quelle_text", "freitext"], ["message", "anliegen"],
    ["firstname", "vorname"], ["lastname", "nachname"], ["companysize", "firmengroesse"], ["city", "stadt", "0-2"]
  ];

  // Mitgeschickt wird nur die Einwilligung zur Verarbeitung der Anfrage, keine Zustimmung zu Werbe-Mails.
  // Leere Felder fehlen in der Nutzlast.
  function nutzlast(daten, kontext) {
    var k = kontext || {};
    var felder = [];
    HUBSPOT.forEach(function (p) {
      var wert = text(daten[p[1]]);
      if (wert) felder.push({ objectTypeId: p[2] || "0-1", name: p[0], value: wert });
    });
    // Sprache der Seite, damit VIANU in der Sprache der Anfrage antworten kann (Eigenschaft vianu_sprache)
    if (k.sprache === "de" || k.sprache === "en") felder.push({ objectTypeId: "0-1", name: "vianu_sprache", value: k.sprache });
    return {
      fields: felder,
      context: { pageUri: k.seite || "", pageName: k.titel || "" },
      legalConsentOptions: { consent: { consentToProcess: true, text: k.einwilligungText || "" } }
    };
  }

  // kontext: { seite, titel, einwilligungText, sprache }. Ohne gültige Anfrage gibt es nichts zu senden (null).
  function hubspotNutzlast(daten, kontext) {
    return pruefeAnfrage(daten).ok ? nutzlast(daten, kontext) : null;
  }
  function kontaktNutzlast(daten, kontext) {
    return pruefeKontakt(daten).ok ? nutzlast(daten, kontext) : null;
  }

  return { pruefeAnfrage: pruefeAnfrage, hubspotNutzlast: hubspotNutzlast, pruefeKontakt: pruefeKontakt, kontaktNutzlast: kontaktNutzlast, FIRMENGROESSEN: FIRMENGROESSEN, SCHRITTE_KONTAKT: SCHRITTE_KONTAKT, anfrageAlsText: anfrageAlsText, ROLLEN: ROLLEN, QUELLEN: QUELLEN, BRANCHEN: BRANCHEN, stundenGueltig: stundenGueltig, brancheName: brancheName, quelleName: quelleName, emailGueltig: emailGueltig, mitarbeitendeGueltig: mitarbeitendeGueltig, unternehmenGueltig: unternehmenGueltig };
});
