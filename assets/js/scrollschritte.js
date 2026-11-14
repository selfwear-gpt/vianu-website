/*
  Scroll statt Hover. Schnittstelle: VianuScrollSchritte.binde(raster, spalten, anzahl, setze) -> { springe(i) } oder null. Benötigt fortschritt.js.
  Auf Laptop und Desktop (Maus mit Hover, breiter als 56rem, ohne reduzierte Bewegung) bekommt das Raster die Klasse .scroll-schritte:
  Es wird hoch, die Spalten (Liste und Bild) kleben im Bild, und beim Scrollen wählt die Lage des Rasters den Schritt. setze(i) bekommt
  den Schritt ab 0, nur wenn er wechselt. springe(i) scrollt (ohne Animation) mitten in den Abschnitt des Schritts, damit Klick und
  Tastatur zur Scrollposition passen. Auf Handy, Tablet, Touch und bei reduzierter Bewegung bleibt alles wie vorher: keine Klasse, keine Wirkung.
*/
(function () {
  var F = window.VianuFortschritt;
  var BEDINGUNG = "(min-width: 56.01rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

  function binde(raster, spalten, anzahl, setze) {
    if (!F || !window.matchMedia || !raster || !spalten || !spalten.length || !(anzahl > 1)) return null;
    var mq = window.matchMedia(BEDINGUNG);
    var letzter = -1, geplant = false;

    function hoeheDerBuehne() {
      var h = 0;
      Array.prototype.forEach.call(spalten, function (s) { h = Math.max(h, s.offsetHeight); });
      return h;
    }
    function haften() { return parseFloat(window.getComputedStyle(spalten[0]).top) || 0; }

    function pruefe() {
      geplant = false;
      // Versteckte Seiten (Gesamtvorschau) haben keine Größe: dort darf nichts umschalten
      if (!mq.matches || !raster.getClientRects().length) return;
      var r = raster.getBoundingClientRect();
      var i = F.schrittImRaster(r.top, r.height, hoeheDerBuehne(), haften(), anzahl);
      if (i !== letzter) { letzter = i; setze(i); }
    }
    function planen() {
      if (!geplant) { geplant = true; window.requestAnimationFrame(pruefe); }
    }
    function anwenden() {
      raster.classList.toggle("scroll-schritte", mq.matches);
      if (mq.matches) raster.style.setProperty("--schritte", String(anzahl));
      else raster.style.removeProperty("--schritte");
      letzter = -1;
      planen();
    }

    anwenden();
    if (mq.addEventListener) mq.addEventListener("change", anwenden); else if (mq.addListener) mq.addListener(anwenden);
    window.addEventListener("scroll", planen, { passive: true });
    window.addEventListener("resize", planen);
    if ("IntersectionObserver" in window) new IntersectionObserver(planen).observe(raster);

    return {
      springe: function (i) {
        if (!mq.matches) return;
        var r = raster.getBoundingClientRect();
        var fenster = window.innerHeight || document.documentElement.clientHeight;
        // Nur wenn das Raster im Bild ist. Sonst wählt der Klick den Schritt, das nächste Scrollen setzt ihn nach der Lage neu.
        if (r.bottom < 0 || r.top > fenster) return;
        var ziel = (window.pageYOffset || 0) + r.top - haften() + F.versatzFuerSchritt(i, r.height, hoeheDerBuehne(), anzahl);
        letzter = i;
        window.scrollTo({ top: ziel, left: 0, behavior: "instant" });
      }
    };
  }

  window.VianuScrollSchritte = { binde: binde };
})();
