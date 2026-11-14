/*
  Schritt-für-Schritt-Ablauf. Schnittstelle: Elemente mit [data-ablauf] arbeiten für sich.
  Darin: Tasten [data-schritt="n"] (aria-pressed), Flächen [data-screen="n"], optional [data-cta-schritt="n"] (Knopf im Bild, nur bei Schritt n sichtbar), [data-ablauf-beschreibung]
  und .handy__ecken (Animation beim zweiten Schritt neu starten). Das Skript blendet alle Flächen außer der des
  gewählten Schritts aus. Flächen im HTML tragen deshalb kein hidden, ohne Skript steht alles lesbar da.
  Auf dem Laptop wählt das Scrollen den Schritt (scrollschritte.js), das Darüberfahren mit der Maus schaltet nicht mehr um. Klick, Tippen und Tastatur gehen weiter.
*/
(function () {
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initAblauf(wurzel) {
    var knoepfe = wurzel.querySelectorAll("[data-schritt]");
    var screens = wurzel.querySelectorAll("[data-screen]");
    var beschreibung = wurzel.querySelector("[data-ablauf-beschreibung]");
    var ecken = wurzel.querySelector(".handy__ecken");
    var knoepfeImBild = wurzel.querySelectorAll("[data-cta-schritt]");
    if (!knoepfe.length) return;

    function waehle(nummer) {
      Array.prototype.forEach.call(knoepfe, function (k) {
        k.setAttribute("aria-pressed", k.getAttribute("data-schritt") === nummer ? "true" : "false");
      });
      Array.prototype.forEach.call(screens, function (s) {
        if (s.getAttribute("data-screen") === nummer) s.removeAttribute("hidden");
        else s.setAttribute("hidden", "");
      });
      Array.prototype.forEach.call(knoepfeImBild, function (b) { b.hidden = b.getAttribute("data-cta-schritt") !== nummer; });
      var aktiv = wurzel.querySelector('[data-schritt="' + nummer + '"] strong');
      if (beschreibung && aktiv) beschreibung.textContent = window.VianuTexte.text("ablauf.schritt", { nummer: nummer, text: aktiv.textContent }, wurzel);
      if (ecken && nummer === "2" && !reduziert) {
        ecken.style.animation = "none";
        void ecken.getBoundingClientRect();
        ecken.style.animation = "";
      }
    }
    // Auf dem Laptop bleibt das Bild beim Scrollen stehen und die Lage beim Scrollen wählt den Schritt
    var raster = wurzel.querySelector(".ablauf__raster");
    var liste = wurzel.querySelector(".ablauf__liste");
    var bild = wurzel.querySelector(".ablauf__bild");
    var scroll = window.VianuScrollSchritte && raster && liste && bild
      ? window.VianuScrollSchritte.binde(raster, [liste, bild], knoepfe.length, function (i) { waehle(knoepfe[i].getAttribute("data-schritt")); })
      : null;
    Array.prototype.forEach.call(knoepfe, function (k, i) {
      // Tippen, Tastatur und Fokus laufen über click. Auf dem Laptop springt die Seite dabei zur Stelle des Schritts.
      k.addEventListener("click", function () { waehle(k.getAttribute("data-schritt")); if (scroll) scroll.springe(i); });
    });
    waehle("1");
  }

  function start() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-ablauf]"), initAblauf);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
