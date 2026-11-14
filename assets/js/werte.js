/*
  Alles in einer Sohle. Schnittstelle: Elemente mit [data-werte] arbeiten für sich.
  Die Überschriften (Karten mit [data-wert]) stehen immer da. Die Beschreibung klappt das CSS auf, wenn eine Karte, ihre Linie oder ihr Punkt
  überfahren oder die Karte per Tastatur fokussiert wird. Das Skript fügt zwei Dinge hinzu:
  1. Die ganze Sohle ist Trefferfläche: Fährt die Maus irgendwo über die Sohle, öffnet sich die Karte des nächstgelegenen Punkts (data-nah="true").
     Nähert sich die Maus einem Punkt auf der Mittelspalte, wächst er leicht (data-nah="punkt"). Es ist immer nur eine Karte offen.
  2. Auf Touchgeräten und auf dem Handy (schmaler als 40rem) klappt ein Tippen die Karte auf (data-fix), eine andere Karte oder ein
     zweites Tippen klappt sie wieder zu. Auf dem Handy stehen die Karten zugeklappt mit einem Pfeil. Enter und Leertaste öffnen sie ebenfalls.
  Ohne Skript bleibt alles lesbar, die Karten öffnen dann per Hover und Fokus.
*/
(function () {
  var NAEHE = 70;

  function init(huelle) {
    var karten = Array.prototype.slice.call(huelle.querySelectorAll("[data-wert]"));
    var mitte = huelle.querySelector(".werte__mitte");

    function umschalten(k) {
      var an = k.getAttribute("data-fix") !== "true";
      karten.forEach(function (andere) { andere.removeAttribute("data-fix"); });
      if (an) k.setAttribute("data-fix", "true");
    }
    // Mit Maus öffnet das Überfahren, nur auf Touchgeräten und auf dem Handy zählt das Tippen
    function antippbar() { return window.matchMedia("(hover: none), (max-width: 40rem)").matches; }
    karten.forEach(function (k) {
      k.addEventListener("click", function () { if (antippbar()) umschalten(k); });
      k.addEventListener("keydown", function (e) {
        if (e.target !== k || (e.key !== "Enter" && e.key !== " ") || !window.matchMedia("(max-width: 40rem)").matches) return;
        e.preventDefault();
        umschalten(k);
      });
    });
    if (!mitte) return;

    // Lage des Punkts einer Karte: --px ist der Anteil der Mittelspalte vom Kartenrand aus, die Höhe ist die Mitte der Karte
    function punkt(k, m) {
      var r = k.getBoundingClientRect();
      var px = parseFloat(window.getComputedStyle(k).getPropertyValue("--px")) || 0.5;
      var links = !!k.closest(".werte__spalte--links");
      return { x: links ? m.left + px * m.width : m.right - px * m.width, y: r.top + r.height / 2 };
    }
    function setze(ziel, wert) {
      karten.forEach(function (k) {
        if (k === ziel && wert) k.setAttribute("data-nah", wert);
        else k.removeAttribute("data-nah");
      });
    }
    mitte.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var m = mitte.getBoundingClientRect();
      var naechste = null, abstand = Infinity;
      karten.forEach(function (k) {
        var p = punkt(k, m);
        var d = Math.sqrt((p.x - e.clientX) * (p.x - e.clientX) + (p.y - e.clientY) * (p.y - e.clientY));
        if (d < abstand) { abstand = d; naechste = k; }
      });
      var aufSohle = !!(e.target.closest && e.target.closest(".sohle-koerper"));
      if (aufSohle) setze(naechste, "true");
      else if (abstand < NAEHE) setze(naechste, "punkt");
      else setze(null, null);
    });
    mitte.addEventListener("pointerleave", function () { setze(null, null); });
  }
  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-werte]"), function (h) {
      try { init(h); } catch (fehler) { if (window.console) window.console.error(fehler); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
