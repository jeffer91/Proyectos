"use strict";

(function exposeStatusBadge(global) {
  const STATUS_MAP = Object.freeze({
    pendiente: Object.freeze({ label: "Pendiente", className: "status-pendiente" }),
    en_proceso: Object.freeze({ label: "En proceso", className: "status-en-proceso" }),
    pausado: Object.freeze({ label: "Pausado", className: "status-pausado" }),
    completado: Object.freeze({ label: "Completado", className: "status-completado" })
  });

  function normalize(status) {
    const key = typeof status === "string" ? status.trim().toLowerCase() : "";
    return STATUS_MAP[key] ? key : "pendiente";
  }

  function create(status, options = {}) {
    const normalized = normalize(status);
    const configuration = STATUS_MAP[normalized];
    const element = document.createElement(options.tagName || "span");

    element.className = `status-badge ${configuration.className}`;
    element.dataset.status = normalized;
    element.textContent = options.label || configuration.label;
    element.setAttribute("aria-label", `Estado: ${element.textContent}`);

    return element;
  }

  function getLabel(status) {
    return STATUS_MAP[normalize(status)].label;
  }

  Object.defineProperty(global, "StatusBadge", {
    value: Object.freeze({ create, normalize, getLabel, statuses: STATUS_MAP }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
