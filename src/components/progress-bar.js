"use strict";

(function exposeProgressBar(global) {
  function normalizeValue(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round(number)));
  }

  function create(value, options = {}) {
    const progress = normalizeValue(value);
    const root = document.createElement("div");
    root.className = "progress";
    root.dataset.complete = String(progress === 100);
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    root.setAttribute("aria-valuenow", String(progress));
    root.setAttribute("aria-label", options.ariaLabel || `Avance del proyecto: ${progress} %`);

    if (options.showLabel !== false) {
      const meta = document.createElement("div");
      meta.className = "progress-meta";

      const label = document.createElement("span");
      label.textContent = options.label || "Avance";

      const percentage = document.createElement("strong");
      percentage.textContent = `${progress} %`;

      meta.append(label, percentage);
      root.append(meta);
    }

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.setProperty("--progress-value", `${progress}%`);

    track.append(fill);
    root.append(track);

    return root;
  }

  Object.defineProperty(global, "ProgressBar", {
    value: Object.freeze({ create, normalizeValue }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
