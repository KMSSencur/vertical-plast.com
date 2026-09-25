/* KMS moulding cycle simulation — five vertical table concepts, animated in SVG.
   Progressive enhancement: the cards' text is in the HTML; this script draws the
   front/side and top views, fills the step lists and runs the shared cycle clock.
   Every drawing uses the same viewBox and the same machine axis, so the five
   machines stand in one line at the same scale. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var W = 440, CX = 220;            // shared drawing width and machine axis
  var TOP_H = 224;                  // shared top-view height (fits the 3-station table)
  var CY = 76;                      // shared injection axis in the top view

  var BASE = [["Clamp closes", 1.0, "close"], ["Injection unit moves down", 0.8, "down"], ["Injection", 1.2, "inject"],
              ["Holding pressure & cooling", 1.6, "cool"], ["Injection unit moves up", 0.8, "up"], ["Clamp opens", 0.9, "open"]];
  /* kind: fix · out (single slide towards the operator) · sld (double slide left/right) · rot (rotary, n stations) */
  var TYPES = {
    fix:  { kind: "fix", n: 1, name: "Standard table",       tail: [["Operator unloads & loads insert", 2.4, "operator"]] },
    out:  { kind: "out", n: 1, name: "Single slide table",   tail: [["Table slides out", 1.0, "out"], ["Operator unloads & loads insert", 2.0, "operator"], ["Table slides in", 1.0, "in"]] },
    sld:  { kind: "sld", n: 2, name: "Sliding table",        tail: [["Table slides to next mould", 1.4, "slide"]] },
    rot2: { kind: "rot", n: 2, name: "Rotary table",         tail: [["Table rotates 180°", 1.6, "rotate"]] },
    rot3: { kind: "rot", n: 3, name: "Multi-station rotary", tail: [["Table rotates 120°", 1.3, "rotate"]] }
  };
  var SIDE = { out: 1, rot: 1 };
  var COL = { empty: "var(--sim-paper)", insert: "var(--sim-insert)", part: "var(--sim-part)" };

  function el(t, a, p) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function ease(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
  function c01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function vlab(host, text, withPhase) {
    var d = document.createElement("div"); d.className = "sim-vlab";
    var a = document.createElement("span"); a.textContent = text; d.appendChild(a);
    var b = null;
    if (withPhase) { b = document.createElement("span"); b.setAttribute("data-sim-phase", ""); d.appendChild(b); }
    host.appendChild(d); return b;
  }

  /* ── front / side view ── */
  function buildFront(m, host) {
    var cx = CX, side = SIDE[m.kind];
    m.phaseEl = vlab(host, side ? "Side view · operator right" : "Front view", true);
    var s = el("svg", { viewBox: "0 -30 " + W + " 322", role: "img", "aria-label": m.name + ", " + (side ? "side" : "front") + " view of the moulding cycle" }, host);
    var G = { cx: cx };
    var st = "var(--sim-steel)", fr = "var(--sim-frame)", fs = "var(--sim-frame-s)";
    var bw = side ? 300 : 240, bx0 = side ? cx - 110 : cx - 120;
    el("rect", { x: bx0, y: 236, width: bw, height: 52, fill: fr, stroke: fs, "stroke-width": 1 }, s);
    if (m.kind === "rot") el("ellipse", { cx: cx + 72, cy: 232, rx: 124, ry: 9, fill: "var(--sim-table)", stroke: "var(--sim-line)", "stroke-width": 1 }, s);
    else if (m.kind === "out") {                                   // slide guide + outboard support
      el("rect", { x: cx - 90, y: 230, width: 270, height: 6, fill: "var(--sim-rail)" }, s);
      el("rect", { x: cx + 110, y: 236, width: 70, height: 40, fill: fr, stroke: fs, "stroke-width": 1 }, s);
    }
    else el("rect", { x: cx - 126, y: 230, width: 252, height: 8, fill: fs }, s);
    if (m.kind === "sld") el("rect", { x: cx - 190, y: 226, width: 380, height: 5, fill: "var(--sim-rail)" }, s);
    [cx - 78, cx + 78].forEach(function (x) { el("rect", { x: x - 5, y: 62, width: 10, height: 170, fill: "var(--sim-rail)" }, s); });
    el("rect", { x: cx - 100, y: 48, width: 200, height: 18, fill: fr, stroke: fs, "stroke-width": 1 }, s);
    [cx - 52, cx + 52].forEach(function (x) { el("rect", { x: x - 11, y: 22, width: 22, height: 28, fill: fr, stroke: fs, "stroke-width": 1 }, s); });
    G.table = el("g", {}, s); G.stations = [];
    if (m.kind === "out") G.slidePlate = el("rect", { x: -70, y: 22, width: 140, height: 6, fill: "var(--sim-steel-2)" }, G.table);
    for (var i = 0; i < m.n; i++) {
      var g = el("g", {}, G.table);
      var lm = el("rect", { x: -48, y: 0, width: 96, height: 22, fill: "var(--sim-paper)", stroke: st, "stroke-width": 1.2 }, g);
      var cav = [];
      for (var k = 0; k < 2; k++) cav.push(el("rect", { x: -34 + k * 44, y: 4, width: 24, height: 9, fill: "var(--sim-paper)", stroke: st, "stroke-width": 1 }, g));
      G.stations.push({ g: g, lm: lm, cav: cav });
    }
    if (m.kind === "out") G.stations[0].g.insertBefore(G.slidePlate, G.stations[0].g.firstChild);
    G.platen = el("g", {}, s);
    el("rect", { x: cx - 90, y: 0, width: 180, height: 14, fill: fr, stroke: fs, "stroke-width": 1 }, G.platen);
    el("rect", { x: cx - 48, y: 14, width: 96, height: 18, fill: "var(--sim-paper)", stroke: st, "stroke-width": 1.2 }, G.platen);
    G.rods = [cx - 52, cx + 52].map(function (x) { return el("rect", { x: x - 4, y: 50, width: 8, height: 10, fill: fs }, s); });
    el("line", { x1: cx, y1: 20, x2: cx, y2: 236, stroke: "var(--sim-axis)", "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.55 }, s);
    G.inj = el("g", {}, s);
    el("rect", { x: cx + 24, y: -60, width: 30, height: 34, fill: fr, stroke: fs, "stroke-width": 1 }, G.inj);
    el("path", { d: "M" + (cx - 26) + ",-46 h32 l-8,16 h-16 z", fill: fr, stroke: fs, "stroke-width": 1 }, G.inj);
    el("rect", { x: cx - 11, y: -30, width: 22, height: 88, fill: "var(--sim-paper)", stroke: st, "stroke-width": 1.2 }, G.inj);
    for (var h = 0; h < 4; h++) el("rect", { x: cx - 13, y: -18 + h * 18, width: 26, height: 7, fill: "var(--sim-steel-2)", opacity: 0.35 }, G.inj);
    G.screw = el("rect", { x: cx - 4, y: -26, width: 8, height: 40, fill: st }, G.inj);
    G.melt = el("rect", { x: cx - 7, y: 40, width: 14, height: 14, fill: "var(--sim-melt)" }, G.inj);
    el("path", { d: "M" + (cx - 11) + ",58 h22 l-8,12 h-6 z", fill: "var(--sim-paper)", stroke: st, "stroke-width": 1.2 }, G.inj);
    G.jet = el("rect", { x: cx - 2, y: 70, width: 4, height: 0, fill: "var(--sim-melt)" }, G.inj);
    m.F = G;
  }

  /* ── top view ── */
  function buildTop(m, host) {
    vlab(host, "Top view · operator bottom");
    var cx = CX, cy = CY;
    var s = el("svg", { viewBox: "0 0 " + W + " " + TOP_H, role: "img", "aria-label": m.name + ", top view of the table" }, host);
    var G = { cx: cx, cy: cy }, fr = "var(--sim-frame)", fs = "var(--sim-frame-s)";
    el("rect", { x: cx - 130, y: 6, width: 260, height: 140, fill: fr, stroke: fs, "stroke-width": 1 }, s);
    var ty = [26, 126];
    [[cx - 96, ty[0]], [cx + 96, ty[0]], [cx - 96, ty[1]], [cx + 96, ty[1]]].forEach(function (p) {
      el("circle", { cx: p[0], cy: p[1], r: 6, fill: "var(--sim-paper)", stroke: fs, "stroke-width": 1 }, s);
    });
    G.tbl = el("g", {}, s); G.st = [];
    if (m.kind === "fix") el("rect", { x: cx - 70, y: cy - 50, width: 140, height: 100, fill: "var(--sim-table)", stroke: "var(--sim-line)", "stroke-width": 1.2 }, G.tbl);
    if (m.kind === "out") {
      el("rect", { x: cx - 58, y: cy - 40, width: 6, height: 160, fill: "var(--sim-rail)" }, s);
      el("rect", { x: cx + 52, y: cy - 40, width: 6, height: 160, fill: "var(--sim-rail)" }, s);
      G.plate = el("g", {}, G.tbl);
      el("rect", { x: -50, y: -38, width: 100, height: 76, fill: "var(--sim-table)", stroke: "var(--sim-line)", "stroke-width": 1.2 }, G.plate);
    }
    if (m.kind === "sld") {
      el("rect", { x: cx - 190, y: cy - 52, width: 380, height: 6, fill: "var(--sim-rail)" }, s);
      el("rect", { x: cx - 190, y: cy + 46, width: 380, height: 6, fill: "var(--sim-rail)" }, s);
      G.plate = el("g", {}, G.tbl);
      el("rect", { x: -150, y: -48, width: 300, height: 96, fill: "var(--sim-table)", stroke: "var(--sim-line)", "stroke-width": 1.2 }, G.plate);
      el("line", { x1: 0, y1: -48, x2: 0, y2: 48, stroke: "var(--sim-line)", "stroke-width": 1, "stroke-dasharray": "3 3" }, G.plate);
    }
    if (m.kind === "rot") {
      G.R = (m.n > 2) ? 52 : 36; G.rc = cy + G.R; var rr = (m.n > 2) ? 92 : 66;
      G.plate = el("g", { transform: "translate(" + cx + "," + G.rc + ")" }, G.tbl);
      el("circle", { cx: 0, cy: 0, r: rr, fill: "var(--sim-table)", stroke: "var(--sim-line)", "stroke-width": 1.2 }, G.plate);
      G.spokes = el("g", {}, G.plate);
      for (var q = 0; q < m.n; q++) {
        var a = q * 2 * Math.PI / m.n + Math.PI / m.n;
        el("line", { x1: 0, y1: 0, x2: (rr - 4) * Math.sin(a), y2: -(rr - 4) * Math.cos(a), stroke: "var(--sim-line)", "stroke-width": 0.8, "stroke-dasharray": "3 3", opacity: 0.6 }, G.spokes);
      }
      el("circle", { cx: 0, cy: 0, r: 4, fill: "var(--sim-line)" }, G.plate);
    }
    for (var i = 0; i < m.n; i++) {
      var g = el("g", {}, (m.kind === "fix") ? G.tbl : G.plate);
      var fx = el("rect", { x: -34, y: -24, width: 68, height: 48, fill: "var(--sim-paper)", stroke: "var(--sim-steel-2)", "stroke-width": 1.2 }, g);
      var nn = [];
      for (var a2 = 0; a2 < 2; a2++) for (var b = 0; b < 2; b++) nn.push(el("rect", { x: -24 + a2 * 28, y: -17 + b * 20, width: 20, height: 14, fill: "var(--sim-paper)", stroke: "var(--sim-steel-2)", "stroke-width": 1 }, g));
      G.st.push({ g: g, fx: fx, n: nn });
    }
    el("rect", { x: -44, y: -34, width: 88, height: 68, fill: "none", stroke: "var(--sim-axis)", "stroke-width": 1.6, "stroke-dasharray": "5 4", transform: "translate(" + cx + "," + cy + ")" }, s);
    el("path", { d: "M" + (cx - 8) + "," + cy + " h16 M" + cx + "," + (cy - 8) + " v16", stroke: "var(--sim-axis)", "stroke-width": 1.2 }, s);
    m.T2 = G;
  }

  /* ── cycle state ── */
  function phaseAt(m, t) {
    var a = 0;
    for (var i = 0; i < m.ph.length; i++) { var d = m.ph[i][1]; if (t < a + d) return { i: i, k: m.ph[i][2], u: (t - a) / d }; a += d; }
    var L = m.ph.length - 1; return { i: L, k: m.ph[L][2], u: 1 };
  }
  function stateOf(m, t) {
    var p = phaseAt(m, t), k = p.k, u = p.u, S = { p: p };
    var order = ["close", "down", "inject", "cool", "up", "open"], idx = order.indexOf(k);
    S.clamp = (k === "close") ? ease(u) : (idx > 0 && idx < 5) ? 1 : (k === "open") ? 1 - ease(u) : 0;
    S.inj = (k === "down") ? ease(u) : (k === "inject" || k === "cool") ? 1 : (k === "up") ? 1 - ease(u) : 0;
    S.screw = (k === "inject") ? ease(u) : (k === "cool") ? 1 - ease(c01((u - 0.35) / 0.65)) : 0;
    S.fill = (k === "inject") ? u : 0; S.jet = (k === "inject") ? 1 : 0;
    S.move = (k === "slide" || k === "rotate") ? ease(u) : 0;
    S.out = (k === "out") ? ease(u) : (k === "operator") ? 1 : (k === "in") ? 1 - ease(u) : 0;
    var molded = (idx >= 3) || idx < 0;                 // after injection the active station holds a part
    var st = [], N = m.n, active = m.cyc % N;
    if (m.kind === "fix" || m.kind === "out") {
      st[0] = molded ? "part" : "insert";
      if (k === "operator") st[0] = (u < 0.4) ? "part" : (u < 0.6) ? "empty" : "insert";
      if (k === "in") st[0] = "insert";
    } else {
      var t1 = m.ph[0][1] + m.ph[1][1] + m.ph[2][1], t2 = t1 + m.ph[3][1] * 0.9;
      for (var i = 0; i < N; i++) {
        var pos = ((m.cyc - i) % N + N) % N;           // 0 = under the unit, N-1 = operator station
        if (pos === 0) st[i] = molded ? "part" : "insert";
        else if (pos === N - 1) st[i] = (t < m.ph[0][1] + 0.4) ? "part" : (t < t1) ? "empty" : (t < t2) ? ((t - t1) / (t2 - t1) < 0.5 ? "empty" : "insert") : "insert";
        else st[i] = "part";
      }
    }
    S.st = st; S.active = active; return S;
  }

  /* ── render one frame ── */
  function render(m, t) {
    var S = stateOf(m, t), F = m.F, T = m.T2, cx = F.cx, N = m.n;
    var py = 118 + 54 * S.clamp; F.platen.setAttribute("transform", "translate(0," + py.toFixed(2) + ")");
    F.rods.forEach(function (r) { r.setAttribute("height", (py - 50).toFixed(2)); });
    var iy = 40 + (py - 70 - 40) * S.inj; F.inj.setAttribute("transform", "translate(0," + iy.toFixed(2) + ")");
    F.screw.setAttribute("y", (-26 + 32 * S.screw).toFixed(2));
    F.melt.setAttribute("height", (14 * (1 - S.screw * 0.8)).toFixed(2)); F.melt.setAttribute("y", (40 + 14 * S.screw * 0.8).toFixed(2));
    F.jet.setAttribute("height", S.jet ? Math.max(0, py + 32 - (iy + 70)).toFixed(2) : 0);
    var rotA = [];
    F.stations.forEach(function (q, i) {
      var x = cx, op = 1, sc = 1;
      if (m.kind === "out") x = cx + 150 * S.out;
      if (m.kind === "sld") { var pos = (S.active === 0) ? (S.p.k === "slide" ? S.move : 0) : (S.p.k === "slide" ? 1 - S.move : 1); x = cx + (i === 0 ? 0 : 130) - 130 * pos; }
      if (m.kind === "rot") {
        var th = ((m.cyc - i) + S.move) * 2 * Math.PI / N; rotA[i] = th;
        x = cx + 72 - 72 * Math.cos(th); var dz = Math.sin(th); sc = 0.62 + 0.38 * Math.abs(Math.cos(th)); op = 0.55 + 0.45 * (1 - Math.abs(dz));
      }
      q.g.setAttribute("transform", "translate(" + x.toFixed(2) + ",204) scale(" + sc.toFixed(3) + ",1)"); q.g.setAttribute("opacity", op.toFixed(2));
      var s0 = S.st[i], act = (i === S.active);
      q.cav.forEach(function (c) {
        if (act && S.p.k === "inject") { c.setAttribute("fill", "var(--sim-melt)"); c.setAttribute("fill-opacity", (0.35 + 0.65 * S.fill).toFixed(2)); }
        else { c.setAttribute("fill", COL[s0] || COL.empty); c.setAttribute("fill-opacity", 1); }
      });
      q.lm.setAttribute("stroke", (act && S.clamp > 0.02) ? "var(--sim-melt-d)" : "var(--sim-steel)");
    });
    if (m.kind === "rot") {                              // draw the rear station first; reorder only on change
      var ord = F.stations.map(function (q, i) { return i; })
        .sort(function (a, b) { return Math.cos(rotA[a]) - Math.cos(rotA[b]); });
      if (ord.join() !== F.order) { ord.forEach(function (i) { F.table.appendChild(F.stations[i].g); }); F.order = ord.join(); }
    }
    var cy = T.cy;
    T.st.forEach(function (q, i) {
      var tr = "translate(0,0)";
      if (m.kind === "fix") tr = "translate(" + T.cx + "," + cy + ")";
      if (m.kind === "sld") tr = "translate(" + (i === 0 ? -60 : 60) + ",0)";
      if (m.kind === "rot") { var th = ((m.cyc - i) + S.move) * 2 * Math.PI / N; tr = "translate(" + (T.R * Math.sin(th)).toFixed(2) + "," + (-T.R * Math.cos(th)).toFixed(2) + ") rotate(" + (th * 180 / Math.PI).toFixed(2) + ")"; }
      q.g.setAttribute("transform", tr);
      var s0 = S.st[i], act = (i === S.active), k = S.p.k;
      q.n.forEach(function (c) { c.setAttribute("fill", (act && k === "inject") ? "var(--sim-melt)" : (COL[s0] || COL.empty)); });
      q.fx.setAttribute("stroke", (act && k !== "slide" && k !== "rotate" && k !== "out" && k !== "operator" && k !== "in") ? "var(--sim-melt-d)" : "var(--sim-steel-2)");
    });
    if (m.kind === "sld") {
      var pos2 = (S.active === 0) ? (S.p.k === "slide" ? S.move : 0) : (S.p.k === "slide" ? 1 - S.move : 1);
      T.plate.setAttribute("transform", "translate(" + (T.cx + 60 - 120 * pos2).toFixed(2) + "," + cy + ")");
    }
    if (m.kind === "out") T.plate.setAttribute("transform", "translate(" + T.cx + "," + (cy + 96 * S.out).toFixed(2) + ")");
    if (m.kind === "rot") T.spokes.setAttribute("transform", "rotate(" + ((m.cyc + S.move) * 360 / N).toFixed(2) + ")");
    if (m.lastPhase !== S.p.i) {                          // step list + phase label only change per phase
      for (var j = 0; j < m.steps.length; j++) m.steps[j].className = (j === S.p.i) ? "on" : "";
      m.phaseEl.textContent = m.ph[S.p.i][0].toLowerCase();
      m.lastPhase = S.p.i;
    }
  }

  /* ── setup + loop ── */
  function init() {
    var root = document.querySelector("[data-sim]");
    if (!root || !document.createElementNS) return;
    var machines = [];
    root.querySelectorAll("[data-sim-machine]").forEach(function (card) {
      var def = TYPES[card.getAttribute("data-sim-machine")];
      if (!def) return;
      var m = { kind: def.kind, n: def.n, name: def.name, ph: BASE.concat(def.tail), cyc: 0, lastPhase: -1, vis: true, card: card };
      m.T = m.ph.reduce(function (a, p) { return a + p[1]; }, 0);
      buildFront(m, card.querySelector("[data-sim-front]"));
      buildTop(m, card.querySelector("[data-sim-top]"));
      // the HTML carries a static copy of the steps; rebuild from the phase table so they always match
      var ol = card.querySelector("[data-sim-steps]");        // optional: homepage cards have none
      if (ol) {
        ol.textContent = "";
        m.ph.forEach(function (p) {
          var li = document.createElement("li"); li.textContent = p[0]; ol.appendChild(li);
        });
      }
      m.steps = ol ? ol.children : [];
      machines.push(m);
    });
    if (!machines.length) return;

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var playing = !reduce, speed = 1, last = null, rafId = null;
    var clock = machines.map(function (m) { return m.T * 0.3; });
    machines.forEach(function (m, i) { render(m, clock[i]); });

    function anyVisible() { return machines.some(function (m) { return m.vis; }); }
    function tick(ts) {
      if (last == null) last = ts;
      var dt = Math.min(0.1, (ts - last) / 1000) * speed; last = ts;
      machines.forEach(function (m, i) {
        clock[i] += dt;
        if (clock[i] >= m.T) { clock[i] -= m.T; m.cyc++; }
        if (m.vis) render(m, clock[i]);                   // off-screen cards keep time but skip drawing
      });
      rafId = (playing && anyVisible()) ? requestAnimationFrame(tick) : null;
    }
    function start() { if (!rafId && playing && anyVisible()) { last = null; rafId = requestAnimationFrame(tick); } }

    // only animate the cards that are on screen (the row scrolls sideways on narrow screens)
    if ("IntersectionObserver" in window) {
      machines.forEach(function (m) { m.vis = false; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          machines.forEach(function (m) { if (m.card === e.target) m.vis = e.isIntersecting; });
        });
        start();
      });
      machines.forEach(function (m) { io.observe(m.card); });
    } else start();

    var ctrl = root.querySelector("[data-sim-ctrl]"), legend = root.querySelector("[data-sim-legend]");
    if (ctrl) ctrl.hidden = false;
    if (legend) legend.hidden = false;
    var play = root.querySelector("[data-sim-play]");
    function syncPlay() {
      if (!play) return;
      play.querySelector("[data-sim-play-icon]").textContent = playing ? "❚❚" : "▶";
      play.querySelector("[data-sim-play-label]").textContent = playing ? "Pause" : "Play";
    }
    if (play) play.addEventListener("click", function () { playing = !playing; syncPlay(); start(); });
    syncPlay();
    var speeds = root.querySelectorAll("[data-sim-speed]");
    speeds.forEach(function (b) {
      b.addEventListener("click", function () {
        speed = +b.getAttribute("data-sim-speed");
        speeds.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
