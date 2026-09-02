/* =========================================================
   NEXORAX GLOBAL OS — Nexus Dashboard
   Dynamic module grid + local state bootstrap
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Module registry
     Folder-name suffixes exactly as they exist in the workspace
     (mixed word / numeral convention — do not "normalize" these,
     they must match the on-disk folder names verbatim).
     --------------------------------------------------------- */
  const MODULE_FOLDERS = [
    "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen", "Twenty", "Twenty-One", "Twenty-Two",
    "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35",
    "36", "37", "38", "39", "40", "41"
  ];

  const GRID_ID = "nexus-grid";
  const STATE_KEY = "nexorax_global_state";

  /* ---------------------------------------------------------
     2. Local state bootstrap
     Creates the base object once; never overwrites existing state.
     --------------------------------------------------------- */
  function initGlobalState() {
    let existing = null;
    try {
      existing = JSON.parse(localStorage.getItem(STATE_KEY));
    } catch (err) {
      existing = null;
    }

    if (existing && typeof existing === "object") {
      return existing;
    }

    const base = {
      version: 1,
      createdAt: new Date().toISOString(),
      points: 0,
      modules: {}, // per-module sync data lands here, keyed by folder name
    };

    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(base));
    } catch (err) {
      // localStorage unavailable (private mode, quota, etc.) — degrade silently,
      // the dashboard grid still renders and routes without persisted state.
      console.warn("nexorax_global_state could not be persisted:", err);
    }

    return base;
  }

  /* ---------------------------------------------------------
     3. Card markup
     --------------------------------------------------------- */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function buildCard(folderName, position) {
    const card = document.createElement("a");
    card.className = "nx-card";
    card.href = `../MHA-Brahmastra-${folderName}/index.html`;
    card.setAttribute("data-module", folderName);
    card.setAttribute("aria-label", `Open MHA-MODULE-${pad(position)}`);

    const index = document.createElement("span");
    index.className = "nx-card__index";
    index.textContent = `MOD ${pad(position)} / 41`;

    const title = document.createElement("h2");
    title.className = "nx-card__title";
    title.textContent = `MHA-MODULE-${pad(position)}`;

    const sub = document.createElement("p");
    sub.className = "nx-card__sub";
    sub.textContent = `Brahmastra-${folderName}`;

    const arrow = document.createElement("span");
    arrow.className = "nx-card__arrow";
    arrow.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M17 7H8M17 7V16"/></svg>';

    card.appendChild(index);
    card.appendChild(title);
    card.appendChild(sub);
    card.appendChild(arrow);

    return card;
  }

  /* ---------------------------------------------------------
     4. Render
     --------------------------------------------------------- */
  function renderGrid() {
    const grid = document.getElementById(GRID_ID);
    if (!grid) {
      console.error(`#${GRID_ID} not found in DOM — cannot render modules.`);
      return;
    }

    const fragment = document.createDocumentFragment();

    MODULE_FOLDERS.forEach((folderName, i) => {
      fragment.appendChild(buildCard(folderName, i + 1));
    });

    grid.innerHTML = "";
    grid.appendChild(fragment);

    const countEl = document.getElementById("module-count");
    if (countEl) {
      countEl.textContent = `${MODULE_FOLDERS.length} MODULES`;
    }
  }

  /* ---------------------------------------------------------
     5. Boot
     --------------------------------------------------------- */
  function boot() {
    initGlobalState();
    renderGrid();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
