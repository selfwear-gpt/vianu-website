/*
  Video startet beim Öffnen und Neuladen von selbst, stumm und in Schleife, auf Laptop, PC und Handy.
  Schnittstelle: sollAutoplay(umgebung) mit { reduziert, datensparen }, quelleFuerGeraet({ schmal, grobZeiger,
  datensparen }) mit "klein" oder "gross", waehleQuelle(video), initAutoplay(video).
  Jedes Video hat eine große Fassung (source) und eine kleine (data-klein): Handy, Touchgeräte und Datensparmodus laden die kleine.
  Reduzierte Bewegung und Datensparmodus behalten Vorschaubild und Startknopf. Das Handy lädt die kleine Fassung. Ton schaltet die Person
  über die Steuerung des Videos ein. Aus dem Bild gescrollt pausiert das Video, außer die Person hat selbst pausiert.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    var api = factory();
    root.VianuAutoplay = api;
    if (root.document) {
      var start = function () {
        Array.prototype.forEach.call(root.document.querySelectorAll("video.video__film"), function (video) {
          api.waehleQuelle(video);
          api.initAutoplay(video);
        });
      };
      if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
      else start();
    }
  }
})(this, function () {
  function sollAutoplay(umgebung) {
    var u = umgebung || {};
    return u.reduziert === false && u.datensparen === false;
  }

  function quelleFuerGeraet(umgebung) {
    var u = umgebung || {};
    return u.schmal === true || u.grobZeiger === true || u.datensparen === true ? "klein" : "gross";
  }

  // Tauscht die große Fassung gegen die kleine, bevor das Video etwas lädt (preload="none" auf dem Handy)
  function waehleQuelle(video) {
    if (!video || !video.getAttribute) return;
    var klein = video.getAttribute("data-klein");
    var quelle = video.querySelector && video.querySelector("source");
    if (!klein || !quelle) return;
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    var verbindung = navigator.connection || {};
    var wahl = quelleFuerGeraet({ schmal: mq("(max-width: 40rem)"), grobZeiger: mq("(pointer: coarse)"), datensparen: verbindung.saveData === true });
    if (wahl !== "klein") return;
    quelle.setAttribute("src", klein);
    video.load();
  }

  // Startet erst nach dem Laden der Seite und im Leerlauf, damit das Video den Seitenaufbau nicht bremst
  function spaeter(aufgabe) {
    var los = function () {
      if (window.requestIdleCallback) window.requestIdleCallback(aufgabe, { timeout: 2000 });
      else window.setTimeout(aufgabe, 300);
    };
    if (document.readyState === "complete") los();
    else window.addEventListener("load", los, { once: true });
  }

  function umgebungAusBrowser() {
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    var verbindung = navigator.connection || {};
    return {
      reduziert: mq("(prefers-reduced-motion: reduce)"),
      datensparen: verbindung.saveData === true
    };
  }

  function initAutoplay(video) {
    if (!video || !sollAutoplay(umgebungAusBrowser())) return;
    video.muted = true;
    video.loop = true;
    video.preload = "auto";
    var vomNutzerAngehalten = false;
    var wirdVonUnsAngehalten = false;

    function spiele() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* Browser erlaubt es nicht: Vorschaubild und Startknopf bleiben */ });
    }
    video.addEventListener("pause", function () {
      if (!wirdVonUnsAngehalten && !video.ended) vomNutzerAngehalten = true;
    });
    video.addEventListener("play", function () { vomNutzerAngehalten = false; });
    spaeter(spiele);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (eintraege) {
        var sichtbar = eintraege[eintraege.length - 1].isIntersecting;
        if (!sichtbar && !video.paused) {
          wirdVonUnsAngehalten = true;
          video.pause();
          wirdVonUnsAngehalten = false;
        } else if (sichtbar && video.paused && !vomNutzerAngehalten) spiele();
      }, { threshold: 0.25 }).observe(video);
    }
  }

  return { sollAutoplay: sollAutoplay, quelleFuerGeraet: quelleFuerGeraet, waehleQuelle: waehleQuelle, initAutoplay: initAutoplay };
});
