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
    if (!Number.isSafeInteger(number) || number < 0) {
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

  function normalizeCurrencyText(value) {
    const text = String(value ?? "").trim();
    if (!text) return "0";

    const cleaned = text.replace(/[^\d,.-]/g, "");
    if (!cleaned || cleaned.includes("-")) return null;

    const commaIndex = cleaned.lastIndexOf(",");
    const dotIndex = cleaned.lastIndexOf(".");
    let normalized = cleaned;

    if (commaIndex >= 0 && dotIndex >= 0) {
      if (commaIndex > dotIndex) {
        normalized = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        normalized = cleaned.replace(/,/g, "");
      }
    } else if (commaIndex >= 0) {
      const decimalDigits = cleaned.length - commaIndex - 1;
      normalized = decimalDigits >= 1 && decimalDigits <= 2
        ? cleaned.replace(",", ".")
        : cleaned.replace(/,/g, "");
    } else if (dotIndex >= 0) {
      const decimalDigits = cleaned.length - dotIndex - 1;
      normalized = decimalDigits >= 1 && decimalDigits <= 2
        ? cleaned
        : cleaned.replace(/\./g, "");
    }

    return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? normalized : null;
  }

  function parseCurrencyToCents(value) {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || value < 0) return null;
      const cents = Math.round(value * 100);
      return Number.isSafeInteger(cents) ? cents : null;
    }

    if (typeof value !== "string") return null;
    const normalized = normalizeCurrencyText(value);
    if (normalized === null) return null;

    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return null;
    const cents = Math.round(number * 100);
    return Number.isSafeInteger(cents) ? cents : null;
  }

  return Object.freeze({
    normalizeCents,
    formatCurrency,
    parseCurrencyToCents
  });
});
