/*
  Interaktionen der Mitarbeitenden-Seite. Jedes Modul arbeitet über Datenattribute und nur innerhalb
  seines Bereichs: initTeilen, initName, initTag, initMail. Der Ablauf liegt in ablauf.js.
  Benötigt name.js (VianuName) und teilen.js (VianuTeilen). Ohne Skript bleibt der Inhalt lesbar.
*/
(function () {
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function jeder(selektor, wurzel, fn) {
    Array.prototype.forEach.call((wurzel || document).querySelectorAll(selektor), fn);
  }

  /* ---------- Teilen ---------- */
  function kopiere(text, status, linkFeld, meldung) {
    function geklappt() {
      status.textContent = meldung;
      if (linkFeld) linkFeld.hidden = true;
    }
    function nichtGeklappt() {
      if (linkFeld) {
        linkFeld.hidden = false;
        linkFeld.value = text;
        linkFeld.focus();
        linkFeld.select();
      }
      status.textContent = window.VianuTexte.text("kopiert.fehler.link.du", null, status);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(geklappt, nichtGeklappt);
    } else {
      nichtGeklappt();
    }
  }

  function initTeilen(wurzel) {
    var knopf = wurzel.querySelector("[data-teilen-knopf]");
    var panel = document.getElementById(knopf.getAttribute("aria-controls"));
    var liste = wurzel.querySelector("[data-teilen-rollen]");
    var kollegen = wurzel.querySelector("[data-teilen-kollegen]");
    var status = wurzel.querySelector("[data-teilen-status]");
    var linkFeld = wurzel.querySelector("[data-teilen-link]");
    if (!knopf || !panel || !liste || !kollegen || !status || !window.VianuTeilen) return;

    window.VianuTeilen.ROLLEN.forEach(function (rolle) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "teilen__aktion";
      b.textContent = window.VianuTexte.text("rolle." + rolle.id, null, wurzel);
      b.addEventListener("click", function () {
        var link = window.VianuTeilen.linkFuerRolle(document.baseURI, rolle.id);
        kopiere(link, status, linkFeld, window.VianuTexte.text("kopiert.rolle", { rolle: window.VianuTexte.text("rolle." + rolle.id, null, wurzel) }, wurzel));
      });
      li.appendChild(b);
      liste.appendChild(li);
    });

    kollegen.addEventListener("click", function () {
      kopiere(window.VianuTeilen.linkFuerKollegen(document.baseURI), status, linkFeld, window.VianuTexte.text("kopiert.link", null, wurzel));
    });

    function setze(offen) {
      knopf.setAttribute("aria-expanded", offen ? "true" : "false");
      panel.hidden = !offen;
      if (!offen) {
        status.textContent = "";
        if (linkFeld) linkFeld.hidden = true;
      }
    }
    setze(false);

    knopf.addEventListener("click", function () {
      var offen = knopf.getAttribute("aria-expanded") !== "true";
      setze(offen);
      if (offen) panel.querySelector("button").focus();
    });
    wurzel.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) {
        setze(false);
        knopf.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (panel.hidden || wurzel.contains(e.target) || e.target.closest("[data-teilen-oeffnen]")) return;
      setze(false);
    });

    // Knöpfe an anderen Stellen der Seite öffnen das Teilen-Menü
    var seite = wurzel.closest("[data-seite]") || document;
    jeder("[data-teilen-oeffnen]", seite, function (b) {
      b.addEventListener("click", function () {
        setze(true);
        panel.querySelector("button").focus();
      });
    });
  }

  /* ---------- Namenssohle ---------- */
  function initName(wurzel) {
    var feld = wurzel.querySelector("[data-name-feld]");
    var texte = wurzel.querySelectorAll("[data-name-text]");
    var ansage = wurzel.querySelector("[data-name-ansage]");
    var firmaFeld = wurzel.querySelector("[data-firma-feld]");
    var firmaTexte = wurzel.querySelectorAll("[data-firma-text]");
    if (!feld || !texte.length || !window.VianuName) return;

    var BASIS = 40;
    var MAX_BREITE = 165;
    var FIRMA_BASIS = 13;
    var FIRMA_MAX_LAENGE = 54;
    var timer = null;
    var aktuellerName = "";
    var aktuelleFirma = "";

    // Vorlesetext für die Ansage: Name, Firma oder beides
    function melde() {
      if (!ansage) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        var schluessel = aktuellerName && aktuelleFirma ? "name.ansage.firma" : aktuellerName ? "name.ansage" : aktuelleFirma ? "name.ansage.nurfirma" : "";
        ansage.textContent = schluessel ? window.VianuTexte.text(schluessel, { name: aktuellerName, firma: aktuelleFirma }, wurzel) : "";
      }, 500);
    }

    // Firmenname hochkant im breiten Zehenbereich links auf der Sohle: schrumpft, wenn er die Länge dort überschreitet (54 Einheiten bei x=46, 5 Einheiten Abstand zum Umriss)
    function zeigeFirma(firma) {
      var leer = firma === "";
      aktuelleFirma = firma;
      Array.prototype.forEach.call(firmaTexte, function (t) {
        t.textContent = leer ? t.getAttribute("data-beispiel") : firma;
        t.setAttribute("data-leer", leer ? "true" : "false");
        t.style.fontSize = FIRMA_BASIS + "px";
      });
      var laenge = firmaTexte.length && firmaTexte[0].getComputedTextLength ? firmaTexte[0].getComputedTextLength() : 0;
      if (laenge > FIRMA_MAX_LAENGE) {
        var klein = (FIRMA_BASIS * FIRMA_MAX_LAENGE) / laenge;
        Array.prototype.forEach.call(firmaTexte, function (t) { t.style.fontSize = klein + "px"; });
      }
      melde();
    }

    function zeige(name) {
      var leer = name === "";
      Array.prototype.forEach.call(texte, function (t) {
        t.textContent = leer ? "Anna" : name;
        t.setAttribute("data-leer", leer ? "true" : "false");
        t.style.fontSize = BASIS + "px";
      });
      var breite = texte[0].getComputedTextLength ? texte[0].getComputedTextLength() : 0;
      if (breite > MAX_BREITE) {
        var klein = (BASIS * MAX_BREITE) / breite;
        Array.prototype.forEach.call(texte, function (t) { t.style.fontSize = klein + "px"; });
      }
      if (!reduziert && !leer) {
        Array.prototype.forEach.call(texte, function (t) {
          t.classList.remove("sohle__name--druck");
          void t.getBoundingClientRect();
          t.classList.add("sohle__name--druck");
        });
      }
      aktuellerName = name;
      melde();
    }

    feld.addEventListener("input", function () {
      var sauber = window.VianuName.bereinigeName(feld.value);
      if (sauber !== feld.value) feld.value = sauber;
      zeige(sauber);
    });
    zeige(window.VianuName.bereinigeName(feld.value));

    if (firmaFeld && firmaTexte.length) {
      firmaFeld.addEventListener("input", function () {
        var sauber = window.VianuName.bereinigeFirma(firmaFeld.value);
        if (sauber !== firmaFeld.value) firmaFeld.value = sauber;
        zeigeFirma(sauber);
      });
      zeigeFirma(window.VianuName.bereinigeFirma(firmaFeld.value));
    }

    // Gemessen wird nur, wo der Text Platz hat: Liegt die Sohle in einem versteckten Bereich (Gesamtvorschau) oder ist die Schrift noch nicht geladen,
    // ist die Länge 0 oder falsch. Darum wird neu angepasst, sobald die Sohle sichtbar wird und die Schrift da ist.
    function neuAnpassen() {
      if (firmaFeld && firmaTexte.length) zeigeFirma(aktuelleFirma);
      zeige(aktuellerName);
    }
    var bild = wurzel.querySelector(".sohle");
    if (bild && window.IntersectionObserver) new IntersectionObserver(function (e) { if (e[0] && e[0].isIntersecting) neuAnpassen(); }).observe(bild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(neuAnpassen);
  }

  /* ---------- Ein Tag im Schichtbetrieb ---------- */
  function initTag(wurzel) {
    var momente = wurzel.querySelectorAll("[data-moment]");
    var zeiger = wurzel.querySelector("[data-uhr-zeiger]");
    var stand = wurzel.querySelector("[data-tag-stand]");
    if (!momente.length) return;

    // Die Momente mit Uhrzeit (data-stunde) legen den Weg des Zeigers fest: erster Moment bis letzter Moment
    var mitZeit = Array.prototype.filter.call(momente, function (m) { return m.hasAttribute("data-stunde"); });
    var von = mitZeit[0];
    var bis = mitZeit[mitZeit.length - 1];
    var fortschritt = window.VianuFortschritt;
    var geplant = false;

    function mitteVon(el) {
      var r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    }
    function aktualisiere() {
      geplant = false;
      var mitte = window.innerHeight / 2;
      var naechster = momente[0];
      var abstand = Infinity;
      Array.prototype.forEach.call(momente, function (m) {
        var d = Math.abs(mitteVon(m) - mitte);
        if (d < abstand) {
          abstand = d;
          naechster = m;
        }
      });
      Array.prototype.forEach.call(momente, function (m) {
        m.setAttribute("data-aktiv", m === naechster ? "true" : "false");
      });
      if (stand) {
        var zeit = naechster.getAttribute("data-zeit");
        stand.textContent = (naechster.getAttribute("data-titel") || "") + (zeit ? " · " + zeit : "");
      }
      if (zeiger && !reduziert && fortschritt && von && bis) {
        var anteil = fortschritt.anteilZwischen(mitte, mitteVon(von), mitteVon(bis));
        var winkel = fortschritt.zeigerWinkel(anteil, Number(von.getAttribute("data-stunde")), Number(bis.getAttribute("data-stunde")));
        zeiger.style.setProperty("--winkel", winkel + "deg");
      }
    }
    function planen() {
      if (!geplant) {
        geplant = true;
        window.requestAnimationFrame(aktualisiere);
      }
    }
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    aktualisiere();
  }

  /* ---------- Mailvorlage ---------- */
  function initMail(wurzel) {
    var knopf = wurzel.querySelector("[data-mail-kopieren]");
    var box = wurzel.querySelector("[data-mail-text]");
    var status = wurzel.querySelector("[data-mail-status]");
    var oeffnen = wurzel.querySelector("[data-mail-offnen]");
    if (!knopf || !box || !status || !window.VianuTeilen) return;

    // Der feste Link im HTML trägt den Platzhalter, hier kommt der echte Link zur Seite hinein
    if (oeffnen) {
      var platzhalter = window.VianuTexte.text("platzhalter.link", null, wurzel);
      var ersatz = {};
      ersatz[platzhalter] = new URL("b2b/", window.VianuTeilen.linkFuerKollegen(document.baseURI)).href;
      oeffnen.href = window.VianuTeilen.mailtoFuerVorlage(box.textContent, ersatz);
    }

    knopf.addEventListener("click", function () {
      var b2b = new URL("b2b/", window.VianuTeilen.linkFuerKollegen(document.baseURI)).href;
      var text = box.textContent.replace(window.VianuTexte.text("platzhalter.link", null, wurzel), b2b);
      function geklappt() { status.textContent = window.VianuTexte.text("kopiert.text", null, wurzel); }
      function nichtGeklappt() {
        var bereich = document.createRange();
        bereich.selectNodeContents(box);
        var auswahl = window.getSelection();
        auswahl.removeAllRanges();
        auswahl.addRange(bereich);
        status.textContent = window.VianuTexte.text("kopiert.fehler.text.du", null, wurzel);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(geklappt, nichtGeklappt);
      else nichtGeklappt();
    });
  }

  // Jeder Schritt läuft für sich: Bricht einer ab, laufen die anderen weiter
  function start() {
    [["[data-teilen]", initTeilen], ["[data-name]", initName], ["[data-tag]", initTag], ["[data-mail]", initMail]].forEach(function (z) {
      try { jeder(z[0], document, z[1]); } catch (fehler) { if (window.console) window.console.error(fehler); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
