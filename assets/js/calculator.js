/* KMS productivity calculator — single table vs. TAYU rotary table (/calculator).
   Machine 1 (single table): the machine stops while the part is unloaded and the insert loaded.
     cycle1 = moulding + handling + table travel
   Machine 2 (rotary / shuttle): handling runs in parallel with moulding; only the index remains.
     cycle2 = max(moulding, handling) + index
   The chart is one SVG (hard-coded colours) used on the page and, rasterised, in the downloadable
   report (canvas → PNG, or PDF via jsPDF loaded on demand from cdnjs). */
(function () {
  "use strict";
  var app = document.querySelector("[data-calc]");
  if (!app) return;
  var form = app.querySelector("[data-calc-form]");
  var out = {
    headline: app.querySelector("[data-calc-headline]"),
    chart: app.querySelector("[data-calc-chart]"),
    table: app.querySelector("[data-calc-table]"),
    status: app.querySelector("[data-calc-status]"),
    custom: app.querySelector("[data-calc-custom]")
  };
  var mainEl = document.querySelector("main[data-disclaimer]");
  var DISCLAIMER = mainEl ? mainEl.getAttribute("data-disclaimer") : "";

  var PRESETS = {
    connector: { mould: 35, handling: 15, cavities: 1 },
    "short": { mould: 18, handling: 16, cavities: 2 },
    "long": { mould: 60, handling: 20, cavities: 1 }
  };
  var C = { m1: "#4b5563", stop: "#c3c9d4", m2: "#1f5fd6", idx: "#f0a500", wait: "#9fb6e6", ink: "#13213f", muted: "#5b6474", line: "#dfe4ee" };

  function num(name) { var v = parseFloat(String(form.elements[name].value).replace(",", ".")); return isFinite(v) ? v : 0; }
  function selText(name) { var s = form.elements[name]; return s.options[s.selectedIndex].text; }
  function f(n, d) { return Number(n).toLocaleString("en-GB", { maximumFractionDigits: d == null ? 1 : d }); }
  function money(n) { return Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function read() {
    return {
      mould: Math.max(num("mould"), 0.1), handling: Math.max(num("handling"), 0), cavities: Math.max(Math.round(num("cavities")), 1),
      travel: Math.max(num("travel"), 0), index: Math.max(num("index"), 0),
      shiftH: Math.min(Math.max(num("shiftH"), 0.5), 24), shifts: Math.min(Math.max(Math.round(num("shifts")), 1), 3),
      days: Math.min(Math.max(Math.round(num("days")), 1), 366), value: Math.max(num("value"), 0),
      name1: selText("type1"), name2: selText("type2")
    };
  }

  function compute(v) {
    var c1 = v.mould + v.handling + v.travel;
    var c2 = Math.max(v.mould, v.handling) + v.index;
    var shiftS = v.shiftH * 3600;
    var cyc1 = Math.floor(shiftS / c1), cyc2 = Math.floor(shiftS / c2);
    var perYear = v.cavities * v.shifts * v.days;
    return {
      v: v, c1: c1, c2: c2, cyc1: cyc1, cyc2: cyc2,
      parts1: cyc1 * v.cavities, parts2: cyc2 * v.cavities,
      year1: cyc1 * perYear, year2: cyc2 * perYear,
      stop1: (c1 - v.mould) / c1, stop2: (c2 - v.mould) / c2,
      gain: cyc1 ? cyc2 / cyc1 - 1 : 0,
      extraYear: (cyc2 - cyc1) * perYear,
      extraValue: (cyc2 - cyc1) * perYear * v.value,
      loadLimited: v.handling > v.mould
    };
  }

  /* ── table-type icons (top view, type colour) — form headings and report ── */
  var TYPE_COLOR = { standard: "#2f6bff", slide: "#00a3b4", ds: "#16a35f", "2r": "#7b4dff", "3r": "#f09a00" };
  function typeIcon(key, px) {
    var c = TYPE_COLOR[key] || "#1f5fd6", w = px || 64, h = Math.round(w * 0.75), s = [];
    var mould = function (x, y, sz) { s.push('<rect x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '" rx="2" fill="' + c + '" fill-opacity=".22" stroke="' + c + '" stroke-width="2"/>'); };
    if (key === "standard") {
      s.push('<rect x="8" y="6" width="48" height="36" rx="4" fill="none" stroke="' + c + '" stroke-width="2"/>');
      [[14, 12], [50, 12], [14, 36], [50, 36]].forEach(function (p) { s.push('<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="' + c + '"/>'); });
      mould(23, 15, 18);
    } else if (key === "slide") {
      s.push('<rect x="12" y="3" width="40" height="22" rx="3" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="4 3"/>');
      s.push('<path d="M20 20v24M44 20v24" stroke="' + c + '" stroke-width="2"/>');
      mould(23, 26, 18);
      s.push('<path d="M32 8v10m-4-4 4 4 4-4" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
    } else if (key === "ds") {
      s.push('<rect x="2" y="17" width="60" height="16" rx="3" fill="none" stroke="' + c + '" stroke-width="2"/>');
      s.push('<rect x="21" y="6" width="22" height="36" rx="3" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="4 3"/>');
      mould(6, 16, 14); mould(25, 16, 14); s.push('<rect x="44" y="16" width="14" height="14" rx="2" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="3 2"/>');
    } else {
      var n = key === "3r" ? 3 : 2, R0 = 17, sz = n === 3 ? 11 : 13;
      s.push('<circle cx="32" cy="24" r="21" fill="' + c + '" fill-opacity=".07" stroke="' + c + '" stroke-width="2"/>');
      s.push('<circle cx="32" cy="24" r="2.6" fill="' + c + '"/>');
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = 32 + Math.cos(a) * (R0 - sz / 2 - 1), y = 24 + Math.sin(a) * (R0 - sz / 2 - 1);
        mould((x - sz / 2).toFixed(1), (y - sz / 2).toFixed(1), sz);
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 48" width="' + w + '" height="' + h + '">' + s.join("") + "</svg>";
  }
  /* animated top view of the selected table type (CSS keyframes in calculator.css) */
  function typeAnim(key) {
    var c = TYPE_COLOR[key] || "#1f5fd6", s = [];
    function mould(x, y, w, h) { s.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="' + c + '" fill-opacity=".2" stroke="' + c + '" stroke-width="2"/>'); }
    function melt(x, y, w, h) { s.push('<rect class="ta-melt" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="#ff6a2b"/>'); }
    function clampZone(x, y, w, h) {
      s.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="none" stroke="' + c + '" stroke-width="1.5" stroke-dasharray="4 3"/>');
      s.push('<text x="' + (x + w / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="8" letter-spacing=".8" fill="' + c + '">CLAMP</text>');
    }
    function op(y, label) { s.push('<text x="60" y="' + y + '" text-anchor="middle" font-size="8" letter-spacing=".8" fill="#5b6474">' + (label || "\u25BE OPERATOR") + "</text>"); }
    if (key === "standard") {
      s.push('<rect x="14" y="22" width="92" height="92" rx="8" fill="#fff" stroke="' + c + '" stroke-width="2"/>');
      [[25, 33], [95, 33], [25, 103], [95, 103]].forEach(function (q) { s.push('<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4" fill="' + c + '"/>'); });
      clampZone(36, 44, 48, 48); mould(40, 48, 40, 40); melt(40, 48, 40, 40);
      s.push('<rect class="ta-insert" x="52" y="60" width="16" height="16" rx="2" fill="' + c + '"/>');
      op(140);
    } else if (key === "slide") {
      clampZone(26, 14, 68, 50);
      s.push('<path d="M36 20V136M84 20V136" stroke="' + c + '" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>');
      s.push('<g class="ta-slide">');
      s.push('<rect x="28" y="18" width="64" height="42" rx="5" fill="#fff" stroke="' + c + '" stroke-width="2"/>');
      mould(42, 25, 36, 28); melt(42, 25, 36, 28);
      s.push('<rect class="ta-insert-s" x="52" y="31" width="16" height="16" rx="2" fill="' + c + '"/>');
      s.push("</g>");
      op(146);
    } else if (key === "ds") {
      clampZone(26, 56, 68, 40);
      s.push('<path d="M36 8V144M84 8V144" stroke="' + c + '" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>');
      s.push('<g class="ta-shuttle">');
      s.push('<rect x="30" y="54" width="60" height="88" rx="5" fill="#fff" stroke="' + c + '" stroke-width="2"/>');
      mould(42, 60, 36, 32); mould(42, 104, 36, 32);
      s.push("</g>");
      melt(42, 60, 36, 32);
      op(152, "\u25BE LOAD \u25B4");
    } else {
      var n = key === "3r" ? 3 : 2, cx = 60, cy = 80, R = 50, sz = n === 3 ? 26 : 30, rr = R - sz / 2 - 6;
      clampZone(cx - 22, cy - R - 2, 44, 44);
      s.push('<g class="ta-rot' + n + '">');
      s.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + c + '" fill-opacity=".07" stroke="' + c + '" stroke-width="2"/>');
      s.push('<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="' + c + '"/>');
      for (var i = 0; i < n; i++) {
        var ang = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        s.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + c + '" stroke-opacity=".35" stroke-width="1.5"/>');
        mould((x - sz / 2).toFixed(1), (y - sz / 2).toFixed(1), sz, sz);
        // station 1 carries a loaded insert, so the indexing is easy to follow
        if (i === 0) s.push('<rect x="' + (x - 6).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" width="12" height="12" rx="2" fill="#1f2a44"/>');
      }
      s.push("</g>");
      melt((cx - sz / 2).toFixed(1), (cy - rr - sz / 2).toFixed(1), sz, sz);
      op(148);
    }
    return '<svg class="ta ta-' + key + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 156" font-family="ui-monospace, Menlo, Consolas, monospace">' + s.join("") + "</svg>";
  }
  function paintIcons() {
    var t1 = form.elements.type1.value, t2 = form.elements.type2.value;
    [["1", t1, selText("type1")], ["2", t2, "TAYU " + selText("type2")]].forEach(function (d) {
      var el = app.querySelector('[data-type-ico="' + d[0] + '"]');
      if (!el || el.getAttribute("data-key") === d[1]) return;   // keep the running animation
      el.setAttribute("data-key", d[1]);
      el.innerHTML = typeAnim(d[1]) + '<span class="calc-type-cap">' + esc(d[2]) + "</span>";
      el.style.setProperty("--ico", TYPE_COLOR[d[1]]);
    });
  }

  /* ── chart (SVG string, viewBox 1000 × 480) ── */
  function chartSVG(r) {
    var v = r.v, W = 600, T = 3 * Math.max(r.c1, r.c2), s = [];
    function bar(y, parts, cycle) {
      var t = 0, h = 54;
      while (t < T - 0.001) {
        parts.forEach(function (p) {
          if (p.w <= 0 || t >= T) return;
          var w = Math.min(p.w, T - t), x = t / T * W, px = w / T * W;
          s.push('<rect x="' + x.toFixed(2) + '" y="' + y + '" width="' + Math.max(px, 0.5).toFixed(2) + '" height="' + h + '" fill="' + p.c + '"/>');
          if (px > 78 && p.l) s.push('<text x="' + (x + px / 2).toFixed(1) + '" y="' + (y + 33) + '" text-anchor="middle" font-size="16" font-weight="700" fill="' + (p.dark ? C.ink : "#fff") + '">' + p.l + "</text>");
          t += w;
        });
        if (cycle <= 0) break;
      }
    }
    var font = 'font-family="Barlow, Arial, Helvetica, sans-serif"';
    s.push('<rect width="1000" height="480" fill="#fff"/>');
    // machine 1 timeline
    s.push('<text x="0" y="24" font-size="20" font-weight="700" fill="' + C.ink + '">Machine 1 — ' + esc(v.name1) + "</text>");
    bar(38, [{ w: v.mould, c: C.m1, l: "Moulding" }, { w: v.handling + v.travel, c: C.stop, l: "Stop", dark: true }], r.c1);
    s.push('<text x="0" y="114" font-size="14" fill="' + C.muted + '">' + f(v.mould) + " s moulding + " + f(v.handling + v.travel) + " s stop = " + f(r.c1) + " s / cycle</text>");
    // machine 2 timeline
    s.push('<text x="0" y="164" font-size="20" font-weight="700" fill="' + C.ink + '">Machine 2 — TAYU ' + esc(v.name2) + "</text>");
    var p2 = [{ w: v.mould, c: C.m2, l: "Moulding" }];
    if (r.loadLimited) p2.push({ w: v.handling - v.mould, c: C.wait, l: "Wait", dark: true });
    p2.push({ w: v.index, c: C.idx, l: "Index", dark: true });
    bar(178, p2, r.c2);
    s.push('<text x="0" y="254" font-size="14" fill="' + C.muted + '">' + f(v.mould) + " s moulding" + (r.loadLimited ? " (+ " + f(v.handling - v.mould) + " s waiting for loading)" : "") + " + " + f(v.index) + " s index = " + f(r.c2) + " s / cycle</text>");
    // donuts
    function donut(cx, title, frac, main, stopC) {
      var R = 62, Cc = 2 * Math.PI * R;
      s.push('<text x="' + cx + '" y="26" text-anchor="middle" font-size="16" font-weight="700" fill="' + C.ink + '">' + title + "</text>");
      s.push('<circle cx="' + cx + '" cy="118" r="' + R + '" fill="none" stroke="' + main + '" stroke-width="28"/>');
      s.push('<circle cx="' + cx + '" cy="118" r="' + R + '" fill="none" stroke="' + stopC + '" stroke-width="28" stroke-dasharray="' + (frac * Cc).toFixed(2) + " " + Cc.toFixed(2) + '" transform="rotate(-90 ' + cx + ' 118)"/>');
      s.push('<text x="' + cx + '" y="124" text-anchor="middle" font-size="26" font-weight="700" fill="' + C.ink + '">' + f(frac * 100, 0) + " %</text>");
      s.push('<text x="' + cx + '" y="214" text-anchor="middle" font-size="13" fill="' + C.muted + '">machine stopped</text>');
    }
    donut(745, "Machine 1", r.stop1, C.m1, C.stop);
    donut(915, "Machine 2", r.stop2, C.m2, C.idx);
    // cycles per shift
    var maxC = Math.max(r.cyc1, r.cyc2, 1), BW = 520;
    s.push('<line x1="0" y1="286" x2="1000" y2="286" stroke="' + C.line + '"/>');
    s.push('<text x="0" y="318" font-size="18" font-weight="700" fill="' + C.ink + '">Cycles per ' + f(v.shiftH) + " h shift</text>");
    [[r.cyc1, C.m1, "Machine 1", 334], [r.cyc2, C.m2, "Machine 2", 384]].forEach(function (b) {
      var w = Math.max(b[0] / maxC * BW, 4);
      s.push('<text x="0" y="' + (b[3] + 27) + '" font-size="15" fill="' + C.muted + '">' + b[2] + "</text>");
      s.push('<rect x="110" y="' + b[3] + '" width="' + w.toFixed(1) + '" height="40" rx="4" fill="' + b[1] + '"/>');
      s.push('<text x="' + (110 + w - 12).toFixed(1) + '" y="' + (b[3] + 27) + '" text-anchor="end" font-size="17" font-weight="700" fill="#fff">' + f(b[0], 0) + " cycles</text>");
    });
    var up = r.gain >= 0;
    s.push('<rect x="700" y="334" width="300" height="90" rx="14" fill="' + (up ? C.m2 : C.m1) + '"/>');
    s.push('<text x="850" y="380" text-anchor="middle" font-size="38" font-weight="700" fill="#fff">' + (up ? "+" : "") + f(r.gain * 100, 0) + " %</text>");
    s.push('<text x="850" y="408" text-anchor="middle" font-size="14" fill="#fff">' + (up ? "more parts with Machine 2" : "fewer parts with Machine 2") + "</text>");
    // legend
    var lg = [[C.m1, "Moulding (M1)"], [C.stop, "Stop: unload & load"], [C.m2, "Moulding (M2)"], [C.idx, "Table index"]];
    if (r.loadLimited) lg.push([C.wait, "Waiting for loading"]);
    var lx = 0;
    lg.forEach(function (l) {
      s.push('<rect x="' + lx + '" y="452" width="14" height="14" rx="2" fill="' + l[0] + '"/>');
      s.push('<text x="' + (lx + 20) + '" y="464" font-size="14" fill="' + C.muted + '">' + esc(l[1]) + "</text>");
      lx += 30 + l[1].length * 7.4;
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 480" width="1000" height="480" ' + font + ' role="img" aria-label="Cycle time and output comparison">' + s.join("") + "</svg>";
  }

  function rows(r) {
    var v = r.v;
    var list = [
      ["Cycle time", f(r.c1) + " s", f(r.c2) + " s"],
      ["Machine stopped", f(r.stop1 * 100, 0) + " %", f(r.stop2 * 100, 0) + " %"],
      ["Cycles per shift", f(r.cyc1, 0), f(r.cyc2, 0)],
      ["Parts per shift", f(r.parts1, 0), f(r.parts2, 0)],
      ["Parts per year", f(r.year1, 0), f(r.year2, 0)]
    ];
    return list;
  }

  var last = null;
  function render() {
    var r = compute(read());
    last = r;
    var v = r.v, up = r.gain >= 0;
    out.headline.innerHTML =
      '<div class="calc-big ' + (up ? "" : "is-down") + '">' + (up ? "+" : "") + f(r.gain * 100, 0) + ' %</div>' +
      '<div class="calc-big-text"><b>' + (up ? "more parts" : "fewer parts") + " with the " + esc(v.name2) + "</b>" +
      "<span>" + f(r.cyc2, 0) + " instead of " + f(r.cyc1, 0) + " cycles per " + f(v.shiftH) + " h shift · +" + f(Math.max(r.extraYear, 0), 0) + " parts per year" +
      (v.value > 0 && r.extraValue > 0 ? " · ≈ € " + f(r.extraValue, 0) + " extra output value per year" : "") + "</span></div>";
    out.chart.innerHTML = chartSVG(r);
    var t = '<thead><tr><th scope="col"></th><th scope="col"><span class="calc-dot m1"></span>Machine 1<small>' + esc(v.name1) + '</small></th><th scope="col"><span class="calc-dot m2"></span>Machine 2<small>TAYU ' + esc(v.name2) + "</small></th></tr></thead><tbody>";
    rows(r).forEach(function (row) { t += "<tr><th scope=\"row\">" + row[0] + "</th><td>" + row[1] + "</td><td>" + row[2] + "</td></tr>"; });
    out.table.innerHTML = t + "</tbody>";
    paintIcons();
  }

  /* ── presets + inputs ── */
  var presetBtns = app.querySelectorAll("[data-preset]");
  function markPreset(key) {
    Array.prototype.forEach.call(presetBtns, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-preset") === key)); });
    out.custom.hidden = !!key;
  }
  Array.prototype.forEach.call(presetBtns, function (b) {
    b.addEventListener("click", function () {
      var p = PRESETS[b.getAttribute("data-preset")];
      Object.keys(p).forEach(function (k) { form.elements[k].value = p[k]; });
      markPreset(b.getAttribute("data-preset")); render();
    });
  });
  form.addEventListener("input", function (e) {
    if (["mould", "handling", "cavities"].indexOf(e.target.name) !== -1) markPreset("");
    render();
  });
  form.elements.type1.addEventListener("change", function () {
    var o = form.elements.type1.options[form.elements.type1.selectedIndex];
    form.elements.travel.value = o.getAttribute("data-travel"); render();
  });
  form.elements.type2.addEventListener("change", function () {
    var o = form.elements.type2.options[form.elements.type2.selectedIndex];
    form.elements.index.value = o.getAttribute("data-index"); render();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ── report (A4 @ 150 dpi) ── */
  function loadImg(src) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; });
  }
  function wrap(ctx, text, x, y, maxW, lh, measureOnly) {
    var words = text.split(" "), line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { if (!measureOnly) ctx.fillText(line, x, y); y += lh; line = w; } else line = test;
    });
    if (line) { if (!measureOnly) ctx.fillText(line, x, y); y += lh; }
    return y;
  }
  function buildReport(r) {
    var svg = chartSVG(r);
    return Promise.all([
      loadImg("/assets/img/kms-logo.png"), loadImg("/assets/img/tayu-logo-full.png"),
      loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)),
      loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(typeIcon(form.elements.type1.value, 128))),
      loadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(typeIcon(form.elements.type2.value, 128)))
    ]).then(function (imgs) {
      var W = 1240, H = 1754, M = 80, v = r.v;
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var x = cv.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
      x.textBaseline = "alphabetic";
      // header: logos
      x.drawImage(imgs[0], M, 52, 52 * 191 / 74, 52);
      var tw = 40 * 356 / 62; x.drawImage(imgs[1], W - M - tw, 58, tw, 40);
      x.fillStyle = "#5b6474"; x.font = "15px Arial"; x.fillText("KMS, d.o.o. — official TAYU distributor for Slovenia, Croatia and Bosnia and Herzegovina", M, 132);
      var g = x.createLinearGradient(M, 0, W - M, 0);
      ["#2f6bff", "#00a3b4", "#16a35f", "#7b4dff", "#f09a00"].forEach(function (c, i) { g.addColorStop(i / 4, c); });
      x.fillStyle = g; x.fillRect(M, 150, W - 2 * M, 5);
      // title
      x.fillStyle = "#13213f"; x.font = "bold 40px Arial"; x.fillText("Productivity comparison", M, 222);
      x.font = "22px Arial"; x.fillStyle = "#5b6474";
      x.fillText(v.name1 + "  vs.  TAYU " + v.name2, M, 258);
      x.textAlign = "right"; x.font = "16px Arial";
      x.fillText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W - M, 222);
      x.textAlign = "left";
      // headline box
      x.fillStyle = "#eaf1ff"; x.fillRect(M, 290, W - 2 * M, 120);
      x.fillStyle = r.gain >= 0 ? "#1f5fd6" : "#4b5563"; x.font = "bold 64px Arial";
      var big = (r.gain >= 0 ? "+" : "") + f(r.gain * 100, 0) + " %"; x.fillText(big, M + 28, 374);
      var bx = M + 60 + x.measureText(big).width;
      x.fillStyle = "#13213f"; x.font = "bold 24px Arial"; x.fillText((r.gain >= 0 ? "more" : "fewer") + " parts with the TAYU " + v.name2, bx, 340);
      x.font = "18px Arial"; x.fillStyle = "#3b4658";
      x.fillText(f(r.cyc2, 0) + " instead of " + f(r.cyc1, 0) + " cycles per " + f(v.shiftH) + " h shift  ·  +" + f(Math.max(r.extraYear, 0), 0) + " parts per year", bx, 372);
      if (v.value > 0 && r.extraValue > 0) x.fillText("≈ € " + f(r.extraValue, 0) + " extra output value per year (at € " + money(v.value) + " per part)", bx, 398);
      // chart
      x.drawImage(imgs[2], M, 440, W - 2 * M, (W - 2 * M) * 480 / 1000);
      var y = 440 + (W - 2 * M) * 480 / 1000 + 40;
      // results table
      x.font = "bold 20px Arial"; x.fillStyle = "#13213f"; x.fillText("Results", M, y); y += 14;
      var cx = [M, M + 420, M + 760], ix = 64, iy = 48;
      x.drawImage(imgs[3], cx[1], y + 4, ix, iy); x.drawImage(imgs[4], cx[2], y + 4, ix, iy);
      x.font = "bold 17px Arial"; x.fillStyle = "#13213f";
      x.fillText("Machine 1", cx[1] + ix + 12, y + 26); x.fillStyle = "#1f5fd6"; x.fillText("Machine 2", cx[2] + ix + 12, y + 26);
      x.font = "14px Arial"; x.fillStyle = "#5b6474";
      x.fillText(v.name1, cx[1] + ix + 12, y + 46); x.fillText("TAYU " + v.name2, cx[2] + ix + 12, y + 46);
      y += 64;
      rows(r).forEach(function (row, i) {
        if (i % 2 === 0) { x.fillStyle = "#f4f7fc"; x.fillRect(M, y, W - 2 * M, 34); }
        x.fillStyle = "#13213f"; x.font = "17px Arial"; x.fillText(row[0], cx[0] + 12, y + 23);
        x.font = "bold 17px Arial"; x.fillText(row[1], cx[1], y + 23); x.fillStyle = "#1f5fd6"; x.fillText(row[2], cx[2], y + 23);
        y += 34;
      });
      // inputs
      y += 30; x.font = "bold 20px Arial"; x.fillStyle = "#13213f"; x.fillText("Input values", M, y); y += 30;
      var inp = [["Moulding time", f(v.mould) + " s"], ["Unloading & loading time", f(v.handling) + " s"], ["Parts per cycle", f(v.cavities, 0)],
        ["Table travel (Machine 1)", f(v.travel) + " s"], ["Table index / change (Machine 2)", f(v.index) + " s"], ["Shift length", f(v.shiftH) + " h"],
        ["Shifts per day", f(v.shifts, 0)], ["Working days per year", f(v.days, 0)], ["Value per part", v.value > 0 ? "€ " + money(v.value) : "—"]];
      x.font = "16px Arial";
      inp.forEach(function (it, i) {
        var col = i % 3, rowY = y + Math.floor(i / 3) * 30, xx = M + col * 360;
        x.fillStyle = "#5b6474"; x.fillText(it[0] + ":", xx, rowY); x.fillStyle = "#13213f"; x.font = "bold 16px Arial";
        x.fillText(it[1], xx + 250, rowY); x.font = "16px Arial";
      });
      y += 100;
      x.fillStyle = "#5b6474"; x.font = "italic 14px Arial";
      y = wrap(x, "Machine 2 assumption: unloading and loading run in parallel with moulding at the loading station; if handling takes longer than moulding, handling sets the cycle.", M, y, W - 2 * M, 20);
      // disclaimer
      y += 16;
      var boxY = y; x.font = "13.5px Arial"; var textEnd = wrap(x, DISCLAIMER, M + 18, boxY + 54, W - 2 * M - 36, 19, true);
      x.fillStyle = "#fff7ed"; x.fillRect(M, boxY, W - 2 * M, textEnd - boxY + 8);
      x.fillStyle = "#c93c0e"; x.font = "bold 15px Arial"; x.fillText("Legal notice — information only", M + 18, boxY + 30);
      x.fillStyle = "#3b4658"; x.font = "13.5px Arial";
      wrap(x, DISCLAIMER, M + 18, boxY + 54, W - 2 * M - 36, 19);
      // footer
      x.fillStyle = "#13213f"; x.fillRect(0, H - 70, W, 70);
      x.fillStyle = "#fff"; x.font = "15px Arial";
      x.fillText("KMS, d.o.o. · Poslovna cona A 34 · 4208 Šenčur · Slovenia · +386 4 25 16 150 · info@kms.si · www.kms.si", M, H - 30);
      return cv;
    });
  }
  function fileName(ext) { return "KMS-TAYU-productivity-" + new Date().toISOString().slice(0, 10) + "." + ext; }
  function download(href, name) { var a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function say(m) { out.status.textContent = m; }

  var jspdfLoading = null;
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (!jspdfLoading) jspdfLoading = new Promise(function (res, rej) {
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      sc.onload = function () { window.jspdf ? res(window.jspdf) : rej(); }; sc.onerror = rej;
      document.head.appendChild(sc);
    });
    return jspdfLoading;
  }
  app.querySelector("[data-calc-pdf]").addEventListener("click", function () {
    say("Preparing PDF…");
    Promise.all([buildReport(last), loadJsPDF()]).then(function (res) {
      var pdf = new res[1].jsPDF({ unit: "mm", format: "a4" });
      pdf.addImage(res[0].toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
      pdf.setProperties({ title: "Productivity comparison — KMS / TAYU", author: "KMS, d.o.o." });
      pdf.save(fileName("pdf")); say("");
    }).catch(function (e) {
      if (window.console) console.error(e);
      // offline or blocked CDN: fall back to the image
      buildReport(last).then(function (cv) { download(cv.toDataURL("image/png"), fileName("png")); say("PDF not available — the report was saved as an image instead."); });
    });
  });

  render();
})();
