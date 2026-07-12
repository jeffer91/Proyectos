"use strict";

const { randomUUID } = require("crypto");
const { getDatabase } = require("../../electron/services/database-service");

function requiredText(value, fieldName, maxLength = 255) {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} debe ser texto.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} no puede superar ${maxLength} caracteres.`);
  }

  return normalized;
}

function optionalText(value, maxLength = 255) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new TypeError("El valor debe ser texto.");
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new Error(`El valor no puede superar ${maxLength} caracteres.`);
  }

  return normalized || null;
}

function mapFile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    nombreOriginal: row.nombre_original,
    nombreGuardado: row.nombre_guardado,
    extension: row.extension,
    tipoMime: row.tipo_mime,
    rutaRelativa: row.ruta_relativa,
    tamanoBytes: row.tamano_bytes,
    hashSha256: row.hash_sha256,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function findById(id) {
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }

  const row = getDatabase()
    .prepare("SELECT * FROM archivos WHERE id = ?")
    .get(id.trim());

  return mapFile(row);
}

function listByProject(projectId) {
  const normalizedProjectId = requiredText(projectId, "El identificador del proyecto", 80);
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM archivos
      WHERE proyecto_id = ?
      ORDER BY creado_en DESC, nombre_original COLLATE NOCASE ASC
    `)
    .all(normalizedProjectId);

  return rows.map(mapFile);
}

function create({
  proyectoId,
  nombreOriginal,
  nombreGuardado,
  extension = null,
  tipoMime = null,
  rutaRelativa,
  tamanoBytes = 0,
  hashSha256 = null
} = {}) {
  const normalizedProjectId = requiredText(proyectoId, "El identificador del proyecto", 80);
  const projectExists = getDatabase()
    .prepare("SELECT 1 AS existe FROM proyectos WHERE id = ?")
    .get(normalizedProjectId);

  if (!projectExists) {
    const error = new Error("El proyecto asociado al archivo no existe.");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const size = Number(tamanoBytes);

  if (!Number.isInteger(size) || size < 0) {
    throw new Error("El tamaño del archivo debe ser un entero igual o mayor que cero.");
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      INSERT INTO archivos (
        id,
        proyecto_id,
        nombre_original,
        nombre_guardado,
        extension,
        tipo_mime,
        ruta_relativa,
        tamano_bytes,
        hash_sha256,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      normalizedProjectId,
      requiredText(nombreOriginal, "El nombre original", 255),
      requiredText(nombreGuardado, "El nombre guardado", 255),
      optionalText(extension, 20),
      optionalText(tipoMime, 120),
      requiredText(rutaRelativa, "La ruta relativa", 1024),
      size,
      optionalText(hashSha256, 64),
      now,
      now
    );

  return findById(id);
}

function remove(id) {
  const current = findById(id);

  if (!current) {
    return false;
  }

  const result = getDatabase().prepare("DELETE FROM archivos WHERE id = ?").run(current.id);
  return Number(result.changes) > 0;
}

module.exports = {
  listByProject,
  findById,
  create,
  remove
};
