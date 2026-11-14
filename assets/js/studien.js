/*
  Downloads (Studien, Vorlagen, Einseiter). Schnittstelle: Knöpfe und Verweise mit [data-studie-datei] und [data-studie-name] öffnen das <dialog data-studie-dialog>.
  Das Popup fragt eine E-Mail-Adresse ab, prüft sie und startet danach den Download der PDF unter ihrem Studiennamen.
  Mit Einwilligung (Kästchen [data-studie-einwilligung]) gehen die Adresse und die Kennung der Datei an HubSpot (ADR 0006, formular.js
  downloadNutzlast, versand.js Ziel "download"). Ein Fehler beim Senden hält den Download nicht auf. Ein gefülltes Fallenfeld
  [data-studie-falle] gilt als Bot: Er bekommt die Datei, gesendet wird nichts.
  emailGueltig(wert): reine Funktion, auch für Tests.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VianuStudien = factory();
})(this, function () {
  function emailGueltig(wert) {
    var t = String(wert == null ? "" : wert).trim();
    return t.length <= 254 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(t);
  }

  function start() {
    if (typeof document === "undefined") return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-studie-dialog]"), init);
  }

  function init(dialog) {
    var seite = dialog.closest("[data-seite]") || document;
    var knoepfe = seite.querySelectorAll("[data-studie-datei]");
    var titel = dialog.querySelector("[data-studie-titel]");
    var feld = dialog.querySelector("[data-studie-email]");
    var fehler = dialog.querySelector("[data-studie-fehler]");
    var haken = dialog.querySelector("[data-studie-einwilligung]");
    var falle = dialog.querySelector("[data-studie-falle]");
    var form = dialog.querySelector("form");
    var gewaehlt = null, ausloeser = null;
    var T = window.VianuTexte;
    function text(k) { return T ? T.text(k, null, dialog) : k; }

    function melde(k) {
      if (fehler) { fehler.textContent = k ? text(k) : ""; fehler.hidden = !k; }
      if (feld) feld.setAttribute("aria-invalid", k === "studie.fehler" ? "true" : "false");
      if (haken) haken.setAttribute("aria-invalid", k === "studie.einwilligung" ? "true" : "false");
    }
    function oeffne(knopf, ereignis) {
      // Verweise mit href laufen ohne Skript direkt zur Datei, mit Skript erst nach der E-Mail-Adresse
      if (ereignis && ereignis.preventDefault) ereignis.preventDefault();
      ausloeser = knopf;
      gewaehlt = { datei: knopf.getAttribute("data-studie-datei"), name: knopf.getAttribute("data-studie-name"), titel: knopf.getAttribute("data-studie-titel") };
      if (titel) titel.textContent = gewaehlt.titel || "";
      melde(null);
      // Die Einwilligung gilt für genau diesen Download und wird bei jedem Öffnen neu erteilt
      if (haken) haken.checked = false;
      if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
      if (feld) feld.focus();
    }
    function schliesse() { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }
    function lade() {
      var a = document.createElement("a");
      a.href = gewaehlt.datei;
      a.download = gewaehlt.name;
      a.rel = "noopener";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    // Adresse und Kennung der Datei gehen an HubSpot. Ohne Skript-Bausteine oder bei einem Fehler wird trotzdem geladen.
    function erfasse() {
      if (falle && falle.value) return;
      var F = window.VianuFormular, V = window.VianuVersand;
      if (!F || !V || !F.downloadNutzlast) return;
      var beschriftung = haken && haken.labels && haken.labels[0];
      var nutzlast = F.downloadNutzlast({ kontakt: feld.value, datei: gewaehlt.datei.split("/").pop(), einwilligung: !!(haken && haken.checked) }, {
        seite: window.location.href.split("#")[0].split("?")[0],
        titel: document.title,
        sprache: T ? T.sprache(dialog) : "",
        einwilligungText: beschriftung ? beschriftung.textContent.replace(/\s+/g, " ").trim() : ""
      });
      if (nutzlast) V.sende(nutzlast, "download");
    }
    function senden() {
      if (!gewaehlt) return;
      if (!emailGueltig(feld.value)) { melde("studie.fehler"); feld.focus(); return; }
      if (haken && !haken.checked) { melde("studie.einwilligung"); haken.focus(); return; }
      melde(null);
      erfasse();
      lade();
      schliesse();
    }

    Array.prototype.forEach.call(knoepfe, function (k) { k.addEventListener("click", function (e) { oeffne(k, e); }); });
    Array.prototype.forEach.call(dialog.querySelectorAll("[data-studie-schliessen]"), function (b) { b.addEventListener("click", schliesse); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) schliesse(); });
    dialog.addEventListener("close", function () { if (ausloeser && document.contains(ausloeser)) ausloeser.focus(); });
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); senden(); });
    if (feld) feld.addEventListener("input", function () { melde(null); });
    if (haken) haken.addEventListener("change", function () { melde(null); });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }
  return { emailGueltig: emailGueltig };
});
