"use strict";

const { randomUUID } = require("crypto");
const {
  getDatabase,
  runInTransaction
} = require("../../electron/services/database-service");

function requiredText(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} debe ser texto.`);
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} no puede superar ${maxLength} caracteres.`);
  }

  return normalized;
}

function optionalText(value, maxLength) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new TypeError("La descripción debe ser texto.");
  }

  const normalized = value.trim().replace(/\r\n/g, "\n");
  if (normalized.length > maxLength) {
    throw new Error(`La descripción no puede superar ${maxLength} caracteres.`);
  }
  return normalized || null;
}

function normalizeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("La fecha objetivo debe tener el formato AAAA-MM-DD.");
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha objetivo no es válida.");
  }
  return value;
}

function normalizeProgress(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100) {
    throw new Error("El avance del hito debe ser un entero entre 0 y 100.");
  }
  return number;
}

function mapMilestone(row) {
  if (!row) return null;

  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    fechaObjetivo: row.fecha_objetivo,
    avance: row.avance,
    completado: row.avance === 100,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function requireProject(projectId, db = getDatabase()) {
  const normalized = requiredText(projectId, "El identificador del proyecto", 80);
  const exists = db.prepare("SELECT 1 AS existe FROM proyectos WHERE id = ?").get(normalized);

  if (!exists) {
    const error = new Error("No se encontró el proyecto asociado al hito.");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  return normalized;
}

function findById(id) {
  if (typeof id !== "string" || !id.trim()) return null;
  const row = getDatabase().prepare("SELECT * FROM hitos WHERE id = ?").get(id.trim());
  return mapMilestone(row);
}

function listByProject(projectId) {
  const normalizedProjectId = requireProject(projectId);
  const rows = getDatabase()
    .prepare(`
      SELECT *
      FROM hitos
      WHERE proyecto_id = ?
      ORDER BY
        CASE WHEN avance = 100 THEN 1 ELSE 0 END ASC,
        fecha_objetivo ASC,
        creado_en ASC
    `)
    .all(normalizedProjectId);

  return rows.map(mapMilestone);
}

function recalculateProject(projectId, db) {
  const summary = db
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(ROUND(AVG(avance)), 0) AS avance_promedio,
        MIN(CASE WHEN avance < 100 THEN fecha_objetivo END) AS proxima_fecha
      FROM hitos
      WHERE proyecto_id = ?
    `)
    .get(projectId);

  const now = new Date().toISOString();
  const progress = Number(summary.total) > 0 ? Number(summary.avance_promedio) : 0;
  const nextDate = Number(summary.total) > 0 ? summary.proxima_fecha : null;

  db.prepare(`
    UPDATE proyectos
    SET avance = ?,
        proxima_fecha = ?,
        ultima_actualizacion = ?,
        actualizado_en = ?
    WHERE id = ?
  `).run(progress, nextDate, now, now, projectId);

  return {
    total: Number(summary.total || 0),
    avance: progress,
    proximaFecha: nextDate
  };
}

function create({ proyectoId, titulo, descripcion = null, fechaObjetivo, avance = 0 } = {}) {
  return runInTransaction((db) => {
    const normalizedProjectId = requireProject(proyectoId, db);
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO hitos (
        id,
        proyecto_id,
        titulo,
        descripcion,
        fecha_objetivo,
        avance,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      normalizedProjectId,
      requiredText(titulo, "El título del hito", 160),
      optionalText(descripcion, 2000),
      normalizeDate(fechaObjetivo),
      normalizeProgress(avance),
      now,
      now
    );

    recalculateProject(normalizedProjectId, db);
    return mapMilestone(db.prepare("SELECT * FROM hitos WHERE id = ?").get(id));
  });
}

function update(id, changes = {}) {
  return runInTransaction((db) => {
    const currentRow = db.prepare("SELECT * FROM hitos WHERE id = ?").get(id);
    const current = mapMilestone(currentRow);

    if (!current) {
      const error = new Error("No se encontró el hito.");
      error.code = "MILESTONE_NOT_FOUND";
      throw error;
    }

    const setters = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(changes, "titulo")) {
      setters.push("titulo = ?");
      values.push(requiredText(changes.titulo, "El título del hito", 160));
    }
    if (Object.prototype.hasOwnProperty.call(changes, "descripcion")) {
      setters.push("descripcion = ?");
      values.push(optionalText(changes.descripcion, 2000));
    }
    if (Object.prototype.hasOwnProperty.call(changes, "fechaObjetivo")) {
      setters.push("fecha_objetivo = ?");
      values.push(normalizeDate(changes.fechaObjetivo));
    }
    if (Object.prototype.hasOwnProperty.call(changes, "avance")) {
      setters.push("avance = ?");
      values.push(normalizeProgress(changes.avance));
    }

    if (setters.length === 0) return current;

    setters.push("actualizado_en = ?");
    values.push(new Date().toISOString(), current.id);
    db.prepare(`UPDATE hitos SET ${setters.join(", ")} WHERE id = ?`).run(...values);

    recalculateProject(current.proyectoId, db);
    return mapMilestone(db.prepare("SELECT * FROM hitos WHERE id = ?").get(current.id));
  });
}

function remove(id) {
  return runInTransaction((db) => {
    const current = mapMilestone(db.prepare("SELECT * FROM hitos WHERE id = ?").get(id));
    if (!current) return false;

    const result = db.prepare("DELETE FROM hitos WHERE id = ?").run(current.id);
    recalculateProject(current.proyectoId, db);
    return Number(result.changes) > 0;
  });
}

module.exports = {
  listByProject,
  findById,
  create,
  update,
  remove,
  recalculateProject
};
