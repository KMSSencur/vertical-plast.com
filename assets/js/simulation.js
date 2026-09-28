/* /create-simulation — opens the vertical IMM simulation (EN / SL) full screen in a <dialog>.
   Without JS (or without <dialog> support) the cards are plain links to /simulation/en and /simulation/sl.
   The address shows #en / #sl while it is open, so /create-simulation#sl opens the Slovenian simulation
   straight away. The overlay never adds browser-history entries (hash via replaceState, frame pages via
   location.replace): history traversal would restore the iframe's old page and put it out of step with
   the overlay. Close / Esc close it; Back leaves the page like any other dialog. */
(function () {
  "use strict";
  var dlg = document.querySelector("[data-sim-overlay]");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var root = document.documentElement;
  var frame = dlg.querySelector("[data-sim-frame]");
  var newTab = dlg.querySelector("[data-sim-newtab]");
  var langBtns = dlg.querySelectorAll("[data-sim-lang]");
  var URLS = { en: "/simulation/en", sl: "/simulation/sl" };
  var TITLES = { en: "Vertical IMM simulation", sl: "Simulacija vertikalne brizgalne celice" };
  var current = null;

  function hashLang() { var m = /^#(en|sl)$/.exec(location.hash); return m ? m[1] : null; }
  function setHash(lang) {
    if (hashLang() === lang) return;
    history.replaceState(history.state, "", location.pathname + location.search + (lang ? "#" + lang : ""));
  }

  function setLang(lang) {
    if (current === lang) return;
    // each language keeps its own saved cell (per-language storage inside the app)
    if (current && frame.contentWindow) frame.contentWindow.location.replace(URLS[lang]);
    else frame.src = URLS[lang];
    current = lang;
    frame.title = TITLES[lang];
    newTab.href = URLS[lang];
    Array.prototype.forEach.call(langBtns, function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-sim-lang") === lang));
    });
  }

  function open(lang) {
    setLang(lang);
    if (!dlg.open) { dlg.showModal(); root.classList.add("sim-open"); }
    setHash(lang);
    frame.focus();
  }
  function close() { if (dlg.open) dlg.close(); }
  dlg.addEventListener("close", function () { root.classList.remove("sim-open"); setHash(null); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });   // Esc

  // the start cards (plain left click only — ctrl / middle click still opens the simulation in a new tab)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-sim]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(a.getAttribute("data-sim"));
  });
  Array.prototype.forEach.call(langBtns, function (b) {
    b.addEventListener("click", function () { open(b.getAttribute("data-sim-lang")); });
  });
  dlg.querySelector("[data-sim-close]").addEventListener("click", close);

  // direct link (/create-simulation#en or #sl) or a typed hash
  window.addEventListener("hashchange", function () { var l = hashLang(); if (l) open(l); });
  var start = hashLang();
  if (start) open(start);
})();
