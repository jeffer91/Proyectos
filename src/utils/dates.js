"use strict";

(function exposeDates(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    Object.defineProperty(root, "AppDates", {
      value: api,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
})(typeof window !== "undefined" ? window : null, function createDatesApi() {
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function localDateString(date = new Date()) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new TypeError("Se requiere una fecha válida.");
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseDateOnly(value) {
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
      return null;
    }

    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) || localDateString(date) !== value ? null : date;
  }

  function formatDate(value, options = {}) {
    if (!value) {
      return options.emptyValue || "—";
    }

    const date = parseDateOnly(value) || new Date(value);
    if (Number.isNaN(date.getTime())) {
      return options.emptyValue || "—";
    }

    return new Intl.DateTimeFormat(options.locale || "es-EC", {
      day: "2-digit",
      month: options.longMonth ? "long" : "short",
      year: "numeric"
    }).format(date);
  }

  function isOverdue(value, today = new Date()) {
    return Boolean(parseDateOnly(value) && value < localDateString(today));
  }

  function daysUntil(value, today = new Date()) {
    const target = parseDateOnly(value);
    if (!target) {
      return null;
    }

    const base = parseDateOnly(localDateString(today));
    return Math.round((target.getTime() - base.getTime()) / 86400000);
  }

  return Object.freeze({
    DATE_PATTERN,
    localDateString,
    parseDateOnly,
    formatDate,
    isOverdue,
    daysUntil
  });
});
