/* KMS technical file — the visitor's machine + optional-equipment selection.
   Stored in localStorage on this device only (a per-visitor convenience; nothing leaves the
   browser until the visitor sends the specification). Loaded on every page:
   - header link: item count + "select a machine" reminder dot
   - homepage teaser: short summary
   - /options: the configurator itself ([data-options-app]) */
(function () {
  "use strict";
  var KEY = "kms_techfile";
  var MAIL = "info@kms.si";

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); return s && typeof s === "object" ? s : {}; }
    catch (e) { return {}; }
  }
  function save(s) { s.updated = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function opts(s) { return Array.isArray(s.options) ? s.options : []; }
  function needsMachine(s) { return opts(s).length > 0 && !s.model; }

  /* ── header link + homepage teaser (all pages) ── */
  function paintGlobal(s) {
    var n = opts(s).length + (s.model ? 1 : 0);
    Array.prototype.forEach.call(document.querySelectorAll("[data-techfile-count]"), function (el) {
      el.textContent = n ? String(n) : ""; el.hidden = !n;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-techfile]"), function (a) {
      a.classList.toggle("needs-machine", needsMachine(s));
      a.title = needsMachine(s) ? "Your technical file — select a machine" : "Your technical file";
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-techfile-summary]"), function (el) {
      if (!n) { el.hidden = true; return; }
      el.hidden = false;
      var o = opts(s).length;
      var ot = o + (o === 1 ? " option" : " options");
      el.textContent = "Your file: " + (s.model ? s.model + " · " + ot : ot + (o ? " — select a machine" : ""));
      el.classList.toggle("is-warn", needsMachine(s));
    });
  }

  /* ── /options configurator ── */
  function initApp(s) {
    var app = document.querySelector("[data-options-app]");
    if (!app) return;
    var data = [];
    try { data = JSON.parse(document.getElementById("machine-data").textContent); } catch (e) {}
    var byId = {}; data.forEach(function (m) { byId[m.id] = m; });

    var seriesBtns = app.querySelectorAll("[data-series]");
    var sizeSel = app.querySelector("[data-opt-size]");
    var boxes = app.querySelectorAll('input[name="option"]');
    var fileMachine = app.querySelector("[data-file-machine]");
    var fileList = app.querySelector("[data-file-options]");
    var reminder = app.querySelector("[data-reminder]");
    var countEl = app.querySelector("[data-opt-count]");
    var form = app.querySelector("[data-opt-form]");
    var status = app.querySelector("[data-opt-status]");
    var choiceWraps = app.querySelectorAll("[data-choice-for]");

    // options that need a quantity (e.g. hot-runner zones): s.qty = { optionId: "8" }
    function qtyOf(id) { return (s.qty && s.qty[id]) || ""; }
    function needsQty() {
      var missing = null;
      Array.prototype.forEach.call(choiceWraps, function (w) {
        var id = w.getAttribute("data-choice-for");
        if (!missing && opts(s).indexOf(id) !== -1 && !qtyOf(id)) missing = w;
      });
      return missing;
    }
    function labelFor(b) {
      var q = qtyOf(b.value);
      return b.getAttribute("data-label") + (q ? " — " + q + " ×" : "");
    }

    // ?series=ty-s preselects a series (from the series pages)
    var q = new URLSearchParams(location.search).get("series");
    if (q && byId[q] && s.series !== q) { s.series = q; s.model = ""; s.clamp = null; save(s); }

    function fillSizes() {
      var m = byId[s.series];
      sizeSel.innerHTML = "";
      var first = document.createElement("option");
      first.value = ""; first.textContent = m ? "Choose the " + m.name + " size" : "Choose a series first";
      sizeSel.appendChild(first);
      sizeSel.disabled = !m;
      if (!m) return;
      m.sizes.forEach(function (z) {
        var o = document.createElement("option");
        o.value = z.model; o.textContent = z.model + " · " + z.t + " t clamping force";
        if (z.model === s.model) o.selected = true;
        sizeSel.appendChild(o);
      });
    }

    function paint() {
      Array.prototype.forEach.call(seriesBtns, function (b) { b.setAttribute("aria-checked", String(b.getAttribute("data-series") === s.series)); });
      var chosen = opts(s);
      Array.prototype.forEach.call(boxes, function (b) { b.checked = chosen.indexOf(b.value) !== -1; });
      countEl.textContent = chosen.length + " of " + boxes.length + " selected";

      var m = byId[s.series];
      fileMachine.innerHTML = "";
      var h = document.createElement("div");
      if (s.model && m) {
        h.className = "opt-machine is-set";
        h.innerHTML = '<span class="kicker"></span><b></b><small></small>';
        h.querySelector(".kicker").textContent = "Machine";
        h.querySelector("b").textContent = s.model;
        h.querySelector("small").textContent = m.name + " · " + m.type + " · " + s.clamp + " t";
      } else {
        h.className = "opt-machine";
        h.innerHTML = '<span class="kicker">Machine</span><b>Not selected yet</b><small></small>';
        h.querySelector("small").textContent = m ? m.name + " series chosen — pick a size" : "Step 1 — select the machine";
      }
      fileMachine.appendChild(h);

      fileList.innerHTML = "";
      if (!chosen.length) {
        var li0 = document.createElement("li"); li0.className = "opt-empty"; li0.textContent = "No options selected yet.";
        fileList.appendChild(li0);
      }
      Array.prototype.forEach.call(choiceWraps, function (w) {
        var id = w.getAttribute("data-choice-for"), q = qtyOf(id), on = chosen.indexOf(id) !== -1;
        Array.prototype.forEach.call(w.querySelectorAll("[data-qty]"), function (c) { c.setAttribute("aria-checked", String(on && c.getAttribute("data-qty") === q)); });
        w.querySelector("[data-qty-hint]").hidden = !(on && !q);
        w.classList.toggle("is-on", on);
      });
      Array.prototype.forEach.call(boxes, function (b) {
        if (chosen.indexOf(b.value) === -1) return;
        var li = document.createElement("li");
        var t = document.createElement("span"); t.textContent = labelFor(b);
        if (qtyOf(b.value) === "" && app.querySelector('[data-choice-for="' + b.value + '"]')) { t.textContent += " — how many?"; li.className = "is-warn"; }
        var x = document.createElement("button"); x.type = "button"; x.className = "opt-remove"; x.setAttribute("aria-label", "Remove " + b.getAttribute("data-label")); x.textContent = "×";
        x.addEventListener("click", function () { s.options = opts(s).filter(function (v) { return v !== b.value; }); if (s.qty) delete s.qty[b.value]; save(s); paint(); });
        li.appendChild(t); li.appendChild(x); fileList.appendChild(li);
      });
      reminder.hidden = !needsMachine(s);
      paintGlobal(s);
    }

    Array.prototype.forEach.call(seriesBtns, function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-series");
        if (s.series !== id) { s.series = id; s.model = ""; s.clamp = null; }
        save(s); fillSizes(); paint(); sizeSel.focus();
      });
    });
    sizeSel.addEventListener("change", function () {
      var m = byId[s.series], z = null;
      if (m) m.sizes.forEach(function (x) { if (x.model === sizeSel.value) z = x; });
      s.model = z ? z.model : ""; s.clamp = z ? z.t : null;
      save(s); paint();
    });
    Array.prototype.forEach.call(boxes, function (b) {
      b.addEventListener("change", function () {
        var list = opts(s).filter(function (v) { return v !== b.value; });
        if (b.checked) list.push(b.value);
        else if (s.qty) delete s.qty[b.value];
        s.options = list; save(s); paint();
      });
    });
    // picking a quantity also ticks its option
    Array.prototype.forEach.call(choiceWraps, function (w) {
      var id = w.getAttribute("data-choice-for");
      Array.prototype.forEach.call(w.querySelectorAll("[data-qty]"), function (c) {
        c.addEventListener("click", function () {
          s.qty = s.qty || {}; s.qty[id] = c.getAttribute("data-qty");
          if (opts(s).indexOf(id) === -1) s.options = opts(s).concat(id);
          save(s); paint();
        });
      });
    });

    // contact fields persist too, so the file is complete when the visitor comes back
    var contact = s.contact || {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (contact[el.name]) el.value = contact[el.name];
      el.addEventListener("input", function () { s.contact = s.contact || {}; s.contact[el.name] = el.value; save(s); });
    });

    function specText(c) {
      var m = byId[s.series];
      var lines = ["# Technical file — quotation request", "",
        "## Machine", s.model && m ? "- " + s.model + " (" + m.name + " · " + m.type + ", " + s.clamp + " t clamping force)" : "- not selected", "",
        "## Optional equipment"];
      var chosen = opts(s);
      Array.prototype.forEach.call(boxes, function (b) { var on = chosen.indexOf(b.value) !== -1; lines.push("- [" + (on ? "x" : " ") + "] " + (on ? labelFor(b) : b.getAttribute("data-label"))); });
      lines.push("", "## Contact");
      [["Name", c.name], ["Company", c.company], ["Email", c.email], ["Phone", c.phone], ["Country", c.country]].forEach(function (p) { if (p[1]) lines.push("- " + p[0] + ": " + p[1]); });
      if (c.message) lines.push("", "## Part / application", c.message);
      lines.push("", "Created " + new Date().toLocaleString() + " on " + location.host);
      return lines.join("\n");
    }
    function contactNow() { var c = {}; Array.prototype.forEach.call(form.elements, function (el) { if (el.name) c[el.name] = el.value.trim(); }); return c; }
    function say(msg, kind) { status.textContent = msg; status.className = "opt-status" + (kind ? " is-" + kind : ""); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!s.model) {
        reminder.hidden = false; reminder.classList.remove("pulse"); void reminder.offsetWidth; reminder.classList.add("pulse");
        say("Select a machine first — it is the heart of your technical file.", "warn");
        document.getElementById("step-machine").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      var missing = needsQty();
      if (missing) {
        say("Choose how many hot-runner controllers you need.", "warn");
        missing.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      var c = contactNow();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email || "")) { say("Please enter your email so we can send the quotation.", "warn"); form.elements.email.focus(); return; }
      var spec = specText(c);
      var subject = "Quotation request — " + s.model + (c.company ? " — " + c.company : "");
      var endpoint = form.getAttribute("data-endpoint");
      if (endpoint) {
        say("Sending…");
        fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ subject: subject, email: c.email, name: c.name, company: c.company, phone: c.phone, country: c.country, message: spec }) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); s.sent = new Date().toISOString(); save(s); say("Thank you — your specification is with KMS. We will send you a quotation.", "ok"); })
          .catch(function () { say("Sending failed — please email " + MAIL + " or use “Download technical file”.", "warn"); });
      } else {
        s.sent = new Date().toISOString(); save(s);
        location.href = "mailto:" + MAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(spec);
        say("Your email program has opened with the full specification — press Send and KMS will prepare your quotation.", "ok");
      }
    });

    app.querySelector("[data-opt-download]").addEventListener("click", function () {
      var blob = new Blob([specText(contactNow())], { type: "text/markdown;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "KMS-technical-file" + (s.model ? "-" + s.model : "") + ".md";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    });
    app.querySelector("[data-opt-clear]").addEventListener("click", function () {
      if (!window.confirm("Clear the machine and all options from your technical file?")) return;
      s = { contact: s.contact }; save(s); fillSizes(); paint(); say("Technical file cleared.");
    });

    fillSizes(); paint();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var s = load();
    paintGlobal(s);
    initApp(s);
    // keep other open tabs in sync
    window.addEventListener("storage", function (e) { if (e.key === KEY) paintGlobal(load()); });
  });
})();
