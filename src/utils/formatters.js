"use strict";

(function exposeFormatters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    Object.defineProperty(root, "AppFormatters", {
      value: api,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
})(typeof window !== "undefined" ? window : null, function createFormattersApi() {
  const STATUS_LABELS = Object.freeze({
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    pausado: "Pausado",
    completado: "Completado"
  });

  function normalizeWhitespace(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }

  function normalizeSearchText(value) {
    return normalizeWhitespace(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  }

  function formatFileSize(bytes, locale = "es-EC") {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value < 1024) return `${Math.round(value)} B`;

    const units = ["KB", "MB", "GB", "TB"];
    let amount = value / 1024;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
      amount /= 1024;
      unitIndex += 1;
    }

    return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: amount >= 10 ? 1 : 2
    }).format(amount)} ${units[unitIndex]}`;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || normalizeWhitespace(status).replaceAll("_", " ") || "Sin estado";
  }

  return Object.freeze({
    STATUS_LABELS,
    normalizeWhitespace,
    normalizeSearchText,
    formatFileSize,
    statusLabel
  });
});
