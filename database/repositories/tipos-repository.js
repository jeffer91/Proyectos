"use strict";

const { getDatabase } = require("../../electron/services/database-service");

function normalizeName(value) {
  if (typeof value !== "string") {
    throw new TypeError("El nombre del tipo debe ser texto.");
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("El nombre del tipo es obligatorio.");
  }

  if (normalized.length > 80) {
    throw new Error("El nombre del tipo no puede superar 80 caracteres.");
  }

  return normalized;
}

function mapType(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function list() {
  const db = getDatabase();
  const rows = db
    .prepare(`
      SELECT id, nombre, creado_en, actualizado_en
      FROM tipos_proyecto
      ORDER BY nombre COLLATE NOCASE ASC
    `)
    .all();

  return rows.map(mapType);
}

function findById(id) {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const row = getDatabase()
    .prepare(`
      SELECT id, nombre, creado_en, actualizado_en
      FROM tipos_proyecto
      WHERE id = ?
    `)
    .get(numericId);

  return mapType(row);
}

function findByName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }

  const row = getDatabase()
    .prepare(`
      SELECT id, nombre, creado_en, actualizado_en
      FROM tipos_proyecto
      WHERE nombre = ? COLLATE NOCASE
    `)
    .get(name.trim());

  return mapType(row);
}

function create(name) {
  const normalizedName = normalizeName(name);
  const existing = findByName(normalizedName);

  if (existing) {
    const error = new Error("Ya existe un tipo de proyecto con ese nombre.");
    error.code = "TYPE_ALREADY_EXISTS";
    throw error;
  }

  const now = new Date().toISOString();
  const result = getDatabase()
    .prepare(`
      INSERT INTO tipos_proyecto (nombre, creado_en, actualizado_en)
      VALUES (?, ?, ?)
    `)
    .run(normalizedName, now, now);

  return findById(Number(result.lastInsertRowid));
}

function getOrCreate(name) {
  const normalizedName = normalizeName(name);
  return findByName(normalizedName) || create(normalizedName);
}

function rename(id, name) {
  const current = findById(id);

  if (!current) {
    const error = new Error("No se encontró el tipo de proyecto.");
    error.code = "TYPE_NOT_FOUND";
    throw error;
  }

  const normalizedName = normalizeName(name);
  const duplicate = findByName(normalizedName);

  if (duplicate && duplicate.id !== current.id) {
    const error = new Error("Ya existe un tipo de proyecto con ese nombre.");
    error.code = "TYPE_ALREADY_EXISTS";
    throw error;
  }

  getDatabase()
    .prepare(`
      UPDATE tipos_proyecto
      SET nombre = ?, actualizado_en = ?
      WHERE id = ?
    `)
    .run(normalizedName, new Date().toISOString(), current.id);

  return findById(current.id);
}

module.exports = {
  list,
  findById,
  findByName,
  create,
  getOrCreate,
  rename
};
