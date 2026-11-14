/*
  Scroll-Fortschritt für Bewegungen, die am Scrollen hängen. Schnittstelle:
  fortschrittImBild(oben, hoehe, fenster), fortschrittBisUnterkante(oben, hoehe, fenster, start, ende), schrittImRaster(oben, hoehe, buehne, haften, anzahl), versatzFuerSchritt(i, hoehe, buehne, anzahl), aktiverSchritt(fortschritt, anzahl), sichtbareAnzahl(fortschritt, anzahl),
  anteilZwischen(wert, von, bis), zeigerWinkel(anteil, startStunde, endStunde), kreisInnen(istInnen, cx, cy, r, abstand).
  Reine Funktionen ohne Browserbezug. Der Fortschritt ist immer umkehrbar: gleicher Stand, gleiches Bild.
*/
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VianuFortschritt = factory();
})(this, function () {
  function begrenze(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  // 0, wenn der Bereich unten ins Fenster tritt (oben = fenster), 1, wenn er oben herausgeht (unten = 0)
  function fortschrittImBild(oben, hoehe, fenster) {
    var strecke = fenster + hoehe;
    if (!(strecke > 0)) return 0;
    return begrenze((fenster - oben) / strecke);
  }

  // 0, wenn die Oberkante des Bereichs bei start (Anteil der Fensterhöhe) liegt, 1, wenn seine Unterkante bei ende (Anteil der
  // Fensterhöhe) liegt. Der Bereich ist also fertig, solange er noch ganz im Bild steht. Ist er kürzer als der Abstand zwischen
  // start und ende, springt der Wert dort von 0 auf 1.
  function fortschrittBisUnterkante(oben, hoehe, fenster, start, ende) {
    var strecke = hoehe - (ende - start) * fenster;
    if (!(fenster > 0) || !(strecke > 0)) return oben <= start * fenster ? 1 : 0;
    return begrenze((start * fenster - oben) / strecke);
  }

  // Raster mit festgehaltener Bühne: Das Raster ist hoch, die Bühne (Höhe buehne) klebt bei haften am oberen Rand. Welcher von
  // anzahl Schritten steht gerade, wenn die Oberkante des Rasters bei oben liegt? 0 bis anzahl - 1, vor dem Festkleben 0.
  function schrittImRaster(oben, hoehe, buehne, haften, anzahl) {
    var strecke = hoehe - buehne;
    if (!(strecke > 0)) return 0;
    return aktiverSchritt(anteilZwischen(haften - oben, 0, strecke), anzahl);
  }

  // Umkehrung dazu: Wie viele Pixel ab der Oberkante des Rasters muss man scrollen, damit Schritt i (ab 0) mitten in seinem Abschnitt steht?
  function versatzFuerSchritt(i, hoehe, buehne, anzahl) {
    var strecke = hoehe - buehne;
    if (!(strecke > 0) || !(anzahl >= 1)) return 0;
    var k = i < 0 ? 0 : i > anzahl - 1 ? anzahl - 1 : i;
    return ((k + 0.5) / anzahl) * strecke;
  }

  // Welcher von anzahl Schritten ist aktiv: 0 bis anzahl - 1
  function aktiverSchritt(fortschritt, anzahl) {
    if (!(anzahl >= 1) || isNaN(fortschritt)) return 0;
    var i = Math.floor(begrenze(fortschritt) * anzahl);
    return i > anzahl - 1 ? anzahl - 1 : i;
  }

  // Wie viele von anzahl Teilen sind sichtbar: 0 bis anzahl
  function sichtbareAnzahl(fortschritt, anzahl) {
    if (!(anzahl >= 1) || isNaN(fortschritt)) return 0;
    return Math.floor(begrenze(fortschritt) * anzahl + 1e-9);
  }

  // Wo liegt wert zwischen von und bis: 0 davor, 1 danach, dazwischen linear. Gleicher Anfang und Ende ergibt 0.
  function anteilZwischen(wert, von, bis) {
    if (bis === von) return 0;
    return begrenze((wert - von) / (bis - von));
  }

  // Winkel des Stundenzeigers in Grad, 12 Uhr oben, im Uhrzeigersinn. Der Zeiger läuft von startStunde bis endStunde,
  // 30 Grad je Stunde. Die Werte laufen über 360 Grad hinaus, CSS rechnet das wie eine Drehung weiter.
  function zeigerWinkel(anteil, startStunde, endStunde) {
    var a = isNaN(anteil) ? 0 : begrenze(anteil);
    return (startStunde % 12) * 30 + a * (endStunde - startStunde) * 30;
  }

  // Liegt ein Kreis vom Radius r um (cx, cy) samt Abstand vollständig im Umriss? istInnen(x, y) sagt, ob ein Punkt im Umriss liegt.
  function kreisInnen(istInnen, cx, cy, r, abstand) {
    if (!istInnen(cx, cy)) return false;
    var radius = r + abstand;
    for (var i = 0; i < 12; i++) {
      var winkel = (i * Math.PI) / 6;
      if (!istInnen(cx + Math.cos(winkel) * radius, cy + Math.sin(winkel) * radius)) return false;
    }
    return true;
  }

  return {
    kreisInnen: kreisInnen,
    fortschrittImBild: fortschrittImBild,
    fortschrittBisUnterkante: fortschrittBisUnterkante,
    schrittImRaster: schrittImRaster,
    versatzFuerSchritt: versatzFuerSchritt,
    aktiverSchritt: aktiverSchritt,
    sichtbareAnzahl: sichtbareAnzahl,
    anteilZwischen: anteilZwischen,
    zeigerWinkel: zeigerWinkel
  };
});
