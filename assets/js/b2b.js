/*
  Interaktionen der B2B-Startseite. Jedes Modul arbeitet über Datenattribute und nur innerhalb seines Bereichs:
  initDruckkarte, initAnfrageStrecke, initKlein, initSorgen, initRechner, initFormular, initWeiterleiten.
  Benötigt fortschritt.js, kosten.js und formular.js. Ohne Skript bleibt der Inhalt lesbar (Ruhezustände).
  Bewegungen hängen am Scrollen, laufen beim Zurückscrollen rückwärts und stehen bei reduzierter Bewegung
  im Endzustand.
*/
(function () {
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  function jeder(selektor, wurzel, fn) {
    Array.prototype.forEach.call((wurzel || document).querySelectorAll(selektor), fn);
  }

  // Ruft fn bei Scroll und Größenänderung höchstens einmal je Bild auf
  function beiScroll(fn) {
    var geplant = false;
    function lauf() {
      geplant = false;
      fn();
    }
    function planen() {
      if (!geplant) {
        geplant = true;
        window.requestAnimationFrame(lauf);
      }
    }
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    fn();
  }

  function punkt(cx, cy, r, klasse) {
    var c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    c.setAttribute("class", klasse);
    return c;
  }

  // Kleine, feste Zufallsfolge, damit die Karte bei jedem Laden gleich aussieht
  function zufall(start) {
    var s = start;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /* ---------- Druckkarte ---------- */
  function initDruckkarte(wurzel) {
    var svg = wurzel.querySelector("svg");
    var umriss = wurzel.querySelector("[data-druck-umriss]");
    var gruppe = wurzel.querySelector("[data-druck-punkte]");
    if (!svg || !umriss || !gruppe || !window.VianuFortschritt) return;

    function last(x, y) {
      function glocke(mx, my, sx, sy, a) {
        var dx = (x - mx) / sx;
        var dy = (y - my) / sy;
        return a * Math.exp(-(dx * dx + dy * dy) / 2);
      }
      return 0.1 + glocke(50, 212, 26, 30, 1) + glocke(38, 84, 24, 26, 0.8) + glocke(40, 28, 14, 14, 0.45);
    }

    // Ohne Browser-Unterstützung für isPointInFill gilt eine Ellipse um den Fuß als Näherung
    function innen(px, y) {
      if (umriss.isPointInFill) return umriss.isPointInFill(new DOMPoint(px, y));
      var dx = (px - 50) / 44;
      var dy = (y - 134) / 128;
      return dx * dx + dy * dy <= 1;
    }

    // Die Punkte entstehen erst, wenn die Karte sichtbar ist. In einem versteckten Bereich (display: none) meldet isPointInFill überall false.
    var kreise = [];
    var sichtbar = -1;
    var gewuenscht = 0;
    function baue() {
      if (kreise.length) return true;
      if (!svg.getBoundingClientRect().width) return false;
      var zufallswert = zufall(7);
      var liste = [];
      for (var y = 8; y < 256; y += 7) {
        for (var x = 8; x < 96; x += 7) {
          var px = x + (Math.floor((y - 8) / 7) % 2 ? 3.5 : 0);
          var w = Math.min(1, last(px, y) / 1.15);
          // Der ganze Punkt samt Strich des Umrisses (0,75 nach innen) und etwas Luft muss im Umriss liegen
          if (!window.VianuFortschritt.kreisInnen(innen, px, y, 0.9 + 2.3 * w, 1.1)) continue;
          liste.push({ x: px, y: y, w: w, schluessel: w + zufallswert() * 0.45 });
        }
      }
      if (!liste.length) return false;
      // Niedrige Last zuerst, die Spitze der Belastung zuletzt
      liste.sort(function (a, b) { return a.schluessel - b.schluessel; });
      kreise = liste.map(function (p) {
        var c = punkt(p.x.toFixed(1), p.y, (0.9 + 2.3 * p.w).toFixed(2), "druck__punkt" + (p.w > 0.82 ? " druck__punkt--spitze" : ""));
        gruppe.appendChild(c);
        return c;
      });
      sichtbar = -1;
      return true;
    }
    // anteil: 0 bis 1, wie voll die Karte sein soll
    function zeige(anteil) {
      gewuenscht = anteil;
      if (!baue()) return;
      var anzahl = window.VianuFortschritt.sichtbareAnzahl(anteil, kreise.length);
      if (anzahl === sichtbar) return;
      for (var i = 0; i < kreise.length; i++) {
        if (i < anzahl) kreise[i].removeAttribute("data-aus");
        else kreise[i].setAttribute("data-aus", "");
      }
      sichtbar = anzahl;
    }
    // Wird die Karte später sichtbar, gilt der zuletzt gewünschte Stand
    function nachziehen() { if (!kreise.length) zeige(gewuenscht); }
    if (window.IntersectionObserver) new IntersectionObserver(nachziehen).observe(svg);
    window.addEventListener("resize", nachziehen);
    window.addEventListener("hashchange", nachziehen);

    // Mit Regler: Die Karte füllt sich nach den eingestellten Stunden (0 bis 12) statt beim Scrollen, auch bei reduzierter Bewegung.
    // Ab 4 Stunden erscheinen die Tätigkeitskacheln, nach einer Auswahl die Anfrage, ab 10 Stunden Roderichs Satz.
    var regler = wurzel.hasAttribute("data-druck-regler") ? (wurzel.closest("[data-boden]") || document).querySelector("[data-boden-regler]") : null;
    if (regler) {
      var abschnitt = regler.closest("[data-boden]") || document;
      var zahl = abschnitt.querySelector("[data-boden-zahl]");
      var roderich = abschnitt.querySelector("[data-boden-roderich]");
      var kacheln = abschnitt.querySelector("[data-boden-kacheln]");
      var anfrage = abschnitt.querySelector("[data-boden-anfrage]");
      var knoepfe = abschnitt.querySelectorAll("[data-taetigkeit]");
      var liste = kacheln ? kacheln.querySelector(".kacheln") : null;
      var gewaehlt = null;
      var stufe = 1;
      var laeuft = false;
      var dauer = reduziert ? 0 : 400;

      // Anteil der gefüllten Karte: der Reglerwert, mit jedem erreichten Schritt der Anfrage ein Stück mehr, bei Schritt 5 voll
      function anteil() {
        var basis = Number(regler.value) / 12;
        if (!gewaehlt) return basis;
        return basis + (1 - basis) * (stufe - 1) / 4;
      }
      function zeigeAnfrage() {
        if (anfrage) anfrage.hidden = !(gewaehlt && Number(regler.value) >= 4);
      }
      function setzeKachelnZurueck() {
        gewaehlt = null;
        stufe = 1;
        if (liste) liste.removeAttribute("data-gewaehlt");
        Array.prototype.forEach.call(knoepfe, function (k) {
          k.setAttribute("aria-pressed", "false");
          k.parentNode.removeAttribute("data-ausblenden");
          k.parentNode.hidden = false;
        });
      }
      // FLIP: Das Element springt per Layout an die neue Stelle und gleitet von der alten dorthin
      function gleite(el, aendern) {
        var vor = el.getBoundingClientRect();
        aendern();
        if (!dauer) return;
        var nach = el.getBoundingClientRect();
        var dx = vor.left - nach.left;
        var dy = vor.top - nach.top;
        if (!dx && !dy) return;
        el.style.transition = "none";
        el.style.transform = "translate(" + dx + "px," + dy + "px)";
        el.getBoundingClientRect();
        el.style.transition = "transform " + dauer + "ms ease";
        el.style.transform = "";
        setTimeout(function () { el.style.transition = ""; }, dauer + 50);
      }
      function waehleKachel(k) {
        if (laeuft || !liste) return;
        var li = k.parentNode;
        var andere = Array.prototype.filter.call(liste.children, function (x) { return x !== li; });
        laeuft = true;
        if (!gewaehlt) {
          // Auswahl: Die anderen blenden aus, die gewählte wandert nach oben links
          andere.forEach(function (x) { x.setAttribute("data-ausblenden", ""); });
          setTimeout(function () {
            andere.forEach(function (x) { x.hidden = true; });
            gleite(li, function () { liste.setAttribute("data-gewaehlt", ""); });
            Array.prototype.forEach.call(knoepfe, function (n) { n.setAttribute("aria-pressed", n === k ? "true" : "false"); });
            gewaehlt = k;
            stufe = 1;
            zeigeAnfrage();
            setze();
            laeuft = false;
          }, dauer ? 220 : 0);
        } else {
          // Zurück zur Auswahl: Eingaben und Karte werden wie unter 4 Stunden zurückgesetzt
          abschnitt.dispatchEvent(new CustomEvent("boden-zurueck"));
          gleite(li, function () {
            liste.removeAttribute("data-gewaehlt");
            andere.forEach(function (x) { x.hidden = false; });
          });
          if (dauer) {
            setTimeout(function () { andere.forEach(function (x) { x.removeAttribute("data-ausblenden"); }); }, 20);
          } else {
            andere.forEach(function (x) { x.removeAttribute("data-ausblenden"); });
          }
          Array.prototype.forEach.call(knoepfe, function (n) { n.setAttribute("aria-pressed", "false"); });
          gewaehlt = null;
          stufe = 1;
          zeigeAnfrage();
          setze();
          setTimeout(function () { laeuft = false; }, dauer);
        }
      }
      var setze = function () {
        var h = Number(regler.value);
        if (zahl) zahl.textContent = String(h);
        if (roderich) roderich.hidden = h < 10;
        if (kacheln) kacheln.hidden = h < 4;
        if (h < 4 && (gewaehlt || (liste && liste.hasAttribute("data-gewaehlt")))) {
          setzeKachelnZurueck();
          abschnitt.dispatchEvent(new CustomEvent("boden-zurueck"));
        }
        zeigeAnfrage();
        zeige(anteil());
      };
      Array.prototype.forEach.call(knoepfe, function (k) {
        k.addEventListener("click", function () { waehleKachel(k); });
      });
      abschnitt.addEventListener("strecke-schritt", function (e) {
        stufe = e.detail && e.detail.schritt ? e.detail.schritt : 1;
        zeige(anteil());
      });
      regler.addEventListener("input", setze);
      setze();
      return;
    }
    if (reduziert) {
      zeige(1);
      return;
    }
    beiScroll(function () {
      var r = wurzel.getBoundingClientRect();
      var f = window.VianuFortschritt.fortschrittImBild(r.top, r.height, window.innerHeight);
      zeige(Math.min(1, f / 0.65));
    });
  }

  /* ---------- Klein starten ---------- */
  function initKlein(wurzel) {
    var svg = wurzel.querySelector("[data-klein-bild]");
    var stufen = wurzel.querySelectorAll("[data-klein-stufe]");
    if (!svg || !stufen.length || !window.VianuFortschritt) return;

    // Stufe 0: zehn Punkte. Stufe 1 und 2: Gruppen aus Punkten, die anwachsen (Schema, keine Planung)
    var gruppen = [
      { stufe: 0, x0: 35, y0: 38, spalten: 5, zeilen: 2, abstand: 13 },
      { stufe: 1, x0: 154, y0: 24, spalten: 5, zeilen: 4, abstand: 13 },
      { stufe: 1, x0: 154, y0: 84, spalten: 5, zeilen: 2, abstand: 13 },
      { stufe: 2, x0: 258, y0: 12, spalten: 4, zeilen: 3, abstand: 13 },
      { stufe: 2, x0: 312, y0: 12, spalten: 4, zeilen: 3, abstand: 13 },
      { stufe: 2, x0: 258, y0: 66, spalten: 4, zeilen: 3, abstand: 13 },
      { stufe: 2, x0: 312, y0: 66, spalten: 4, zeilen: 3, abstand: 13 }
    ];
    gruppen.forEach(function (g) {
      for (var z = 0; z < g.zeilen; z++) {
        for (var s = 0; s < g.spalten; s++) {
          svg.appendChild(punkt(g.x0 + s * g.abstand, g.y0 + z * g.abstand, 4.2, "klein__punkt klein__punkt--s" + g.stufe));
        }
      }
    });

    function setze(stufe) {
      wurzel.setAttribute("data-stufe", String(stufe));
      Array.prototype.forEach.call(stufen, function (el, i) {
        el.setAttribute("data-aktiv", i <= stufe ? "true" : "false");
      });
    }
    if (reduziert) {
      setze(stufen.length - 1);
      return;
    }
    beiScroll(function () {
      var r = wurzel.getBoundingClientRect();
      var f = window.VianuFortschritt.fortschrittImBild(r.top, r.height, window.innerHeight);
      setze(window.VianuFortschritt.aktiverSchritt(Math.min(1, f / 0.7), stufen.length));
    });
  }

  /* ---------- Sorgen und Bedenken ---------- */
  function initSorgen(wurzel) {
    var kacheln = wurzel.querySelectorAll("[data-sorge]");
    var zonen = wurzel.querySelectorAll("[data-zone]");
    var punkte = wurzel.querySelectorAll("[data-sorgen-punkt]");
    var liste = wurzel.querySelector("[data-sorgen-liste]");
    if (!kacheln.length || !liste || !window.VianuFortschritt) return;
    var handy = window.matchMedia("(max-width: 56rem), (hover: none) and (pointer: coarse)");

    function setzeAktiv(i) {
      Array.prototype.forEach.call(kacheln, function (k, n) { k.setAttribute("data-aktiv", n === i ? "true" : "false"); });
      Array.prototype.forEach.call(zonen, function (z, n) { z.setAttribute("data-aktiv", n === i ? "true" : "false"); });
      Array.prototype.forEach.call(punkte, function (p, n) {
        if (n === i) p.setAttribute("aria-current", "true");
        else p.removeAttribute("aria-current");
      });
    }
    function springe(i) {
      kacheln[i].scrollIntoView({ block: "center", behavior: reduziert ? "auto" : "smooth" });
    }

    // Mit Maus oder Tastatur (Computer): Hover und Fokus drehen die Kachel
    Array.prototype.forEach.call(kacheln, function (k, i) {
      k.addEventListener("mouseenter", function () { if (!handy.matches) setzeAktiv(i); });
      k.addEventListener("mouseleave", function () { if (!handy.matches) setzeAktiv(-1); });
      k.addEventListener("focus", function () { setzeAktiv(i); });
      k.addEventListener("blur", function () { if (!handy.matches) setzeAktiv(-1); });
    });
    Array.prototype.forEach.call(zonen, function (z, i) { z.addEventListener("click", function () { springe(i); }); });
    Array.prototype.forEach.call(punkte, function (p, i) { p.addEventListener("click", function () { springe(i); }); });

    // Auf dem Handy: Beim Scrollen leuchten die Zonen nacheinander auf
    function beimScrollen() {
      if (!handy.matches) return;
      var r = liste.getBoundingClientRect();
      var f = (window.innerHeight * 0.55 - r.top) / r.height;
      setzeAktiv(window.VianuFortschritt.aktiverSchritt(f, kacheln.length));
    }
    beiScroll(beimScrollen);
    handy.addEventListener("change", function () { setzeAktiv(handy.matches ? 0 : -1); beimScrollen(); });
    if (!handy.matches) setzeAktiv(-1);
  }

  /* ---------- Kostenrechner ---------- */
  function initRechner(wurzel) {
    var regler = wurzel.querySelector("[data-rechner-regler]");
    var zahl = wurzel.querySelector("[data-rechner-zahl]");
    var ergebnis = wurzel.querySelector("[data-rechner-ergebnis]");
    var text = wurzel.querySelector("[data-rechner-text]");
    var foto = wurzel.parentNode ? wurzel.parentNode.querySelector("[data-sohle-foto]") : null;
    if (!regler || !zahl || !ergebnis || !text || !window.VianuKosten) return;
    var PREIS = 120;

    function rechne() {
      var n = window.VianuKosten.begrenzeSchichten(regler.value);
      var k = window.VianuKosten.kostenJeSchicht(PREIS, n, window.VianuTexte.sprache(wurzel));
      if (!k) return;
      zahl.textContent = String(n);
      ergebnis.textContent = k.text;
      text.textContent = window.VianuTexte.text("rechner.zeile", { preis: PREIS, n: n }, wurzel);
      // Das Sohlenfoto wächst mit dem Regler (CSS: 5rem bei Mindestwert bis 18rem bei Höchstwert) und wird nie wieder kleiner
      if (foto) {
        var von = Number(regler.min) || 0;
        var bis = Number(regler.max) || 1;
        foto.style.setProperty("--sohle-anteil", String(Math.min(1, Math.max(0, (n - von) / (bis - von)))));
      }
    }
    // Der Aufruf zum Piloten erscheint erst, wenn die Person den Regler verstellt (ohne Skript bleibt er sichtbar)
    var aufruf = wurzel.closest("section") ? wurzel.closest("section").querySelectorAll("[data-aufruf]") : [];
    Array.prototype.forEach.call(aufruf, function (el) { el.setAttribute("data-aufruf-versteckt", ""); });
    regler.addEventListener("input", function () {
      Array.prototype.forEach.call(aufruf, function (el) { el.removeAttribute("data-aufruf-versteckt"); });
    });
    regler.addEventListener("input", rechne);
    rechne();
  }

  /* ---------- Break-even: Pilotpreis gegen Fehltage, mit Zahlen des Besuchers ---------- */
  function initBreakEven(wurzel) {
    var kosten = wurzel.querySelector("[data-be-kosten]");
    var tage = wurzel.querySelector("[data-be-tage]");
    var kostenZahl = wurzel.querySelector("[data-be-kosten-zahl]");
    var tageZahl = wurzel.querySelector("[data-be-tage-zahl]");
    var ergTage = wurzel.querySelector("[data-be-tage-gesamt]");
    var ergSumme = wurzel.querySelector("[data-be-summe]");
    var ergAnteil = wurzel.querySelector("[data-be-anteil]");
    if (!kosten || !tage || !ergTage || !ergSumme || !ergAnteil || !window.VianuKosten) return;
    var PILOT = 1200, TEILNEHMENDE = 10;
    var K = window.VianuKosten, T = window.VianuTexte;
    function rechne() {
      var sprache = T.sprache(wurzel);
      var k = Number(kosten.value), t = Number(tage.value);
      if (kostenZahl) kostenZahl.textContent = K.euro(k, sprache);
      if (tageZahl) tageZahl.textContent = String(t);
      var n = TEILNEHMENDE * t;
      ergTage.textContent = n === 1 ? T.text("breakeven.tag1", null, wurzel) : T.text("breakeven.tage", { n: n }, wurzel);
      var summe = K.fehlzeitKosten(TEILNEHMENDE, t, k);
      ergSumme.textContent = summe === null ? T.text("breakeven.leer", null, wurzel) : K.euro(summe, sprache);
      var anteil = K.anteilPreis(PILOT, summe);
      ergAnteil.textContent = anteil === null ? T.text("breakeven.leer", null, wurzel) : (anteil > 999 ? "> 999 %" : anteil + " %");
    }
    kosten.addEventListener("input", rechne);
    tage.addEventListener("input", rechne);
    rechne();
  }

  /* ---------- Pilotformular ---------- */
  // Kopiert text in die Zwischenablage. Gelingt das nicht, meldet status den Rückfall und rueckfall() läuft.
  function kopierenMit(text, status, ok, fehler, rueckfall) {
    function nicht() {
      status.textContent = fehler;
      if (rueckfall) rueckfall();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status.textContent = ok; }, nicht);
    } else {
      nicht();
    }
  }

  function initFormular(wurzel) {
    if (!window.VianuFormular) return;
    var status = wurzel.querySelector("[data-formular-status]");
    var felder = {};
    var fehler = {};
    jeder("[data-feld]", wurzel, function (f) { felder[f.getAttribute("data-feld")] = f; });
    jeder("[data-fehler]", wurzel, function (f) { fehler[f.getAttribute("data-fehler")] = f; });

    function daten() {
      return {
        unternehmen: felder.unternehmen.value,
        rolle: felder.rolle.value,
        mitarbeitende: felder.mitarbeitende.value,
        stunden: felder.stunden.value,
        branche: felder.branche.value,
        kontakt: felder.kontakt.value,
        quelle: felder.quelle.value,
        freitext: felder.freitext.value,
        anliegen: felder.anliegen.value,
        einwilligung: felder.einwilligung.checked
      };
    }
    function zeigeFehler(r) {
      var erstes = null;
      Object.keys(felder).forEach(function (name) {
        var meldung = r.fehler[name];
        fehler[name].hidden = !meldung;
        fehler[name].textContent = meldung || "";
        if (meldung) {
          felder[name].setAttribute("aria-invalid", "true");
          if (!erstes) erstes = felder[name];
        } else {
          felder[name].removeAttribute("aria-invalid");
        }
      });
      return erstes;
    }

    // Versand gibt es noch nicht: Nach gültiger Eingabe steht nur die Meldung unter dem Knopf, die Angaben werden nicht angezeigt
    wurzel.addEventListener("submit", function (e) {
      e.preventDefault();
      var sprache = window.VianuTexte.sprache(wurzel);
      var r = window.VianuFormular.pruefeAnfrage(daten(), sprache);
      var erstes = zeigeFehler(r);
      if (!r.ok) {
        if (status) status.textContent = "";
        if (erstes) erstes.focus();
        return;
      }
      if (status) status.textContent = window.VianuTexte.text("formular.versand", null, wurzel);
    });
    Object.keys(felder).forEach(function (name) {
      felder[name].addEventListener("input", function () {
        if (status) status.textContent = "";
        if (fehler[name] && !fehler[name].hidden) {
          fehler[name].hidden = true;
          felder[name].removeAttribute("aria-invalid");
        }
      });
    });
  }

  /* ---------- Anfrage-Strecke im Boden-Kapitel ---------- */
  // Fünf Fragen nacheinander. Eine Frage erscheint erst, wenn die davor gültig beantwortet und auf Weiter geklickt wurde.
  // Wird eine Antwort danach ungültig oder fällt der Regler unter 4 Stunden, verschwindet alles dahinter wieder.
  function initAnfrageStrecke(wurzel) {
    var F = window.VianuFormular;
    if (!F) return;
    var schritte = wurzel.querySelectorAll("[data-frage]");
    var weiter = wurzel.querySelectorAll("[data-weiter]");
    var ende = wurzel.querySelector("[data-strecke-ende]");
    var absenden = wurzel.querySelector("[data-absenden]");
    var ansage = wurzel.querySelector("[data-strecke-ansage]");
    var status = wurzel.querySelector("[data-strecke-status]");
    var felder = {};
    jeder("[data-feld]", wurzel, function (f) { felder[f.getAttribute("data-feld")] = f; });
    if (schritte.length !== 5 || weiter.length !== 4 || !ende || !absenden) return;
    var kapitel = wurzel.closest("[data-boden]");
    var erreicht = 1;
    var falle = wurzel.querySelector("[data-falle]");
    var gesendet = false;

    var gueltig = [
      function () { return F.mitarbeitendeGueltig(felder.mitarbeitende.value, 10); },
      function () { return felder.rolle.value !== ""; },
      function () { return F.unternehmenGueltig(felder.unternehmen.value); },
      function () { return F.emailGueltig(felder.kontakt.value); }
    ];
    function daten() {
      return {
        unternehmen: felder.unternehmen.value,
        rolle: felder.rolle.value,
        mitarbeitende: felder.mitarbeitende.value,
        // Stunden und Branche kommen vom Regler und von der gewählten Kachel
        stunden: kapitel && kapitel.querySelector("[data-boden-regler]") ? kapitel.querySelector("[data-boden-regler]").value : "",
        branche: kapitel && kapitel.querySelector('[data-taetigkeit][aria-pressed="true"]') ? kapitel.querySelector('[data-taetigkeit][aria-pressed="true"]').getAttribute("data-taetigkeit") : "",
        kontakt: felder.kontakt.value,
        quelle: felder.quelle.value,
        freitext: felder.freitext.value,
        anliegen: felder.anliegen.value,
        einwilligung: felder.einwilligung.checked
      };
    }
    function aktualisiere() {
      for (var i = 0; i < erreicht - 1 && i < gueltig.length; i++) {
        if (!gueltig[i]()) { erreicht = i + 1; break; }
      }
      Array.prototype.forEach.call(schritte, function (s, i) { s.hidden = i + 1 > erreicht; });
      Array.prototype.forEach.call(weiter, function (w, i) {
        w.hidden = i + 1 < erreicht;
        w.disabled = !gueltig[i]();
      });
      ende.hidden = erreicht < 5;
      wurzel.dispatchEvent(new CustomEvent("strecke-schritt", { bubbles: true, detail: { schritt: erreicht } }));
      var fertig = erreicht === 5 && gueltig.every(function (g) { return g(); }) && F.pruefeAnfrage(daten(), window.VianuTexte.sprache(wurzel)).ok;
      absenden.disabled = !fertig || gesendet;
      if (!fertig && !gesendet && status) status.textContent = "";
    }
    function vor(i) {
      if (!gueltig[i]()) return;
      erreicht = i + 2;
      aktualisiere();
      var ziel = schritte[i + 1].querySelector("input, select, textarea");
      var frage = schritte[i + 1].querySelector("label");
      if (ansage && frage) ansage.textContent = frage.textContent;
      if (ziel) ziel.focus();
    }
    Array.prototype.forEach.call(weiter, function (w, i) { w.addEventListener("click", function () { vor(i); }); });
    Object.keys(felder).forEach(function (name) {
      felder[name].addEventListener("input", aktualisiere);
      felder[name].addEventListener("change", aktualisiere);
    });
    // Enter in einem Feld geht zur nächsten Frage
    wurzel.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || !e.target || e.target.tagName !== "INPUT" || e.target.type === "checkbox") return;
      e.preventDefault();
      var i = Number(e.target.closest("[data-frage]").getAttribute("data-frage")) - 1;
      if (i < weiter.length && !weiter[i].hidden) vor(i);
    });
    // Absenden: erst jetzt geht etwas an HubSpot (versand.js). Füllt jemand das unsichtbare Fallenfeld aus, ist es ein Bot:
    // Er sieht dieselbe Dankmeldung, gesendet wird nichts.
    function melde(schluessel) { if (status) status.textContent = window.VianuTexte.text(schluessel, null, wurzel); }
    wurzel.addEventListener("submit", function (e) {
      e.preventDefault();
      if (gesendet || absenden.disabled || !F.pruefeAnfrage(daten(), window.VianuTexte.sprache(wurzel)).ok) return;
      if (falle && falle.value) { gesendet = true; absenden.disabled = true; melde("strecke.gesendet"); return; }
      var einwilligung = felder.einwilligung.labels && felder.einwilligung.labels[0];
      var nutzlast = F.hubspotNutzlast(daten(), {
        seite: window.location.href.split("#")[0].split("?")[0],
        titel: document.title,
        sprache: window.VianuTexte.sprache(wurzel),
        einwilligungText: einwilligung ? einwilligung.textContent.replace(/\s+/g, " ").trim() : ""
      });
      if (!nutzlast || !window.VianuVersand) { melde("strecke.fehler"); return; }
      absenden.disabled = true;
      melde("strecke.sendet");
      window.VianuVersand.sende(nutzlast, "strecke").then(function (ok) {
        if (ok) { gesendet = true; melde("strecke.gesendet"); return; }
        absenden.disabled = false;
        melde("strecke.fehler");
      });
    });
    if (kapitel) {
      kapitel.addEventListener("boden-zurueck", function () {
        wurzel.reset();
        erreicht = 1;
        gesendet = false;
        if (status) status.textContent = "";
        aktualisiere();
      });
    }
    // Aus dem Sitzungsspeicher vorbelegte Antworten: gültige Fragen sind schon beantwortet, es geht bei der ersten offenen weiter
    while (erreicht < 5 && gueltig[erreicht - 1]()) erreicht++;
    aktualisiere();
  }

  /* ---------- Was Sie bekommen: Reiter und Bühne ---------- */
  // Ohne Skript stehen alle drei Felder untereinander. Mit Skript zeigt die Bühne ein Feld: per Klick, Tastatur
  // (Pfeiltasten, Pos1, Ende) und beim Darüberfahren mit der Maus.
  function initReise(wurzel) {
    var reiter = wurzel.querySelectorAll("[data-reiter]");
    var felder = wurzel.querySelectorAll("[data-feld-nr]");
    if (!reiter.length || reiter.length !== felder.length) return;

    // Die Rollen setzt erst das Skript: Ohne Skript stehen alle Felder offen untereinander, die Reiter sind dann nur Überschriften
    var liste = wurzel.querySelector(".reise__reiter");
    if (liste) liste.setAttribute("role", "tablist");
    Array.prototype.forEach.call(reiter, function (r) { r.setAttribute("role", "tab"); });
    Array.prototype.forEach.call(felder, function (f) { f.setAttribute("role", "tabpanel"); f.setAttribute("tabindex", "0"); });

    function waehle(nr, fokus) {
      Array.prototype.forEach.call(reiter, function (r) {
        var an = r.getAttribute("data-reiter") === nr;
        r.setAttribute("aria-selected", an ? "true" : "false");
        r.setAttribute("tabindex", an ? "0" : "-1");
        if (an && fokus) r.focus();
      });
      Array.prototype.forEach.call(felder, function (f) { f.hidden = f.getAttribute("data-feld-nr") !== nr; });
    }
    Array.prototype.forEach.call(reiter, function (r, i) {
      r.addEventListener("click", function () { waehle(r.getAttribute("data-reiter")); });
      r.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") waehle(r.getAttribute("data-reiter")); });
      r.addEventListener("keydown", function (e) {
        var ziel = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") ziel = (i + 1) % reiter.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ziel = (i - 1 + reiter.length) % reiter.length;
        else if (e.key === "Home") ziel = 0;
        else if (e.key === "End") ziel = reiter.length - 1;
        if (ziel === null) return;
        e.preventDefault();
        waehle(reiter[ziel].getAttribute("data-reiter"), true);
      });
    });
    waehle("1");
  }

  /* ---------- Roderichs Weg: Stationen mit Fußspuren ---------- */
  // Ohne Skript stehen alle Stationen untereinander. Mit Skript zeigt die Bühne eine Station, die Fußspuren bis dorthin sind pink.
  // Auf der letzten Station (Darum VIANU) steht statt Weiter der Knopf Kontakt aufnehmen.
  function initWeg(wurzel) {
    var stationen = wurzel.querySelectorAll("[data-station]");
    var felder = wurzel.querySelectorAll("[data-station-nr]");
    var leiste = wurzel.querySelector(".weg__leiste");
    var zurueck = wurzel.querySelector("[data-weg-zurueck]");
    var weiter = wurzel.querySelector("[data-weg-weiter]");
    var pilot = wurzel.querySelector("[data-weg-pilot]");
    if (!stationen.length || stationen.length !== felder.length) return;
    var aktuell = 1;

    function waehle(n) {
      aktuell = Math.max(1, Math.min(stationen.length, n));
      Array.prototype.forEach.call(stationen, function (b, i) {
        b.setAttribute("aria-pressed", i + 1 === aktuell ? "true" : "false");
        b.setAttribute("data-erreicht", i + 1 <= aktuell ? "true" : "false");
      });
      Array.prototype.forEach.call(felder, function (f, i) { f.hidden = i + 1 !== aktuell; });
      if (leiste) leiste.style.setProperty("--fortschritt-anteil", String((aktuell - 1) / (stationen.length - 1)));
      if (zurueck) zurueck.disabled = aktuell === 1;
      if (weiter) weiter.hidden = aktuell === stationen.length;
      if (pilot) pilot.hidden = aktuell !== stationen.length;
    }
    Array.prototype.forEach.call(stationen, function (b, i) {
      b.addEventListener("click", function () { waehle(i + 1); });
      b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") waehle(i + 1); });
    });
    if (zurueck) zurueck.addEventListener("click", function () { waehle(aktuell - 1); });
    if (weiter) weiter.addEventListener("click", function () { waehle(aktuell + 1); });
    waehle(1);
  }

  /* ---------- Weiterleiten ---------- */
  function initWeiterleiten(wurzel) {
    var knopf = wurzel.querySelector("[data-weiterleiten-kopieren]");
    var status = wurzel.querySelector("[data-weiterleiten-status]");
    var feld = wurzel.querySelector("[data-weiterleiten-link]");
    if (!knopf || !status) return;
    knopf.addEventListener("click", function () {
      // Auf Rollenseiten (data-weiterleiten-diese-seite) kopiert die Taste die Adresse der Seite, sonst die der B2B-Startseite
      var diese = wurzel.hasAttribute("data-weiterleiten-diese-seite");
      var link = diese ? window.location.href.split("#")[0].split("?")[0] : new URL(".", document.baseURI).href;
      if (feld) feld.hidden = true;
      kopierenMit(link, status, window.VianuTexte.text("kopiert.link", null, wurzel), window.VianuTexte.text("kopiert.fehler.link.sie", null, wurzel), function () {
        if (!feld) return;
        feld.hidden = false;
        feld.value = link;
        feld.focus();
        feld.select();
      });
    });
  }

  function start() {
    jeder("[data-druckkarte]", document, initDruckkarte);
    jeder("[data-strecke]", document, initAnfrageStrecke);
    jeder("[data-klein]", document, initKlein);
    jeder("[data-sorgen]", document, initSorgen);
    jeder("[data-rechner]", document, initRechner);
    jeder("[data-breakeven]", document, initBreakEven);
    jeder("[data-formular]", document, initFormular);
    jeder("[data-weiterleiten]", document, initWeiterleiten);
    jeder("[data-reise]", document, initReise);
    jeder("[data-stationenweg]", document, initWeg);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
