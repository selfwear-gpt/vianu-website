/*
  Video startet beim Öffnen und Neuladen von selbst, stumm und in Schleife, aber nur auf Laptop und PC.
  Schnittstelle: sollAutoplay(umgebung) mit { feinerZeiger, reduziert, datensparen }, initAutoplay(video).
  Handy, Tablet, reduzierte Bewegung und Datensparmodus behalten Vorschaubild und Startknopf. Ton schaltet die Person
  über die Steuerung des Videos ein. Aus dem Bild gescrollt pausiert das Video, außer die Person hat selbst pausiert.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else {
    var api = factory();
    root.VianuAutoplay = api;
    if (root.document) {
      var start = function () {
        Array.prototype.forEach.call(root.document.querySelectorAll("video.video__film"), api.initAutoplay);
      };
      if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
      else start();
    }
  }
})(this, function () {
  function sollAutoplay(umgebung) {
    var u = umgebung || {};
    return u.feinerZeiger === true && u.reduziert === false && u.datensparen === false;
  }

  function umgebungAusBrowser() {
    var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
    var verbindung = navigator.connection || {};
    return {
      feinerZeiger: mq("(hover: hover) and (pointer: fine)"),
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
    spiele();

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

  return { sollAutoplay: sollAutoplay, initAutoplay: initAutoplay };
});
