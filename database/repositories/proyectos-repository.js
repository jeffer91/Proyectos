"use strict";

const { randomUUID } = require("crypto");
const { getDatabase } = require("../../electron/services/database-service");

const VALID_STATES = new Set(["pendiente", "en_proceso", "pausado", "completado"]);
const PROJECT_SELECT = `
  SELECT
    p.id,
    p.nombre,
    p.tipo_id,
    t.nombre AS tipo_nombre,
    p.estado,
    p.fecha_inicio,
    p.proxima_fecha,
    p.ultima_actualizacion,
    p.aporte_esperado_centavos,
    p.aporte_recibido_centavos,
    p.avance,
    p.archivado,
    p.creado_en,
    p.actualizado_en
  FROM proyectos p
  INNER JOIN tipos_proyecto t ON t.id = p.tipo_id
`;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeName(value) {
  if (typeof value !== "string") {
    throw new TypeError("El nombre del proyecto debe ser texto.");
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("El nombre del proyecto es obligatorio.");
  }

  if (normalized.length > 160) {
    throw new Error("El nombre del proyecto no puede superar 160 caracteres.");
  }

  return normalized;
}

function normalizeDate(value, { required = false } = {}) {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new Error("La fecha es obligatoria.");
    }

    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("La fecha debe tener el formato AAAA-MM-DD.");
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha indicada no es válida.");
  }

  return value;
}

function normalizeNonNegativeInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} debe ser un número entero igual o mayor que cero.`);
  }

  return number;
}

function mapProject(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    tipoId: row.tipo_id,
    tipoNombre: row.tipo_nombre,
    estado: row.estado,
    fechaInicio: row.fecha_inicio,
    proximaFecha: row.proxima_fecha,
    ultimaActualizacion: row.ultima_actualizacion,
    aporteEsperadoCentavos: row.aporte_esperado_centavos,
    aporteRecibidoCentavos: row.aporte_recibido_centavos,
    avance: row.avance,
    archivado: Boolean(row.archivado),
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function findById(id) {
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }

  const row = getDatabase()
    .prepare(`${PROJECT_SELECT} WHERE p.id = ?`)
    .get(id.trim());

  return mapProject(row);
}

function list({ includeCompleted = false, includeArchived = false } = {}) {
  const conditions = [];
  const parameters = [];

  if (!includeCompleted) {
    conditions.push("p.estado <> ?");
    parameters.push("completado");
  }

  if (!includeArchived) {
    conditions.push("p.archivado = 0");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDatabase()
    .prepare(`
      ${PROJECT_SELECT}
      ${where}
      ORDER BY
        CASE WHEN p.proxima_fecha IS NULL THEN 1 ELSE 0 END ASC,
        p.proxima_fecha ASC,
        p.ultima_actualizacion DESC,
        p.nombre COLLATE NOCASE ASC
    `)
    .all(...parameters);

  return rows.map(mapProject);
}

function create({ nombre, tipoId, fechaInicio } = {}) {
  const normalizedName = normalizeName(nombre);
  const normalizedTypeId = Number(tipoId);

  if (!Number.isInteger(normalizedTypeId) || normalizedTypeId <= 0) {
    throw new Error("Debes seleccionar un tipo de proyecto válido.");
  }

  const typeExists = getDatabase()
    .prepare("SELECT 1 AS existe FROM tipos_proyecto WHERE id = ?")
    .get(normalizedTypeId);

  if (!typeExists) {
    const error = new Error("El tipo de proyecto seleccionado no existe.");
    error.code = "TYPE_NOT_FOUND";
    throw error;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const startDate = normalizeDate(fechaInicio || localDateString(), { required: true });

  getDatabase()
    .prepare(`
      INSERT INTO proyectos (
        id,
        nombre,
        tipo_id,
        estado,
        fecha_inicio,
        proxima_fecha,
        ultima_actualizacion,
        aporte_esperado_centavos,
        aporte_recibido_centavos,
        avance,
        archivado,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, 'pendiente', ?, NULL, ?, 0, 0, 0, 0, ?, ?)
    `)
    .run(id, normalizedName, normalizedTypeId, startDate, now, now, now);

  return findById(id);
}

function update(id, changes = {}) {
  const current = findById(id);

  if (!current) {
    const error = new Error("No se encontró el proyecto.");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const setters = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(changes, "nombre")) {
    setters.push("nombre = ?");
    values.push(normalizeName(changes.nombre));
  }

  if (Object.prototype.hasOwnProperty.call(changes, "tipoId")) {
    const typeId = Number(changes.tipoId);

    if (!Number.isInteger(typeId) || typeId <= 0) {
      throw new Error("El tipo de proyecto no es válido.");
    }

    const typeExists = getDatabase()
      .prepare("SELECT 1 AS existe FROM tipos_proyecto WHERE id = ?")
      .get(typeId);

    if (!typeExists) {
      const error = new Error("El tipo de proyecto seleccionado no existe.");
      error.code = "TYPE_NOT_FOUND";
      throw error;
    }

    setters.push("tipo_id = ?");
    values.push(typeId);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "estado")) {
    if (!VALID_STATES.has(changes.estado)) {
      throw new Error("El estado del proyecto no es válido.");
    }

    setters.push("estado = ?");
    values.push(changes.estado);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "fechaInicio")) {
    setters.push("fecha_inicio = ?");
    values.push(normalizeDate(changes.fechaInicio, { required: true }));
  }

  if (Object.prototype.hasOwnProperty.call(changes, "proximaFecha")) {
    setters.push("proxima_fecha = ?");
    values.push(normalizeDate(changes.proximaFecha));
  }

  if (Object.prototype.hasOwnProperty.call(changes, "aporteEsperadoCentavos")) {
    setters.push("aporte_esperado_centavos = ?");
    values.push(
      normalizeNonNegativeInteger(changes.aporteEsperadoCentavos, "El aporte esperado")
    );
  }

  if (Object.prototype.hasOwnProperty.call(changes, "aporteRecibidoCentavos")) {
    setters.push("aporte_recibido_centavos = ?");
    values.push(
      normalizeNonNegativeInteger(changes.aporteRecibidoCentavos, "El aporte recibido")
    );
  }

  if (Object.prototype.hasOwnProperty.call(changes, "avance")) {
    const progress = normalizeNonNegativeInteger(changes.avance, "El avance");

    if (progress > 100) {
      throw new Error("El avance no puede superar 100 %.");
    }

    setters.push("avance = ?");
    values.push(progress);
  }

  if (Object.prototype.hasOwnProperty.call(changes, "archivado")) {
    setters.push("archivado = ?");
    values.push(changes.archivado ? 1 : 0);
  }

  if (setters.length === 0) {
    return current;
  }

  const now = new Date().toISOString();
  setters.push("ultima_actualizacion = ?", "actualizado_en = ?");
  values.push(now, now, current.id);

  getDatabase()
    .prepare(`UPDATE proyectos SET ${setters.join(", ")} WHERE id = ?`)
    .run(...values);

  return findById(current.id);
}

function remove(id) {
  const current = findById(id);

  if (!current) {
    return false;
  }

  const result = getDatabase().prepare("DELETE FROM proyectos WHERE id = ?").run(current.id);
  return Number(result.changes) > 0;
}

function getSummary() {
  const row = getDatabase()
    .prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(
          CASE
            WHEN estado <> 'completado' AND archivado = 0 THEN 1
            ELSE 0
          END
        ), 0) AS activos,
        COALESCE(SUM(
          CASE
            WHEN estado <> 'completado'
              AND archivado = 0
              AND proxima_fecha IS NOT NULL
              AND date(proxima_fecha) BETWEEN date('now', 'localtime')
                AND date('now', 'localtime', '+7 days')
            THEN 1 ELSE 0
          END
        ), 0) AS proximos_a_vencer,
        COALESCE(SUM(
          CASE WHEN archivado = 0 THEN aporte_esperado_centavos ELSE 0 END
        ), 0) AS aporte_esperado_centavos,
        COALESCE(SUM(
          CASE WHEN archivado = 0 THEN aporte_recibido_centavos ELSE 0 END
        ), 0) AS aporte_recibido_centavos
      FROM proyectos
    `)
    .get();

  return {
    total: Number(row.total || 0),
    activos: Number(row.activos || 0),
    proximosAVencer: Number(row.proximos_a_vencer || 0),
    aporteEsperadoCentavos: Number(row.aporte_esperado_centavos || 0),
    aporteRecibidoCentavos: Number(row.aporte_recibido_centavos || 0)
  };
}

module.exports = {
  VALID_STATES,
  list,
  findById,
  create,
  update,
  remove,
  getSummary
};
