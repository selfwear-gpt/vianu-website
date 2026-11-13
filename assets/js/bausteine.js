/*
  Bausteine der Rollenseiten. Schnittstelle: Elemente mit [data-pruefliste], [data-fluss] und [data-filter] arbeiten für sich.
  Prüfliste: Schalter zum Abhaken, nur Ansicht, nichts wird gespeichert. Ab drei Haken erscheint [data-pruefliste-pilot]. Datenfluss: ein Feld pro Knoten, der gewählte Knoten zeigt seinen Text.
  Filter: blendet Zeilen der Statusliste nach Status ein und aus. Ohne Skript stehen alle Inhalte lesbar da.
  Chat-Brief [data-chat]: die Nachrichten stehen im HTML, das Skript blendet sie beim Scrollen nacheinander ein (in Rahmen ohne Scrollen per Mausrad, Wisch oder Tipp), vorher erscheinen Tippen-Punkte.
  Das Menü "Chat von vorne starten" setzt zurück. Eingabefeld, Mikro- und Sendeknopf öffnen das Kontaktformular (Nachricht im Feld "Anliegen").
  Versteckte Seiten der Gesamtvorschau starten erst, wenn sie sichtbar werden. Bei reduzierter Bewegung und ohne Skript stehen alle Nachrichten sofort da. Ergebnisbild [data-ergebnis]: der Balken baut sich beim Sichtbarwerden auf.
  Tagesordnung [data-tagesordnung]: aufklappbare Zeilen. Bestellstrecke [data-bestellstrecke]: Stationen füllen sich beim Scrollen (benötigt fortschritt.js, ohne Skript stehen alle Stationen da).
  Umfrage [data-umfrage]: Antworten sind nur zur Ansicht antippbar, nichts wird gespeichert. Ab drei Antworten erscheint [data-umfrage-pilot].
*/
(function () {
  function jeder(selektor, fn) { Array.prototype.forEach.call(document.querySelectorAll(selektor), fn); }

  function initPruefliste(wurzel) {
    var zeilen = wurzel.querySelectorAll(".pruefliste__zeile");
    var zahl = wurzel.querySelector("[data-pruefliste-zahl]");
    var pilot = wurzel.querySelector("[data-pruefliste-pilot]");
    function zaehle() {
      var n = 0;
      Array.prototype.forEach.call(zeilen, function (z) { if (z.getAttribute("aria-pressed") === "true") n++; });
      if (zahl) zahl.textContent = String(n);
      if (pilot) pilot.hidden = n < UMFRAGE_SCHWELLE;
    }
    Array.prototype.forEach.call(zeilen, function (z) {
      z.addEventListener("click", function () {
        z.setAttribute("aria-pressed", z.getAttribute("aria-pressed") === "true" ? "false" : "true");
        zaehle();
      });
    });
    zaehle();
  }

  function initFluss(wurzel) {
    var knoten = wurzel.querySelectorAll("[data-fluss-knoten]");
    var felder = wurzel.querySelectorAll("[data-fluss-feld]");
    if (!knoten.length || knoten.length !== felder.length) return;
    function waehle(nr, fokus) {
      Array.prototype.forEach.call(knoten, function (k) {
        var an = k.getAttribute("data-fluss-knoten") === nr;
        k.setAttribute("aria-pressed", an ? "true" : "false");
        if (an && fokus) k.focus();
      });
      Array.prototype.forEach.call(felder, function (f) { f.hidden = f.getAttribute("data-fluss-feld") !== nr; });
      Array.prototype.forEach.call(wurzel.querySelectorAll("[data-fluss-punkt]"), function (p) {
        if (p.getAttribute("data-fluss-punkt") === nr) p.setAttribute("data-aktiv", "");
        else p.removeAttribute("data-aktiv");
      });
    }
    var zeiger = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
    Array.prototype.forEach.call(knoten, function (k, i) {
      k.addEventListener("click", function () { waehle(k.getAttribute("data-fluss-knoten")); });
      // Mit der Maus öffnet schon das Darüberfahren den Punkt
      if (wurzel.hasAttribute("data-fluss-hover")) {
        k.parentNode.addEventListener("mouseenter", function () { if (zeiger && zeiger.matches) waehle(k.getAttribute("data-fluss-knoten")); });
      }
      k.addEventListener("keydown", function (e) {
        var ziel = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") ziel = (i + 1) % knoten.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ziel = (i - 1 + knoten.length) % knoten.length;
        if (ziel === null) return;
        e.preventDefault();
        waehle(knoten[ziel].getAttribute("data-fluss-knoten"), true);
      });
    });
    waehle("1");
  }

  function initFilter(wurzel) {
    var knoepfe = wurzel.querySelectorAll("[data-filter-wert]");
    var zeilen = wurzel.querySelectorAll("[data-status]");
    Array.prototype.forEach.call(knoepfe, function (k) {
      k.addEventListener("click", function () {
        var wert = k.getAttribute("data-filter-wert");
        Array.prototype.forEach.call(knoepfe, function (n) { n.setAttribute("aria-pressed", n === k ? "true" : "false"); });
        Array.prototype.forEach.call(zeilen, function (z) { z.hidden = wert !== "" && z.getAttribute("data-status") !== wert; });
      });
    });
  }

  function ruhig() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  // Kopf und Fuß des Chat-Handys: Menü, Eingabefeld, Sprach- und Sendeknopf. Läuft auch bei reduzierter Bewegung.
  function initChatLeiste(wurzel) {
    var menueKnopf = wurzel.querySelector("[data-chat-menue-knopf]");
    var menue = wurzel.querySelector("[data-chat-menue]");
    var neu = wurzel.querySelector("[data-chat-neu]");
    var eingabe = wurzel.querySelector("[data-chat-eingabe]");
    var senden = wurzel.querySelector("[data-chat-senden]");
    var feld = eingabe ? eingabe.parentNode : null;

    function setzeMenue(offen) {
      if (!menueKnopf || !menue) return;
      menueKnopf.setAttribute("aria-expanded", offen ? "true" : "false");
      menue.hidden = !offen;
    }
    if (menueKnopf && menue) {
      // Ist der Chat zu Ende, zeigt der Knopf einen Kreispfeil und startet den Chat direkt von vorne.
      menueKnopf.addEventListener("click", function () {
        if (wurzel.classList.contains("chat--fertig")) { setzeMenue(false); wurzel.dispatchEvent(new CustomEvent("chat:neu")); return; }
        setzeMenue(menue.hidden);
      });
      wurzel.addEventListener("chat:zustand", function () {
        var fertig = wurzel.classList.contains("chat--fertig");
        menueKnopf.setAttribute("aria-label", menueKnopf.getAttribute(fertig ? "data-label-neu" : "data-label-menue"));
        if (fertig) setzeMenue(false);
      });
      document.addEventListener("click", function (e) {
        if (!menue.hidden && !menue.contains(e.target) && !menueKnopf.contains(e.target)) setzeMenue(false);
      });
      wurzel.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !menue.hidden) { setzeMenue(false); menueKnopf.focus(); }
      });
    }
    if (neu) {
      neu.addEventListener("click", function () {
        setzeMenue(false);
        wurzel.dispatchEvent(new CustomEvent("chat:neu"));
      });
    }
    if (!eingabe || !senden) return;

    var textLabel = senden.getAttribute("data-label-text");
    var leerLabel = senden.getAttribute("data-label-leer");
    function hatText() { return eingabe.value.replace(/\s+/g, " ").trim().length > 0; }
    function aktualisiere() {
      var text = hatText();
      senden.classList.toggle("chat__senden--text", text);
      senden.setAttribute("aria-label", text ? textLabel : leerLabel);
      if (feld) feld.classList.toggle("chat__eingabe--leer", !eingabe.value.length);
    }
    function sende() {
      var seite = wurzel.closest("[data-seite]") || document;
      var dialog = seite.querySelector("[data-pilot-dialog]");
      var ziel = dialog ? dialog.querySelector('[data-feld="anliegen"]') : null;
      if (ziel) {
        ziel.value = eingabe.value.replace(/\s+/g, " ").trim();
        ziel.dispatchEvent(new Event("input", { bubbles: true }));
      }
      // Das Anliegen aus dem Chat gehört ins Formular: Es öffnet direkt, ohne die Wahl zwischen Telefon und Formular
      if (dialog) dialog.dispatchEvent(new CustomEvent("pilot:formular"));
    }
    eingabe.addEventListener("input", aktualisiere);
    eingabe.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && hatText()) { e.preventDefault(); sende(); }
    });
    var gross = null;
    senden.addEventListener("click", function () {
      if (hatText()) { sende(); return; }
      // Ohne Text zeigt der Knopf, dass hier getippt wird: das Feld wird eine Sekunde größer.
      if (!feld) return;
      feld.classList.add("chat__eingabe--gross");
      eingabe.focus();
      window.clearTimeout(gross);
      gross = window.setTimeout(function () { feld.classList.remove("chat__eingabe--gross"); }, 1000);
    });
    aktualisiere();
  }

  function initChat(wurzel) {
    initChatLeiste(wurzel);
    var liste = wurzel.querySelector(".chat__verlauf");
    var buehne = wurzel.querySelector(".chat__buehne");
    var nachrichten = Array.prototype.slice.call(wurzel.querySelectorAll("[data-chat-nachricht]"));
    var n = nachrichten.length;
    if (!liste || !buehne || !n) return;
    if (ruhig()) {
      // Bei reduzierter Bewegung stehen alle Nachrichten da. "Von vorne starten" springt dann nur zum Chat.
      wurzel.addEventListener("chat:neu", function () { wurzel.scrollIntoView(); });
      return;
    }
    wurzel.classList.add("chat--aktiv");
    wurzel.style.setProperty("--schritte", String(n));
    nachrichten.forEach(function (m) { m.classList.add("chat__nachricht--aus"); });
    var gezeigt = 0, ziel = 0, laeuft = false, epoche = 0, sperre = false;

    function fertig() {
      if (gezeigt >= n) { wurzel.classList.add("chat--fertig"); wurzel.classList.remove("chat--hinweis"); wurzel.dispatchEvent(new CustomEvent("chat:zustand")); }
    }
    // Hinweis "Scrollen für die nächste Nachricht": erst nach 2 Sekunden ohne Scrollen, Klick oder Tippen, solange der Chat im Bild ist.
    var hinweisZeit = null;
    function aktivitaet() {
      wurzel.classList.remove("chat--hinweis");
      window.clearTimeout(hinweisZeit);
      if (gezeigt >= n) return;
      hinweisZeit = window.setTimeout(function () {
        if (gezeigt >= n || laeuft || !wurzel.getClientRects().length) return;
        var r = wurzel.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
        if (r.top < vh * 0.7 && r.bottom > vh * 0.3) wurzel.classList.add("chat--hinweis");
      }, 2000);
    }
    function zeigeNaechste() {
      if (gezeigt >= ziel) { laeuft = false; fertig(); return; }
      laeuft = true;
      var m = nachrichten[gezeigt];
      var meine = epoche;
      var tippen = document.createElement("li");
      tippen.className = "chat__tippen chat__tippen--" + (m.classList.contains("chat__nachricht--roderich") ? "roderich" : "rolle");
      tippen.setAttribute("aria-hidden", "true");
      tippen.innerHTML = "<span></span><span></span><span></span>";
      liste.appendChild(tippen);
      window.setTimeout(function () {
        if (meine !== epoche) return;
        if (tippen.parentNode) tippen.parentNode.removeChild(tippen);
        m.classList.remove("chat__nachricht--aus");
        m.classList.add("chat__nachricht--neu");
        gezeigt++;
        aktivitaet();
        zeigeNaechste();
      }, 850);
    }
    function setzeZiel(z) {
      z = Math.min(z, n);
      if (z > ziel) { ziel = z; if (!laeuft) zeigeNaechste(); }
    }
    // Läuft die Seite in einem Rahmen ohne eigenes Scrollen (zum Beispiel einer Vorschau, die sich auf die volle Höhe streckt),
    // gibt es kein Scroll-Signal. Dann zeigt der Chat die erste Nachricht, und je ein Mausrad-Impuls, Wisch oder Tipp über dem Chat
    // schaltet eine Nachricht weiter. Es gibt keinen Selbstlauf: In so einem Rahmen gilt jeder Chat als sichtbar, er wäre durchgelaufen, bevor jemand ihn erreicht.
    var ohneScroll = false;
    function scrollt() {
      var d = document.documentElement;
      return d.scrollHeight > (window.innerHeight || d.clientHeight) + 40;
    }
    var letzterSchritt = 0;
    function schritt() {
      var jetzt = Date.now();
      if (jetzt - letzterSchritt < 900) return;
      letzterSchritt = jetzt;
      setzeZiel(Math.max(ziel, 1) + 1);
    }
    // Ist der Chat zu Ende und der Besucher darunter weitergescrollt, schrumpft die lange Scroll-Strecke auf die Höhe des Handys.
    // Wer nach oben zurückkommt, sieht den Endzustand und muss die Strecke nicht rückwärts scrollen. Die Seite springt nicht, weil die Verschiebung ausgeglichen wird.
    function kuerzen() {
      var abschnitt = wurzel.closest("section");
      var danach = abschnitt && abschnitt.nextElementSibling;
      var d = document.documentElement;
      var vorher = danach ? danach.getBoundingClientRect().top : 0;
      wurzel.classList.add("chat--kurz");
      var nachher = danach ? danach.getBoundingClientRect().top : 0;
      if (nachher !== vorher) {
        d.style.overflowAnchor = "none";
        window.scrollBy(0, nachher - vorher);
        window.requestAnimationFrame(function () { d.style.overflowAnchor = ""; });
      }
    }
    function beiScroll() {
      // Versteckte Seiten (Gesamtvorschau) haben keine Größe: dort darf nichts ablaufen, sonst steht der Chat beim Öffnen schon am Ende.
      if (sperre || !wurzel.getClientRects().length) return;
      if (gezeigt >= n && !ohneScroll && !wurzel.classList.contains("chat--kurz") && wurzel.getBoundingClientRect().bottom < 0) { kuerzen(); return; }
      if (!scrollt()) {
        if (!ohneScroll) { ohneScroll = true; wurzel.classList.add("chat--ohnescroll"); }
        setzeZiel(1);
        return;
      }
      if (ohneScroll) { ohneScroll = false; wurzel.classList.remove("chat--ohnescroll"); }
      var r = wurzel.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top > vh * 0.55) return;
      if (r.bottom < vh) { setzeZiel(n); return; }
      var strecke = r.height - buehne.offsetHeight;
      var p = strecke > 0 ? Math.min(1, Math.max(0, -(r.top - (parseFloat(window.getComputedStyle(buehne).top) || 0)) / strecke)) : 1;
      p = Math.min(1, p / 0.85);
      setzeZiel(1 + Math.floor(p * (n - 1) + 0.001));
    }
    // Menüpunkt "Chat von vorne starten": alles ausblenden, nach oben zum Chat scrollen, dann erscheint die erste Nachricht.
    function neustart() {
      epoche++;
      Array.prototype.forEach.call(liste.querySelectorAll(".chat__tippen"), function (t) { t.parentNode.removeChild(t); });
      nachrichten.forEach(function (m) { m.classList.add("chat__nachricht--aus"); m.classList.remove("chat__nachricht--neu"); });
      gezeigt = 0; ziel = 0; laeuft = false;
      wurzel.classList.remove("chat--fertig");
      wurzel.classList.remove("chat--kurz");
      wurzel.dispatchEvent(new CustomEvent("chat:zustand"));
      aktivitaet();
      sperre = true;
      var wartezeit = 0;
      if (scrollt() && !ohneScroll) {
        var haften = parseFloat(window.getComputedStyle(buehne).top) || 0;
        var oben = wurzel.getBoundingClientRect().top + (window.pageYOffset || 0) - haften;
        window.scrollTo({ top: Math.max(0, oben), behavior: "smooth" });
        wartezeit = 700;
      }
      window.setTimeout(function () { sperre = false; setzeZiel(1); beiScroll(); }, wartezeit);
    }
    wurzel.addEventListener("chat:neu", neustart);
    var wartet = false;
    function planeScroll() {
      if (wartet) return;
      wartet = true;
      window.requestAnimationFrame(function () { wartet = false; beiScroll(); });
    }
    window.addEventListener("scroll", function () { aktivitaet(); }, { passive: true });
    window.addEventListener("wheel", function () { aktivitaet(); }, { passive: true });
    window.addEventListener("touchmove", function () { aktivitaet(); }, { passive: true });
    document.addEventListener("click", function () { aktivitaet(); });
    document.addEventListener("keydown", function () { aktivitaet(); });
    window.addEventListener("scroll", planeScroll, { passive: true });
    window.addEventListener("resize", planeScroll);
    window.addEventListener("load", planeScroll);
    window.addEventListener("hashchange", planeScroll);
    // Wird eine versteckte Seite sichtbar, gibt es kein Scroll-Signal: der Beobachter stößt die Berechnung an.
    if ("IntersectionObserver" in window) new IntersectionObserver(planeScroll).observe(wurzel);
    buehne.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest("a, button, input")) return;
      setzeZiel(Math.max(ziel, 0) + 1);
    });
    // Nur in Rahmen ohne eigenes Scrollen: Mausrad und Wischen über dem Chat ersetzen das Scrollen.
    buehne.addEventListener("wheel", function () { if (ohneScroll) schritt(); }, { passive: true });
    var startY = null;
    buehne.addEventListener("touchstart", function (e) { startY = e.touches && e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
    buehne.addEventListener("touchmove", function (e) {
      if (!ohneScroll || startY === null || !e.touches || !e.touches[0]) return;
      if (Math.abs(e.touches[0].clientY - startY) > 24) { startY = e.touches[0].clientY; schritt(); }
    }, { passive: true });
    beiScroll();
    aktivitaet();
  }

  // Ergebnisbild: Balken, Säulen und Marken bauen sich automatisch auf, sobald man so weit gescrollt hat, dass sie sichtbar sind.
  // Rückfall für Rahmen, in denen alles als sichtbar gilt: beim ersten Darüberfahren (oder Fokus) baut sich das Bild auf, eine Studienkarte
  // dreht sich dann erst nach dem Aufbau um.
  function initErgebnis(wurzel) {
    if (ruhig()) return;
    wurzel.classList.add("ergebnis--bereit");
    var gezeigt = false, o = null;
    function zeige() {
      if (gezeigt) return;
      gezeigt = true;
      if (o) o.disconnect();
      wurzel.classList.add("ergebnis--zeigt");
      wurzel.classList.remove("ergebnis--bereit");
    }
    if ("IntersectionObserver" in window) {
      o = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) { if (e.isIntersecting) zeige(); });
      }, { threshold: 0.45 });
      o.observe(wurzel);
    } else {
      zeige();
    }
    if (wurzel.classList.contains("studienkarte")) {
      var erst = function () {
        wurzel.removeEventListener("pointerenter", erst);
        wurzel.removeEventListener("focusin", erst);
        if (gezeigt) return;
        wurzel.setAttribute("data-warte", "");
        zeige();
        window.setTimeout(function () { wurzel.removeAttribute("data-warte"); }, 1300);
      };
      wurzel.addEventListener("pointerenter", erst);
      wurzel.addEventListener("focusin", erst);
    }
  }

  // Ab drei beantworteten Fragen erscheint der Knopf [data-umfrage-pilot] (öffnet das Kontaktformular).
  var UMFRAGE_SCHWELLE = 3;
  function initUmfrage(wurzel) {
    var pilot = wurzel.querySelector("[data-umfrage-pilot]");
    function pruefe() {
      if (!pilot) return;
      var n = wurzel.querySelectorAll('.umfrage__antwort[aria-pressed="true"]').length;
      pilot.hidden = n < UMFRAGE_SCHWELLE;
    }
    Array.prototype.forEach.call(wurzel.querySelectorAll(".umfrage__frage"), function (frage) {
      var knoepfe = frage.querySelectorAll(".umfrage__antwort");
      Array.prototype.forEach.call(knoepfe, function (k) {
        k.addEventListener("click", function () {
          Array.prototype.forEach.call(knoepfe, function (x) { x.setAttribute("aria-pressed", x === k ? "true" : "false"); });
          pruefe();
        });
      });
    });
    pruefe();
  }

  // Tagesordnung [data-tagesordnung]: Zeilen klappen per Klick auf, mehrere können offen sein. Ohne Skript steht jeder Text da.
  function initTagesordnung(wurzel) {
    Array.prototype.forEach.call(wurzel.querySelectorAll(".top"), function (zeile, i) {
      var knopf = zeile.querySelector(".top__knopf");
      var text = zeile.querySelector(".top__text");
      if (!knopf || !text) return;
      function setze(offen) {
        knopf.setAttribute("aria-expanded", offen ? "true" : "false");
        if (offen) text.setAttribute("data-offen", "");
        else text.removeAttribute("data-offen");
      }
      knopf.addEventListener("click", function () { setze(knopf.getAttribute("aria-expanded") !== "true"); });
      setze(i === 0);
    });
  }

  // Bestellstrecke [data-bestellstrecke]: Stationen und Linie füllen sich beim Scrollen, rückwärts beim Zurückscrollen.
  function initStrecke(wurzel) {
    var F = window.VianuFortschritt;
    var stationen = wurzel.querySelectorAll(".bestellstrecke__station");
    var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function setze(n) {
      Array.prototype.forEach.call(stationen, function (st, i) {
        if (i < n) st.setAttribute("data-an", "");
        else st.removeAttribute("data-an");
      });
      wurzel.style.setProperty("--bestellstrecke-anteil", String(stationen.length > 1 ? Math.max(0, n - 1) / (stationen.length - 1) : 1));
    }
    if (!F || reduziert || !stationen.length) { setze(stationen.length); return; }
    var geplant = false;
    function aktualisiere() {
      geplant = false;
      var r = wurzel.getBoundingClientRect();
      var f = F.fortschrittImBild(r.top, r.height, window.innerHeight);
      setze(F.sichtbareAnzahl(Math.min(1, f / 0.55), stationen.length));
    }
    function planen() {
      if (!geplant) { geplant = true; window.requestAnimationFrame(aktualisiere); }
    }
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    aktualisiere();
  }

  // Zufriedenheitskurve [data-garantie-kurve]: Die Linie zeichnet sich beim Scrollen, die drei Punkte leuchten nacheinander auf.
  // Ohne Skript oder bei reduzierter Bewegung steht alles da.
  function initGarantieKurve(wurzel) {
    var F = window.VianuFortschritt;
    var marken = wurzel.querySelectorAll("[data-punkt]");
    var texte = wurzel.querySelectorAll("[data-punkt-text]");
    var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var PUNKTE = [0.18, 0.5, 0.82];
    function setze(anteil) {
      wurzel.style.setProperty("--kurve-anteil", String(anteil));
      Array.prototype.forEach.call(marken, function (m, i) {
        if (anteil >= PUNKTE[i] - 0.001) m.setAttribute("data-an", ""); else m.removeAttribute("data-an");
      });
      Array.prototype.forEach.call(texte, function (t, i) {
        if (anteil >= PUNKTE[i] - 0.001) t.setAttribute("data-an", ""); else t.removeAttribute("data-an");
      });
    }
    if (!F || reduziert) { setze(1); return; }
    var geplant = false;
    function aktualisiere() {
      geplant = false;
      var r = wurzel.getBoundingClientRect();
      setze(Math.min(1, F.fortschrittImBild(r.top, r.height, window.innerHeight) / 0.6));
    }
    function planen() { if (!geplant) { geplant = true; window.requestAnimationFrame(aktualisiere); } }
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    aktualisiere();
  }

  function start() {
    jeder("[data-garantie-kurve]", initGarantieKurve);
    jeder("[data-bestellstrecke]", initStrecke);
    jeder("[data-tagesordnung]", initTagesordnung);
    jeder("[data-pruefliste]", initPruefliste);
    jeder("[data-fluss]", initFluss);
    jeder("[data-filter]", initFilter);
    jeder("[data-chat]", initChat);
    jeder("[data-ergebnis]", initErgebnis);
    jeder("[data-umfrage]", initUmfrage);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
