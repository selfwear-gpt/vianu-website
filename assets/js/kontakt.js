/*
  Kontaktformular im Popup in Schritten (ADR 0005). Schnittstelle: ein Formular [data-kontakt] mit Schritten [data-schritt],
  Fortschritt [data-kontakt-fortschritt] (Zahl [data-kontakt-schrittzahl], Balken [data-kontakt-balken]), Knöpfen
  [data-kontakt-zurueck], [data-kontakt-weiter], [data-kontakt-absenden], Statuszeile [data-kontakt-status],
  Fallenfeld [data-falle] und daneben der Dank [data-kontakt-dank].
  Welche Felder in welchem Schritt stehen und was Pflicht ist, steht in formular.js (SCHRITTE_KONTAKT, pruefeKontakt).
  Weiter prüft nur den aktuellen Schritt. Abgeschickt wird erst im letzten Schritt, dann geht die Anfrage über versand.js an HubSpot.
  Ohne Skript stehen alle Schritte untereinander.
*/
(function () {
  function init(form) {
    var F = window.VianuFormular;
    var T = window.VianuTexte;
    if (!F || !T) return;
    var schritte = form.querySelectorAll("[data-schritt]");
    var anzahl = schritte.length;
    if (anzahl !== F.SCHRITTE_KONTAKT.length) return;
    var fortschritt = form.querySelector("[data-kontakt-fortschritt]");
    var zahl = form.querySelector("[data-kontakt-schrittzahl]");
    var balken = form.querySelector("[data-kontakt-balken]");
    var zurueck = form.querySelector("[data-kontakt-zurueck]");
    var weiter = form.querySelector("[data-kontakt-weiter]");
    var absenden = form.querySelector("[data-kontakt-absenden]");
    var status = form.querySelector("[data-kontakt-status]");
    var falle = form.querySelector("[data-falle]");
    var dank = form.parentNode.querySelector("[data-kontakt-dank]");
    var felder = {};
    var fehler = {};
    Array.prototype.forEach.call(form.querySelectorAll("[data-feld]"), function (f) { felder[f.getAttribute("data-feld")] = f; });
    Array.prototype.forEach.call(form.querySelectorAll("[data-fehler]"), function (f) { fehler[f.getAttribute("data-fehler")] = f; });
    var aktuell = 1;
    var sendet = false;

    function daten() {
      var d = {};
      Object.keys(felder).forEach(function (n) { d[n] = felder[n].type === "checkbox" ? felder[n].checked : felder[n].value; });
      return d;
    }
    function melde(schluessel) { if (status) status.textContent = schluessel ? T.text(schluessel, null, form) : ""; }

    // Zeigt die Fehler der genannten Felder und gibt das erste ungültige Feld zurück
    function zeigeFehler(namen) {
      var r = F.pruefeKontakt(daten(), T.sprache(form));
      var erstes = null;
      namen.forEach(function (n) {
        var meldung = r.fehler[n];
        if (fehler[n]) { fehler[n].hidden = !meldung; fehler[n].textContent = meldung || ""; }
        if (!felder[n]) return;
        if (meldung) { felder[n].setAttribute("aria-invalid", "true"); if (!erstes) erstes = felder[n]; }
        else felder[n].removeAttribute("aria-invalid");
      });
      return erstes;
    }

    function zeige(nr, fokus) {
      aktuell = nr;
      Array.prototype.forEach.call(schritte, function (s, i) { s.hidden = i + 1 !== nr; });
      if (zahl) zahl.textContent = T.text("kontakt.schritt", { nr: nr, von: anzahl }, form);
      if (balken) balken.style.setProperty("--anteil", String(nr / anzahl));
      if (zurueck) zurueck.hidden = nr === 1;
      if (weiter) weiter.hidden = nr === anzahl;
      if (absenden) absenden.hidden = nr !== anzahl;
      if (fokus) {
        var ziel = schritte[nr - 1].querySelector("input, select, textarea");
        if (ziel) ziel.focus();
      }
    }

    function vor() {
      var erstes = zeigeFehler(F.SCHRITTE_KONTAKT[aktuell - 1]);
      if (erstes) { erstes.focus(); return; }
      melde("");
      zeige(aktuell + 1, true);
    }

    if (fortschritt) fortschritt.hidden = false;
    if (zahl) zahl.setAttribute("aria-live", "polite");
    if (weiter) weiter.addEventListener("click", vor);
    if (zurueck) zurueck.addEventListener("click", function () { melde(""); zeige(aktuell - 1, true); });

    // Enter in einem Eingabefeld geht einen Schritt weiter, erst im letzten Schritt wird abgeschickt
    form.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !e.target || e.target.tagName !== "INPUT" || e.target.type === "checkbox") return;
      if (aktuell === anzahl) return;
      e.preventDefault();
      vor();
    });

    Object.keys(felder).forEach(function (n) {
      felder[n].addEventListener(felder[n].type === "checkbox" || felder[n].tagName === "SELECT" ? "change" : "input", function () {
        if (fehler[n] && !fehler[n].hidden) { fehler[n].hidden = true; felder[n].removeAttribute("aria-invalid"); }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sendet) return;
      if (aktuell !== anzahl) { vor(); return; }
      // Alles prüfen: Ist ein früherer Schritt ungültig (z. B. nach Zurück geändert), springt das Formular dorthin
      for (var i = 0; i < anzahl; i++) {
        var erstes = zeigeFehler(F.SCHRITTE_KONTAKT[i]);
        if (erstes) { zeige(i + 1, false); erstes.focus(); return; }
      }
      function fertig() {
        form.hidden = true;
        if (dank) { dank.hidden = false; dank.focus(); }
      }
      // Fallenfeld gefüllt: ein Bot. Er sieht den Dank, gesendet wird nichts.
      if (falle && falle.value) { sendet = true; fertig(); return; }
      var einwilligung = felder.einwilligung && felder.einwilligung.labels && felder.einwilligung.labels[0];
      var nutzlast = F.kontaktNutzlast(daten(), {
        seite: window.location.href.split("#")[0].split("?")[0],
        titel: document.title,
        sprache: T.sprache(form),
        einwilligungText: einwilligung ? einwilligung.textContent.replace(/\s+/g, " ").trim() : ""
      });
      if (!nutzlast || !window.VianuVersand) { melde("strecke.fehler"); return; }
      sendet = true;
      absenden.disabled = true;
      melde("strecke.sendet");
      window.VianuVersand.sende(nutzlast, "kontakt").then(function (ok) {
        if (ok) { melde(""); fertig(); return; }
        sendet = false;
        absenden.disabled = false;
        melde("strecke.fehler");
      });
    });

    zeige(1, false);
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-kontakt]"), init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
