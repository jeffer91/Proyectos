"use strict";

(function exposeValidators(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    Object.defineProperty(root, "AppValidators", {
      value: api,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
})(typeof window !== "undefined" ? window : null, function createValidatorsApi() {
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const DOCUMENT_EXTENSIONS = Object.freeze(["pdf", "doc", "docx"]);

  function result(valid, value, error = "") {
    return Object.freeze({ valid, value, error });
  }

  function normalizeText(value) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  }

  function validateRequiredText(value, { label = "El campo", maxLength = 160 } = {}) {
    const normalized = normalizeText(value);
    if (!normalized) return result(false, "", `${label} es obligatorio.`);
    if (normalized.length > maxLength) {
      return result(false, normalized, `${label} no puede superar ${maxLength} caracteres.`);
    }
    return result(true, normalized);
  }

  function validateProjectName(value) {
    return validateRequiredText(value, { label: "El nombre del proyecto", maxLength: 160 });
  }

  function validateTypeName(value) {
    return validateRequiredText(value, { label: "El nombre del tipo", maxLength: 80 });
  }

  function validateDate(value, { required = false } = {}) {
    if (value === null || value === undefined || value === "") {
      return required ? result(false, null, "La fecha es obligatoria.") : result(true, null);
    }
    if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
      return result(false, null, "La fecha debe tener el formato AAAA-MM-DD.");
    }

    const date = new Date(`${value}T12:00:00`);
    const valid = !Number.isNaN(date.getTime()) && [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-") === value;

    return valid ? result(true, value) : result(false, null, "La fecha indicada no es válida.");
  }

  function validateProgress(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 100
      ? result(true, number)
      : result(false, null, "El avance debe ser un entero entre 0 y 100.");
  }

  function validateDocumentExtension(fileName) {
    const match = typeof fileName === "string" ? fileName.toLowerCase().match(/\.([^.]+)$/) : null;
    const extension = match?.[1] || "";
    return DOCUMENT_EXTENSIONS.includes(extension)
      ? result(true, extension)
      : result(false, extension, "Solo se permiten documentos PDF, DOC y DOCX.");
  }

  function assertValid(validation) {
    if (!validation?.valid) throw new Error(validation?.error || "El valor no es válido.");
    return validation.value;
  }

  return Object.freeze({
    DOCUMENT_EXTENSIONS,
    normalizeText,
    validateRequiredText,
    validateProjectName,
    validateTypeName,
    validateDate,
    validateProgress,
    validateDocumentExtension,
    assertValid
  });
});
