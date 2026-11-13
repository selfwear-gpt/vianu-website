/*
  Pilot-Popup. Schnittstelle: Elemente mit [data-pilot-oeffnen] öffnen zuerst die Wahl <dialog data-kontaktwahl> (Formular oder
  Telefon), danach das <dialog data-pilot-dialog>. Mit data-direkt-formular am Auslöser oder ohne Wahl-Dialog geht es direkt zum Formular.
  Elemente mit [data-telefon-oeffnen] (Hörer im Chat) zeigen nur den Telefonweg. Auf dem Handy startet er die Telefon-App (tel:),
  auf größeren Bildschirmen zeigt er die Nummer mit Knopf zum Kopieren. Das Formular öffnet auch per Ereignis pilot:formular.
  Das Formular öffnet auch bei #pilot oder ?pilot in der Adresse und trägt gemerkte Angaben ein (sitzung.js). Schließen mit Knopf, Esc oder Klick auf den Hintergrund,
  der Fokus kehrt zum Auslöser zurück. Ohne Skript bleiben die Verweise #pilot Sprünge zum Abschnitt am Seitenende.
*/
(function () {
  function init(dialog) {
    var ausloeser = null;
    // In der Gesamtvorschau liegen mehrere Seiten in einem Dokument: Auslöser gehören zur Seite des Popups
    var seite = dialog.closest("[data-seite]") || document;
    var oeffnen = seite.querySelectorAll("[data-pilot-oeffnen]");

    var wahl = seite.querySelector("[data-kontaktwahl]");
    var telefonKnoepfe = seite.querySelectorAll("[data-telefon-oeffnen]");
    var handy = window.matchMedia ? window.matchMedia("(pointer: coarse) and (max-width: 56rem)") : { matches: false };

    function zeige() {
      if (dialog.open) return;
      if (wahl && wahl.open) wahl.close();
      if (window.VianuSitzung) {
        var vorgabe = dialog.getAttribute("data-rolle-vorgabe");
        var rolle = dialog.querySelector('[data-feld="rolle"]');
        window.VianuSitzung.fuelle(dialog);
        // Die Rolle der besuchten Seite ist nur eine Vorgabe: Sie wird nicht gemerkt, solange die Person keine Rolle gewählt hat
        if (vorgabe && rolle && !rolle.value) rolle.value = vorgabe;
      }
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      var erstes = dialog.querySelector("input, select, textarea");
      if (erstes) erstes.focus();
    }
    function schliesse() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    function zeigeWahl(nurTelefon) {
      if (!wahl) { zeige(); return; }
      if (wahl.open) return;
      wahl.setAttribute("data-modus", nurTelefon ? "telefon" : "wahl");
      var feld = wahl.querySelector("[data-wahl-telefon-feld]");
      var status = wahl.querySelector("[data-tel-status]");
      if (status) status.textContent = "";
      if (feld) feld.hidden = !nurTelefon;
      if (typeof wahl.showModal === "function") wahl.showModal();
      else wahl.setAttribute("open", "");
      var erstes = wahl.querySelector(nurTelefon ? "[data-tel-kopieren], [data-tel-link]" : "[data-wahl-formular]");
      if (erstes) erstes.focus();
    }
    function schliesseWahl() {
      if (!wahl) return;
      if (typeof wahl.close === "function") wahl.close();
      else wahl.removeAttribute("open");
    }
    // Zeigt den Telefonweg: auf dem Handy startet die Telefon-App, sonst stehen Nummer und Kopierknopf da
    function telefon() {
      var link = wahl ? wahl.querySelector("[data-tel-link]") : null;
      if (handy.matches && link) { window.location.href = link.getAttribute("href"); return; }
      var feld = wahl ? wahl.querySelector("[data-wahl-telefon-feld]") : null;
      if (feld) { feld.hidden = false; var k = wahl.querySelector("[data-tel-kopieren]"); if (k) k.focus(); }
    }
    function kopiere(knopf) {
      var nummer = wahl.querySelector("[data-tel-nummer]");
      var status = wahl.querySelector("[data-tel-status]");
      var text = nummer ? nummer.textContent.trim() : "";
      function ok() { if (status) status.textContent = knopf.getAttribute("data-ok"); }
      function nicht() { if (status) status.textContent = knopf.getAttribute("data-fehler"); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, nicht);
      else nicht();
    }

    Array.prototype.forEach.call(oeffnen, function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        ausloeser = a;
        if (a.hasAttribute("data-direkt-formular")) zeige();
        else zeigeWahl(false);
      });
    });
    // Auslöser ohne eigene Tastenbedienung (z. B. ein Wort in einer Grafik mit role="link") öffnen auch mit Enter und Leertaste
    Array.prototype.forEach.call(oeffnen, function (a) {
      if (/^(A|BUTTON)$/.test(a.tagName)) return;
      a.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); a.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
      });
    });
    // Hörer im Chat: auf dem Handy ruft der Link direkt an, sonst erscheint der Telefonweg ohne Formular
    Array.prototype.forEach.call(telefonKnoepfe, function (a) {
      a.addEventListener("click", function (e) {
        ausloeser = a;
        if (handy.matches) return;
        e.preventDefault();
        zeigeWahl(true);
      });
    });
    dialog.addEventListener("pilot:formular", function () { zeige(); });
    if (wahl) {
      Array.prototype.forEach.call(wahl.querySelectorAll("[data-wahl-schliessen]"), function (b) { b.addEventListener("click", schliesseWahl); });
      var formularKnopf = wahl.querySelector("[data-wahl-formular]");
      if (formularKnopf) formularKnopf.addEventListener("click", zeige);
      var telefonKnopf = wahl.querySelector("[data-wahl-telefon]");
      if (telefonKnopf) telefonKnopf.addEventListener("click", telefon);
      var kopierKnopf = wahl.querySelector("[data-tel-kopieren]");
      if (kopierKnopf) kopierKnopf.addEventListener("click", function () { kopiere(kopierKnopf); });
      wahl.addEventListener("click", function (e) { if (e.target === wahl) schliesseWahl(); });
      wahl.addEventListener("close", function () { if (!dialog.open && ausloeser && document.contains(ausloeser)) ausloeser.focus(); });
    }
    Array.prototype.forEach.call(dialog.querySelectorAll("[data-pilot-schliessen]"), function (b) {
      b.addEventListener("click", schliesse);
    });
    // Klick auf den abgedunkelten Hintergrund (außerhalb des Inhalts) schließt
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) schliesse();
    });
    dialog.addEventListener("close", function () {
      if (ausloeser && document.contains(ausloeser)) ausloeser.focus();
      if (/#pilot$/.test(window.location.hash) && window.history && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });

    if (!dialog.closest("[data-seite]")) {
      if (/(^|[?&])pilot($|[&=])/.test(window.location.search) || window.location.hash === "#pilot") zeige();
      window.addEventListener("hashchange", function () { if (window.location.hash === "#pilot") zeige(); });
    }
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pilot-dialog]"), init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
