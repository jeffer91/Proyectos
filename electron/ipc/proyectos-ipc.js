"use strict";

const { ipcMain } = require("electron");
const proyectosRepository = require("../../database/repositories/proyectos-repository");
const tiposRepository = require("../../database/repositories/tipos-repository");

const CHANNELS = Object.freeze({
  LIST_PROJECTS: "proyectos:listar",
  GET_PROJECT: "proyectos:obtener",
  CREATE_PROJECT: "proyectos:crear",
  UPDATE_PROJECT: "proyectos:actualizar",
  DELETE_PROJECT: "proyectos:eliminar",
  GET_SUMMARY: "proyectos:resumen",
  LIST_TYPES: "tipos:listar",
  CREATE_TYPE: "tipos:crear",
  RENAME_TYPE: "tipos:renombrar"
});

function serializeError(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Ocurrió un error inesperado."
  };
}

function safeHandler(channel, callback) {
  return async (_event, ...args) => {
    try {
      const data = await callback(...args);
      return { ok: true, data };
    } catch (error) {
      console.error(`[IPC] Error en ${channel}:`, error);
      return { ok: false, error: serializeError(error) };
    }
  };
}

function registerHandler(channel, callback) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, safeHandler(channel, callback));
}

function requireProjectId(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("El identificador del proyecto es obligatorio.");
  }

  return value.trim();
}

function pickProjectChanges(value) {
  const source = value && typeof value === "object" ? value : {};
  const allowedFields = [
    "nombre",
    "tipoId",
    "estado",
    "fechaInicio",
    "proximaFecha",
    "aporteEsperadoCentavos",
    "aporteRecibidoCentavos",
    "avance",
    "archivado"
  ];
  const result = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }
  }

  return result;
}

function registerProyectosIpc() {
  registerHandler(CHANNELS.LIST_PROJECTS, (options = {}) =>
    proyectosRepository.list({
      includeCompleted: options?.includeCompleted === true,
      includeArchived: options?.includeArchived === true
    })
  );

  registerHandler(CHANNELS.GET_PROJECT, (projectId) =>
    proyectosRepository.findById(requireProjectId(projectId))
  );

  registerHandler(CHANNELS.CREATE_PROJECT, (payload = {}) =>
    proyectosRepository.create({
      nombre: payload?.nombre,
      tipoId: payload?.tipoId,
      fechaInicio: payload?.fechaInicio
    })
  );

  registerHandler(CHANNELS.UPDATE_PROJECT, (projectId, changes = {}) =>
    proyectosRepository.update(requireProjectId(projectId), pickProjectChanges(changes))
  );

  registerHandler(CHANNELS.DELETE_PROJECT, (projectId) =>
    proyectosRepository.remove(requireProjectId(projectId))
  );

  registerHandler(CHANNELS.GET_SUMMARY, () => proyectosRepository.getSummary());

  registerHandler(CHANNELS.LIST_TYPES, () => tiposRepository.list());

  registerHandler(CHANNELS.CREATE_TYPE, (name) => tiposRepository.create(name));

  registerHandler(CHANNELS.RENAME_TYPE, (typeId, name) => tiposRepository.rename(typeId, name));

  return function unregisterProyectosIpc() {
    for (const channel of Object.values(CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };
}

module.exports = {
  CHANNELS,
  registerProyectosIpc
};
