/*
  Wischleiste für die vier Kurzpunkte unter dem Seitenkopf. Schnittstelle: Elemente .kurz mit .kurz__liste arbeiten für sich.
  Auf dem Handy liegen die Punkte als Karten nebeneinander und rasten beim Wischen ein (nur CSS). Das Skript macht Pfeile und
  Punkteanzeige lebendig: Die Pfeile (data-kurz-zurueck, data-kurz-weiter) scrollen eine Karte weiter, die Punkte zeigen die
  Karte, die gerade mittig steht. Auf Laptop und Tablet sind Pfeile und Punkte per CSS verborgen, die Punkte stehen dort in einer Reihe.
  Ohne Skript lässt sich die Liste trotzdem wischen.
*/
(function () {
  function init(huelle) {
    var liste = huelle.querySelector(".kurz__liste");
    var zurueck = huelle.querySelector("[data-kurz-zurueck]");
    var weiter = huelle.querySelector("[data-kurz-weiter]");
    var punkte = huelle.querySelectorAll(".kurz__punkte span");
    if (!liste || !zurueck || !weiter) return;
    var karten = liste.querySelectorAll(".kurz__punkt");
    var geplant = false;

    function aktuell() {
      var mitte = liste.scrollLeft + liste.clientWidth / 2, bester = 0, abstand = Infinity;
      Array.prototype.forEach.call(karten, function (k, i) {
        var d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mitte);
        if (d < abstand) { abstand = d; bester = i; }
      });
      if (liste.scrollLeft <= 2) return 0;
      if (liste.scrollLeft >= liste.scrollWidth - liste.clientWidth - 2) return karten.length - 1;
      return bester;
    }
    function zeige() {
      geplant = false;
      var i = aktuell();
      Array.prototype.forEach.call(punkte, function (p, j) { if (j === i) p.setAttribute("data-aktiv", "true"); else p.removeAttribute("data-aktiv"); });
      zurueck.disabled = i <= 0;
      weiter.disabled = i >= karten.length - 1;
    }
    function gehe(schritt) {
      var ziel = Math.max(0, Math.min(karten.length - 1, aktuell() + schritt));
      var k = karten[ziel];
      liste.scrollTo({ left: k.offsetLeft - (liste.clientWidth - k.offsetWidth) / 2, behavior: "smooth" });
    }
    liste.addEventListener("scroll", function () { if (!geplant) { geplant = true; window.requestAnimationFrame(zeige); } }, { passive: true });
    window.addEventListener("resize", zeige);
    zurueck.addEventListener("click", function () { gehe(-1); });
    weiter.addEventListener("click", function () { gehe(1); });
    zeige();
  }
  function start() {
    Array.prototype.forEach.call(document.querySelectorAll(".kurz"), function (h) {
      try { init(h); } catch (fehler) { if (window.console) window.console.error(fehler); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
