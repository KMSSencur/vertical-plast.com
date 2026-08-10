/* KMS machine catalogue — single source of truth for the configurator + range highlight.
   Detailed technical figures (shot weight, screw Ø, energy) live in each model's PDF spec
   sheet; only values sourced from the product data are asserted here. */
(function () {
  var M = [
    { slug: "tc-450-j",          model: "TC-450.J",           tons: 45,  table: "Non-column, 3-side open", tableKey: "standard", colors: 1,
      application: "Medium insert & overmoulding, horizontal shot", insert: "Manual",
      img: "machine-01.jpg", rank: 6, insertFit: ["metal","cable"], weightFit: ["lt30","30to120"], volumeFit: ["low","series"] },

    { slug: "ty-850-3r-sf-j",    model: "TY-850.3R.SF.J",     tons: 85,  table: "Rotary table, 3-station, servo", tableKey: "rotary", colors: 1,
      application: "Servo insert moulding, wide platen", insert: "Robot / manual",
      img: "machine-02.jpg", rank: 5, insertFit: ["metal","none"], weightFit: ["lt30","30to120"], volumeFit: ["series","high"] },

    { slug: "tyw-1000-2r-sf-j",  model: "TYW-1000.2R.SF.J",   tons: 100, table: "Rotary table, 2-station, servo", tableKey: "rotary", colors: 1,
      application: "Optical lens moulding", insert: "Robot / manual",
      img: "machine-03.jpg", rank: 8, insertFit: ["none"], weightFit: ["lt30","30to120"], volumeFit: ["series","high"] },

    { slug: "tyu-1000-2r-2m-sf-j", model: "TYU-1000.2R.2M.SF.J", tons: 100, table: "Rotary table, 2-station, twin-mould", tableKey: "rotary", colors: 1,
      application: "Spectacle / eyewear frame moulding", insert: "Robot / manual",
      img: "machine-04.jpg", rank: 9, insertFit: ["none"], weightFit: ["lt30","30to120"], volumeFit: ["series","high"] },

    { slug: "tyw-1200-j",        model: "TYW-1200.J",         tons: 120, table: "Standard vertical clamp", tableKey: "standard", colors: 1,
      application: "General insert & metal overmoulding", insert: "Manual / robot",
      img: "machine-05.jpg", rank: 1, insertFit: ["metal","cable","none"], weightFit: ["30to120","120plus"], volumeFit: ["low","series"] },

    { slug: "tyu-1600s-j",       model: "TYU-1600S.J",        tons: 120, table: "Single sliding table", tableKey: "slide", colors: 1,
      application: "Insert moulding with large-part loading", insert: "Manual (slide)",
      img: "machine-06.jpg", rank: 3, insertFit: ["metal","cable"], weightFit: ["30to120","120plus"], volumeFit: ["low","series"] },

    { slug: "et-350-2r-sf-j",    model: "ET-350.2R.SF.J",     tons: 160, table: "Rotary table, 2-station, servo-hybrid", tableKey: "rotary", colors: 1,
      application: "Servo-hybrid precision insert moulding", insert: "6-axis robot",
      img: "machine-07.jpg", rank: 2, insertFit: ["metal","cable"], weightFit: ["30to120","120plus"], volumeFit: ["series","high"] },

    { slug: "ty-1600-2c-zt-j",   model: "TY-1600.2C.ZT.J",    tons: 160, table: "Turntable, 2-station", tableKey: "turntable", colors: 2,
      application: "Two-component / two-shot moulding", insert: "Robot",
      img: "machine-08.jpg", rank: 4, insertFit: ["none","metal"], weightFit: ["30to120","120plus"], volumeFit: ["series","high"] },

    { slug: "ty-2000-2r-2c-j",   model: "TY-2000.2R.2C.J",    tons: 160, table: "Rotary table, 2-station, two-colour", tableKey: "rotary", colors: 2,
      application: "Eyewear two-colour moulding", insert: "Robot",
      img: "turntable-450.jpg", rank: 10, insertFit: ["none"], weightFit: ["30to120","120plus"], volumeFit: ["series","high"] },

    { slug: "ty-2500-3r-3c-sf-j", model: "TY-2500.3R.3C.SF.J", tons: 250, table: "Rotary table, 3-station, servo", tableKey: "rotary", colors: 3,
      application: "Multi-colour (3-colour rotary) moulding", insert: "Robot + vision",
      img: "double-slide-650.jpg", rank: 11, insertFit: ["none"], weightFit: ["120plus"], volumeFit: ["series","high"] },

    { slug: "tym-3000-2c-zt-j",  model: "TYM-3000.2C.ZT.J",   tons: 300, table: "Turntable, 2-station", tableKey: "turntable", colors: 2,
      application: "Large-tonnage two-shot moulding", insert: "Robot + vision",
      img: "machine-01.jpg", rank: 12, insertFit: ["none","metal"], weightFit: ["120plus"], volumeFit: ["series","high"] },

    { slug: "tyu-4500-2r-sf-j",  model: "TYU-4500.2R.SF.J",   tons: 450, table: "Turntable / rotary, 2-station, servo", tableKey: "turntable", colors: 1,
      application: "Large turntable insert & metal overmoulding", insert: "Robot + vision",
      img: "machine-07.jpg", rank: 7, insertFit: ["metal","cable"], weightFit: ["120plus"], volumeFit: ["series","high"] }
  ];

  function match(finder) {
    var best = null, bestScore = -1;
    for (var i = 0; i < M.length; i++) {
      var m = M[i], s = 0;
      if (m.insertFit.indexOf(finder.insert) !== -1) s += 2;
      if (m.weightFit.indexOf(finder.weight) !== -1) s += 2;
      if (m.volumeFit.indexOf(finder.volume) !== -1) s += 1;
      // prefer lower rank on ties (rank is 1..12; convert to small bonus)
      var score = s * 100 - m.rank;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  window.KMS_MACHINES = M;
  window.KMS_MATCH = match;
})();
