"use strict";

(function exposeCurrency(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    Object.defineProperty(root, "AppCurrency", {
      value: api,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
})(typeof window !== "undefined" ? window : null, function createCurrencyApi() {
  function normalizeCents(value, fieldName = "El valor") {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
      throw new Error(`${fieldName} debe expresarse en centavos y ser igual o mayor que cero.`);
    }
    return number;
  }

  function formatCurrency(cents, options = {}) {
    const normalized = Number(cents);
    const amount = Number.isFinite(normalized) ? normalized / 100 : 0;
    return new Intl.NumberFormat(options.locale || "es-EC", {
      style: "currency",
      currency: options.currency || "USD",
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 2
    }).format(amount);
  }

  function parseCurrencyToCents(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
    }
    if (typeof value !== "string") return null;

    const normalized = value
      .trim()
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : null;
  }

  return Object.freeze({ normalizeCents, formatCurrency, parseCurrencyToCents });
});
