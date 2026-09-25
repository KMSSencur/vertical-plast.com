/* KMS site behaviour — range highlight + filters, tabs, mobile nav.
   Progressive enhancement: every page works without JS; this only enhances. */
(function () {
  "use strict";
  var STORE = "kms_finder";
  var DEFAULT = { insert: "metal", weight: "30to120", volume: "series" };

  function readState() {
    // query string wins (shareable links), then localStorage, then default
    var q = new URLSearchParams(location.search);
    var s = { insert: q.get("insert"), weight: q.get("weight"), volume: q.get("volume") };
    if (!s.insert || !s.weight || !s.volume) {
      try {
        var saved = JSON.parse(localStorage.getItem(STORE) || "null");
        if (saved) s = { insert: s.insert || saved.insert, weight: s.weight || saved.weight, volume: s.volume || saved.volume };
      } catch (e) {}
    }
    return {
      insert: s.insert || DEFAULT.insert,
      weight: s.weight || DEFAULT.weight,
      volume: s.volume || DEFAULT.volume
    };
  }

  /* ── range table: highlight the suggested model + filter chips ── */
  function initRange() {
    var table = document.querySelector("[data-range]");
    if (!table) return;

    // highlight the model suggested by answers passed in the URL (?insert=&weight=&volume=)
    // or saved from an earlier visit — never from the defaults alone
    var q = new URLSearchParams(location.search), hasAnswers = q.get("insert") || q.get("weight") || q.get("volume");
    try { hasAnswers = hasAnswers || localStorage.getItem(STORE); } catch (e) {}
    if (window.KMS_MATCH && hasAnswers) {
      var m = window.KMS_MATCH(readState());
      if (m) {
        var row = table.querySelector('tr[data-slug="' + m.slug + '"]');
        if (row) {
          row.classList.add("suggested");
          var cell = row.querySelector("[data-model-cell]");
          if (cell && !cell.querySelector(".sug-tag")) {
            var tag = document.createElement("span");
            tag.className = "sug-tag"; tag.textContent = " SUGGESTED";
            cell.appendChild(tag);
          }
        }
        var banner = document.querySelector("[data-range-note]");
        if (banner) banner.textContent = "Your answers suggest the " + m.model + " (" + m.tons + " t) — highlighted below.";
      }
    }

    // filter chips (toggle; a row matches if, for each active dimension,
    // its list contains at least one selected value)
    var bar = document.querySelector("[data-range-filter]");
    if (!bar) return;
    function applyFilters() {
      var active = {};
      bar.querySelectorAll('.chip[aria-pressed="true"]').forEach(function (c) {
        var q = c.getAttribute("data-q"), v = c.getAttribute("data-v");
        (active[q] = active[q] || []).push(v);
      });
      var shown = 0;
      table.querySelectorAll("tbody tr").forEach(function (r) {
        var ok = true;
        Object.keys(active).forEach(function (q) {
          var have = (r.getAttribute("data-" + q) || "").split(" ");
          if (!active[q].some(function (v) { return have.indexOf(v) !== -1; })) ok = false;
        });
        r.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      var note = document.querySelector("[data-range-note]");
      if (note && Object.keys(active).length) note.textContent = shown + " of 12 models match your filter.";
    }
    bar.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (chip) {
        chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
        applyFilters(); return;
      }
      if (e.target.closest("[data-range-reset]")) {
        bar.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
        applyFilters();
      }
    });
  }

  /* ── detail-page tabs ── */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (group) {
      var tabs = group.querySelectorAll('[role="tab"]');
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          tabs.forEach(function (t) {
            var sel = t === tab;
            t.setAttribute("aria-selected", String(sel));
            var panel = document.getElementById(t.getAttribute("aria-controls"));
            if (panel) panel.hidden = !sel;
          });
        });
      });
    });
  }

  /* ── mobile nav ── */
  function initNav() {
    var btn = document.querySelector("[data-nav-toggle]");
    var nav = document.querySelector(".mainnav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initRange(); initTabs(); initNav();
  });
})();
