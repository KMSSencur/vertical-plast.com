/* Vertical moulding table concepts — animated front/side + top views.
   Ported from KMS_vertical_molding_animation.html.
   Progressive enhancement: the cards, copy and step lists are static HTML; this script only
   draws the machines into [data-front] / [data-top] and highlights the running step.

   Every machine is drawn on the same 400-unit canvas with the clamp / injection axis at the
   same x in its front (or side) view and its top view, so both drawings in a card sit on one
   vertical line and all five machines render at the same scale. */
(function () {
  "use strict";
  var root = document.querySelector("[data-molding-sim]");
  if (!root) return;

  var NS = "http://www.w3.org/2000/svg";
  var W = 400;
  var BASE = [["close", 1.0], ["down", 0.8], ["inject", 1.2], ["cool", 1.6], ["up", 0.8], ["open", 0.9]];
  var TAILS = {
    fix: [["operator", 2.4]],
    out: [["out", 1.0], ["operator", 2.0], ["in", 1.0]],
    sld: [["slide", 1.4]],
    rot2: [["rotate", 1.6]],
    rot3: [["rotate", 1.3]]
  };
  /* colours come from the Industry tokens via --vma-* (assets/css/molding-sim.css) */
  var C = {
    paper: "var(--vma-paper)", line: "var(--vma-line)", muted: "var(--vma-muted)",
    frame: "var(--vma-frame)", frameS: "var(--vma-frame-s)", steel: "var(--vma-steel)",
    steel2: "var(--vma-steel-2)", screw: "var(--vma-screw)", table: "var(--vma-table)",
    tableS: "var(--vma-table-s)", melt: "var(--vma-melt)", meltD: "var(--vma-melt-d)",
    part: "var(--vma-part)", insert: "var(--vma-insert)"
  };
  var FILL = { empty: C.paper, insert: C.insert, part: C.part };
  var MONO = "var(--font-mono)";

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function set(e, attrs) { for (var k in attrs) e.setAttribute(k, attrs[k]); }
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function c01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function f2(n) { return n.toFixed(2); }

  function createMachine(card) {
    var kind = card.getAttribute("data-kind");
    var N = +card.getAttribute("data-n") || 1;
    var frontHost = card.querySelector("[data-front]");
    var topHost = card.querySelector("[data-top]");
    var steps = card.querySelectorAll("[data-steps] > li");
    var name = (card.querySelector("h3") || {}).textContent || "";
    var opRight = root.getAttribute("data-operator-right") || "operator ▸";
    var opBottom = root.getAttribute("data-operator-bottom") || "▾ operator";
    var tail = TAILS[kind === "rot" ? "rot" + N : kind];
    if (!frontHost || !topHost || !tail) return null;
    var ph = BASE.concat(tail);
    var T = ph.reduce(function (a, p) { return a + p[1]; }, 0);
    var side = kind === "out" || kind === "rot";
    var cx = side ? 150 : 200; /* the clamp axis — shared by both views */

    /* ----- front / side view ----- */
    var fs = el("svg", { viewBox: "0 -30 " + W + " 322", role: "img", "aria-label": name + " — " + (side ? "side" : "front") + " view" }, frontHost);
    el("rect", { x: side ? cx - 110 : cx - 120, y: 236, width: side ? 300 : 240, height: 52, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, fs);
    if (kind === "rot") {
      el("ellipse", { cx: cx + 72, cy: 232, rx: 124, ry: 9, fill: C.table, stroke: C.tableS, "stroke-width": 1 }, fs);
    } else if (kind === "out") {
      el("rect", { x: cx - 90, y: 230, width: 270, height: 6, fill: C.line }, fs); /* slide guide */
      el("rect", { x: cx + 110, y: 236, width: 70, height: 40, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, fs); /* support */
    } else {
      el("rect", { x: cx - 126, y: 230, width: 252, height: 8, fill: C.frameS }, fs);
    }
    if (kind === "sld") el("rect", { x: cx - 190, y: 226, width: 380, height: 5, fill: C.line }, fs);
    [cx - 78, cx + 78].forEach(function (x) { el("rect", { x: x - 5, y: 62, width: 10, height: 170, fill: C.line }, fs); });
    el("rect", { x: cx - 100, y: 48, width: 200, height: 18, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, fs);
    [cx - 52, cx + 52].forEach(function (x) {
      el("rect", { x: x - 11, y: 22, width: 22, height: 28, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, fs);
    });

    var table = el("g", {}, fs);
    var fSt = [];
    for (var i = 0; i < N; i++) {
      var g = el("g", {}, table);
      var lm = el("rect", { x: -48, y: 0, width: 96, height: 22, fill: C.paper, stroke: C.steel, "stroke-width": 1.1 }, g);
      var cav = [0, 1].map(function (k) {
        return el("rect", { x: -34 + k * 44, y: 4, width: 24, height: 9, fill: C.paper, stroke: C.steel, "stroke-width": 1 }, g);
      });
      fSt.push({ g: g, lm: lm, cav: cav });
    }
    if (kind === "out") {
      var sp = el("rect", { x: -70, y: 22, width: 140, height: 6, fill: C.steel2 });
      fSt[0].g.insertBefore(sp, fSt[0].g.firstChild);
    }
    var platen = el("g", {}, fs);
    el("rect", { x: cx - 90, y: 0, width: 180, height: 14, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, platen);
    el("rect", { x: cx - 48, y: 14, width: 96, height: 18, fill: C.paper, stroke: C.steel, "stroke-width": 1.1 }, platen);
    var rods = [cx - 52, cx + 52].map(function (x) { return el("rect", { x: x - 4, y: 50, width: 8, height: 10, fill: C.frameS }, fs); });
    el("line", { x1: cx, y1: 20, x2: cx, y2: 236, stroke: C.meltD, "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.6 }, fs);

    var inj = el("g", {}, fs);
    el("rect", { x: cx + 24, y: -60, width: 30, height: 34, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, inj);
    el("path", { d: "M" + (cx - 26) + ",-46 h32 l-8,16 h-16 z", fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, inj);
    el("rect", { x: cx - 11, y: -30, width: 22, height: 88, fill: C.paper, stroke: C.steel, "stroke-width": 1.1 }, inj);
    for (var h = 0; h < 4; h++) el("rect", { x: cx - 13, y: -18 + h * 18, width: 26, height: 7, fill: C.meltD, opacity: 0.2 }, inj);
    var screw = el("rect", { x: cx - 4, y: -26, width: 8, height: 40, fill: C.screw }, inj);
    var melt = el("rect", { x: cx - 7, y: 40, width: 14, height: 14, fill: C.melt }, inj);
    el("path", { d: "M" + (cx - 11) + ",58 h22 l-8,12 h-6 z", fill: C.paper, stroke: C.steel, "stroke-width": 1.1 }, inj);
    var jet = el("rect", { x: cx - 2, y: 70, width: 4, height: 0, fill: C.melt }, inj);
    if (side) {
      el("text", { x: cx + 150, y: 284, "text-anchor": "middle", "font-size": 18, "font-family": MONO, fill: C.muted }, fs).textContent = opRight;
    }

    /* ----- top view ----- */
    var cy = side ? 70 : 76;
    var R = N > 2 ? 52 : 36;
    var H = kind === "out" ? 196 : kind === "rot" ? (N > 2 ? cy + 52 + 92 + 10 : cy + 36 + 66 + 14) : 152;
    var ts = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": name + " — top view" }, topHost);
    el("rect", { x: cx - 130, y: 6, width: 260, height: side ? 118 : 140, fill: C.frame, stroke: C.frameS, "stroke-width": 1 }, ts);
    var ty = side ? [26, 106] : [26, 126];
    [[cx - 96, ty[0]], [cx + 96, ty[0]], [cx - 96, ty[1]], [cx + 96, ty[1]]].forEach(function (p) {
      el("circle", { cx: p[0], cy: p[1], r: 6, fill: C.paper, stroke: C.frameS, "stroke-width": 1 }, ts);
    });
    var tbl = el("g", {}, ts);
    var plate = null, spokes = null;
    if (kind === "fix") el("rect", { x: cx - 70, y: cy - 50, width: 140, height: 100, fill: C.table, stroke: C.tableS, "stroke-width": 1.1 }, tbl);
    if (kind === "out") {
      el("rect", { x: cx - 58, y: cy - 40, width: 6, height: 160, fill: C.line }, ts);
      el("rect", { x: cx + 52, y: cy - 40, width: 6, height: 160, fill: C.line }, ts);
      plate = el("g", {}, tbl);
      el("rect", { x: -50, y: -38, width: 100, height: 76, fill: C.table, stroke: C.tableS, "stroke-width": 1.1 }, plate);
    }
    if (kind === "sld") {
      el("rect", { x: cx - 190, y: cy - 52, width: 380, height: 6, fill: C.line }, ts);
      el("rect", { x: cx - 190, y: cy + 46, width: 380, height: 6, fill: C.line }, ts);
      plate = el("g", {}, tbl);
      el("rect", { x: -138, y: -48, width: 276, height: 96, fill: C.table, stroke: C.tableS, "stroke-width": 1.1 }, plate);
      el("line", { x1: 0, y1: -48, x2: 0, y2: 48, stroke: C.tableS, "stroke-width": 1, "stroke-dasharray": "3 3" }, plate);
    }
    if (kind === "rot") {
      var rr = N > 2 ? 92 : 66;
      plate = el("g", { transform: "translate(" + cx + "," + (cy + R) + ")" }, tbl);
      el("circle", { cx: 0, cy: 0, r: rr, fill: C.table, stroke: C.tableS, "stroke-width": 1.1 }, plate);
      spokes = el("g", {}, plate);
      for (var q = 0; q < N; q++) {
        var a = (q * 2 * Math.PI) / N + Math.PI / N;
        el("line", { x1: 0, y1: 0, x2: (rr - 4) * Math.sin(a), y2: -(rr - 4) * Math.cos(a), stroke: C.tableS, "stroke-width": 0.8, "stroke-dasharray": "3 3", opacity: 0.7 }, spokes);
      }
      el("circle", { cx: 0, cy: 0, r: 4, fill: C.tableS }, plate);
    }
    var tSt = [];
    for (var s = 0; s < N; s++) {
      var tg = el("g", {}, kind === "fix" ? tbl : plate);
      var fx = el("rect", { x: -34, y: -24, width: 68, height: 48, fill: C.paper, stroke: C.steel2, "stroke-width": 1.1 }, tg);
      var nests = [];
      for (var a2 = 0; a2 < 2; a2++)
        for (var b = 0; b < 2; b++)
          nests.push(el("rect", { x: -24 + a2 * 28, y: -17 + b * 20, width: 20, height: 14, fill: C.paper, stroke: C.steel2, "stroke-width": 1 }, tg));
      tSt.push({ g: tg, fx: fx, nests: nests });
    }
    el("rect", { x: -44, y: -34, width: 88, height: 68, fill: "none", stroke: C.meltD, "stroke-width": 1.6, "stroke-dasharray": "5 4", transform: "translate(" + cx + "," + cy + ")" }, ts);
    el("path", { d: "M" + (cx - 8) + "," + cy + " h16 M" + cx + "," + (cy - 8) + " v16", stroke: C.meltD, "stroke-width": 1.1 }, ts);
    if (side) {
      el("text", { x: cx + 100, y: H - 8, "font-size": 18, "font-family": MONO, fill: C.muted }, ts).textContent = opBottom;
    }

    /* ----- state ----- */
    var cyc = 0, clock = T * 0.3, lastPi = -1;
    var ORDER = ["close", "down", "inject", "cool", "up", "open"];

    function phaseAt(t) {
      var acc = 0;
      for (var i = 0; i < ph.length; i++) {
        if (t < acc + ph[i][1]) return { i: i, k: ph[i][0], u: (t - acc) / ph[i][1] };
        acc += ph[i][1];
      }
      return { i: ph.length - 1, k: ph[ph.length - 1][0], u: 1 };
    }

    function render(t) {
      var p = phaseAt(t), k = p.k, u = p.u, idx = ORDER.indexOf(k);
      var clamp = k === "close" ? ease(u) : idx > 0 && idx < 5 ? 1 : k === "open" ? 1 - ease(u) : 0;
      var injS = k === "down" ? ease(u) : k === "inject" || k === "cool" ? 1 : k === "up" ? 1 - ease(u) : 0;
      var scr = k === "inject" ? ease(u) : k === "cool" ? 1 - ease(c01((u - 0.35) / 0.65)) : 0;
      var fill = k === "inject" ? u : 0;
      var move = k === "slide" || k === "rotate" ? ease(u) : 0;
      var out = k === "out" ? ease(u) : k === "operator" ? 1 : k === "in" ? 1 - ease(u) : 0;
      var molded = idx >= 3 || idx < 0; /* after injection the active station holds a part */
      var active = cyc % N;

      var st = [];
      if (kind === "fix" || kind === "out") {
        st[0] = molded ? "part" : "insert";
        if (k === "operator") st[0] = u < 0.4 ? "part" : u < 0.6 ? "empty" : "insert";
        if (k === "in") st[0] = "insert";
      } else {
        var t1 = ph[0][1] + ph[1][1] + ph[2][1], t2 = t1 + ph[3][1] * 0.9;
        for (var i = 0; i < N; i++) {
          var pos = (((cyc - i) % N) + N) % N; /* 0 = under the unit, N-1 = operator station */
          if (pos === 0) st[i] = molded ? "part" : "insert";
          else if (pos === N - 1)
            st[i] = t < ph[0][1] + 0.4 ? "part" : t < t1 ? "empty" : t < t2 ? ((t - t1) / (t2 - t1) < 0.5 ? "empty" : "insert") : "insert";
          else st[i] = "part";
        }
      }
      /* shuttle: 0 = station 0 under the unit, 1 = station 1 under the unit */
      var shuttle = active === 0 ? (k === "slide" ? move : 0) : k === "slide" ? 1 - move : 1;

      /* front */
      var py = 118 + 54 * clamp;
      set(platen, { transform: "translate(0," + f2(py) + ")" });
      rods.forEach(function (r) { set(r, { height: f2(py - 50) }); });
      var iy = 40 + (py - 70 - 40) * injS;
      set(inj, { transform: "translate(0," + f2(iy) + ")" });
      set(screw, { y: f2(-26 + 32 * scr) });
      set(melt, { height: f2(14 * (1 - scr * 0.8)), y: f2(40 + 14 * scr * 0.8) });
      set(jet, { height: k === "inject" ? f2(Math.max(0, py + 32 - (iy + 70))) : 0 });

      var rotA = [];
      fSt.forEach(function (q, i) {
        var x = cx, op = 1, sc = 1;
        if (kind === "out") x = cx + 150 * out;
        if (kind === "sld") x = cx + (i === 0 ? 0 : 130) - 130 * shuttle;
        if (kind === "rot") {
          var th = ((cyc - i + move) * 2 * Math.PI) / N;
          rotA[i] = th;
          x = cx + 72 - 72 * Math.cos(th);
          sc = 0.62 + 0.38 * Math.abs(Math.cos(th));
          op = 0.55 + 0.45 * (1 - Math.abs(Math.sin(th)));
        }
        set(q.g, { transform: "translate(" + f2(x) + ",204) scale(" + sc.toFixed(3) + ",1)", opacity: op.toFixed(2) });
        var act = i === active;
        q.cav.forEach(function (c) {
          if (act && k === "inject") set(c, { fill: C.melt, "fill-opacity": (0.35 + 0.65 * fill).toFixed(2) });
          else set(c, { fill: FILL[st[i]] || C.paper, "fill-opacity": 1 });
        });
        set(q.lm, { stroke: act && clamp > 0.02 ? C.meltD : C.steel });
      });
      if (kind === "rot") {
        /* paint back-to-front so the station nearest the viewer sits on top */
        fSt.map(function (_, i) { return i; })
          .sort(function (a, b) { return Math.cos(rotA[a]) - Math.cos(rotA[b]); })
          .forEach(function (i) { table.appendChild(fSt[i].g); });
      }

      /* top */
      var moving = k === "slide" || k === "rotate" || k === "out" || k === "operator" || k === "in";
      tSt.forEach(function (q, i) {
        var tr = "translate(0,0)";
        if (kind === "fix") tr = "translate(" + cx + "," + cy + ")";
        if (kind === "sld") tr = "translate(" + (i === 0 ? -60 : 60) + ",0)";
        if (kind === "rot") {
          var th = ((cyc - i + move) * 2 * Math.PI) / N;
          tr = "translate(" + f2(R * Math.sin(th)) + "," + f2(-R * Math.cos(th)) + ") rotate(" + f2((th * 180) / Math.PI) + ")";
        }
        set(q.g, { transform: tr });
        var act = i === active;
        q.nests.forEach(function (c) { set(c, { fill: act && k === "inject" ? C.melt : FILL[st[i]] || C.paper }); });
        set(q.fx, { stroke: act && !moving ? C.meltD : C.steel2 });
      });
      if (kind === "sld") set(plate, { transform: "translate(" + f2(cx + 60 - 120 * shuttle) + "," + cy + ")" });
      if (kind === "out") set(plate, { transform: "translate(" + cx + "," + f2(cy + 96 * out) + ")" });
      if (kind === "rot") set(spokes, { transform: "rotate(" + f2(((cyc + move) * 360) / N) + ")" });

      if (p.i !== lastPi) {
        lastPi = p.i;
        for (var j = 0; j < steps.length; j++) steps[j].classList.toggle("on", j === p.i);
      }
    }

    return {
      step: function (dt) {
        clock += dt;
        while (clock >= T) { clock -= T; cyc++; }
        render(clock);
      }
    };
  }

  var machines = [];
  Array.prototype.forEach.call(root.querySelectorAll("[data-kind]"), function (card) {
    var m = createMachine(card);
    if (m) machines.push(m);
  });
  machines.forEach(function (m) { m.step(0); });
  root.classList.add("is-live");

  /* ----- loop: only runs while the section is on screen ----- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var playing = !reduce, speed = 1, raf = 0, last = null;
  function tick(ts) {
    var dt = last == null ? 0 : Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (playing) machines.forEach(function (m) { m.step(dt * speed); });
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf) { last = null; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? start() : stop();
    }).observe(root);
  } else start();

  /* ----- controls ----- */
  var bp = root.querySelector("[data-sim-play]");
  function syncPlay() {
    if (!bp) return;
    bp.setAttribute("aria-pressed", playing ? "false" : "true");
    bp.querySelector("[data-label]").textContent = playing ? bp.getAttribute("data-pause") : bp.getAttribute("data-play");
    bp.querySelector("[data-icon-pause]").style.display = playing ? "" : "none";
    bp.querySelector("[data-icon-play]").style.display = playing ? "none" : "";
  }
  if (bp) bp.addEventListener("click", function () { playing = !playing; last = null; syncPlay(); });
  syncPlay();
  var speedBtns = root.querySelectorAll("[data-sim-speed]");
  Array.prototype.forEach.call(speedBtns, function (btn) {
    btn.addEventListener("click", function () {
      speed = +btn.getAttribute("data-sim-speed");
      Array.prototype.forEach.call(speedBtns, function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
    });
  });
})();
