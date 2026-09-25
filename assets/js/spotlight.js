/* Homepage spotlight — opens the high-precision hybrid electro-hydraulic pop-up once per session, a moment
   after the page settles; the floating chip reopens it. Without <dialog> support nothing shows
   (the page stays fully usable). */
(function () {
  "use strict";
  var dlg = document.getElementById("spotlight");
  var chip = document.querySelector("[data-spot-open]");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var KEY = "kms_spot_seen";

  function seen() { try { return sessionStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem(KEY, "1"); } catch (e) {} }

  function showChip() { if (chip) chip.hidden = false; }
  function open() { if (!dlg.open) { dlg.showModal(); if (chip) chip.hidden = true; markSeen(); } }
  function close() { if (dlg.open) dlg.close(); showChip(); }

  // Esc closes the dialog natively; "close" covers that path too
  dlg.addEventListener("close", showChip);
  // click on the backdrop (outside the panel) closes
  dlg.addEventListener("click", function (e) {
    if (e.target === dlg) {
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
    }
  });
  Array.prototype.forEach.call(dlg.querySelectorAll("[data-spot-close]"), function (b) { b.addEventListener("click", close); });
  if (chip) chip.addEventListener("click", open);

  if (seen()) { if (chip) chip.hidden = false; }
  else setTimeout(open, 1400);
})();
