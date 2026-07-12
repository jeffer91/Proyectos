"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const validators = require("../src/utils/validators");

test("valida nombres de proyecto y normaliza espacios", () => {
  const validation = validators.validateProjectName("  Proyecto   principal  ");
  assert.equal(validation.valid, true);
  assert.equal(validation.value, "Proyecto principal");
});

test("rechaza nombres vacíos y demasiado extensos", () => {
  assert.equal(validators.validateProjectName("   ").valid, false);
  assert.equal(validators.validateTypeName("x".repeat(81)).valid, false);
});

test("valida fechas reales y avance entre 0 y 100", () => {
  assert.equal(validators.validateDate("2026-02-28", { required: true }).valid, true);
  assert.equal(validators.validateDate("2026-02-30", { required: true }).valid, false);
  assert.equal(validators.validateProgress(0).valid, true);
  assert.equal(validators.validateProgress(100).valid, true);
  assert.equal(validators.validateProgress(101).valid, false);
});

test("acepta únicamente PDF y documentos de Word", () => {
  assert.equal(validators.validateDocumentExtension("informe.PDF").valid, true);
  assert.equal(validators.validateDocumentExtension("documento.docx").valid, true);
  assert.equal(validators.validateDocumentExtension("tabla.xlsx").valid, false);
});
