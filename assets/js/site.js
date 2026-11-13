/*
  Menü beider Bereiche. Schnittstelle: initMenue(wurzel) für jedes Element mit [data-menue].
  Jedes Menü arbeitet für sich und greift nur auf eigene Kindelemente zu. Das Menü des Mitarbeitenden-Bereichs
  hat keine Rollenauswahl, das des B2B-Bereichs schon (optional).
  Ohne Skript bleibt alles lesbar: Menü und Auswahl sind dann geöffnet.
*/
(function () {
  document.documentElement.classList.add("js");

  function initMenue(wurzel) {
    var knopf = wurzel.querySelector("[data-menue-knopf]");
    var nav = wurzel.querySelector("[data-menue-nav]");
    if (!knopf || !nav) return;

    var auswahlKnopf = wurzel.querySelector("[data-auswahl-knopf]");
    var panel = auswahlKnopf ? document.getElementById(auswahlKnopf.getAttribute("aria-controls")) : null;

    // Auf dem Handy (bis 62rem) ist "Wer entscheidet mit?" eine Überschrift, die Rollen darunter stehen immer offen.
    var handy = window.matchMedia ? window.matchMedia("(max-width: 62rem)") : null;
    function setzeAuswahl(offen) {
      if (!auswahlKnopf || !panel) return;
      if (handy && handy.matches) offen = true;
      auswahlKnopf.disabled = !!(handy && handy.matches);
      auswahlKnopf.setAttribute("aria-expanded", offen ? "true" : "false");
      panel.hidden = !offen;
    }
    function setzeMenue(offen) {
      knopf.setAttribute("aria-expanded", offen ? "true" : "false");
      nav.setAttribute("data-offen", offen ? "true" : "false");
      if (!offen) setzeAuswahl(false);
    }

    setzeAuswahl(false);
    setzeMenue(false);
    if (handy && handy.addEventListener) handy.addEventListener("change", function () { setzeAuswahl(false); });

    knopf.addEventListener("click", function () {
      setzeMenue(knopf.getAttribute("aria-expanded") !== "true");
    });
    if (auswahlKnopf && panel) {
      auswahlKnopf.addEventListener("click", function () {
        setzeAuswahl(auswahlKnopf.getAttribute("aria-expanded") !== "true");
      });
      document.addEventListener("click", function (e) {
        if (!panel.hidden && !panel.contains(e.target) && !auswahlKnopf.contains(e.target)) setzeAuswahl(false);
      });
      // Bei Zeigergeräten öffnet die Auswahl schon beim Darüberfahren. Ein kurzer Verzug verhindert Flackern beim Wechsel zum Panel.
      var huelle = auswahlKnopf.parentNode;
      var zu = null;
      var hover = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
      huelle.addEventListener("mouseenter", function () {
        if (!hover || !hover.matches) return;
        window.clearTimeout(zu);
        setzeAuswahl(true);
      });
      huelle.addEventListener("mouseleave", function () {
        if (!hover || !hover.matches) return;
        window.clearTimeout(zu);
        zu = window.setTimeout(function () { setzeAuswahl(false); }, 200);
      });
    }

    wurzel.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (auswahlKnopf && auswahlKnopf.getAttribute("aria-expanded") === "true") {
        setzeAuswahl(false);
        auswahlKnopf.focus();
      } else if (knopf.getAttribute("aria-expanded") === "true") {
        setzeMenue(false);
        knopf.focus();
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setzeMenue(false);
    });
  }

  // Hinweis am i-Knopf (Rechenweg): Hover und Fokus zeigen ihn per CSS, auf Touchgeräten öffnet und schließt ihn das Tippen.
  function initInfo() {
    document.addEventListener("click", function (e) {
      var knopf = e.target.closest ? e.target.closest(".info__knopf") : null;
      Array.prototype.forEach.call(document.querySelectorAll(".info[data-offen]"), function (i) {
        if (!knopf || i !== knopf.parentNode) i.removeAttribute("data-offen");
      });
      if (!knopf) return;
      var hulle = knopf.parentNode;
      if (hulle.hasAttribute("data-offen")) hulle.removeAttribute("data-offen");
      else hulle.setAttribute("data-offen", "");
    });
  }

  function start() {
    initInfo();
    Array.prototype.forEach.call(document.querySelectorAll("[data-menue]"), initMenue);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
