"use strict";

const { ipcMain } = require("electron");
const archivosRepository = require("../../database/repositories/archivos-repository");

const CHANNELS = Object.freeze({
  LIST_FILES: "archivos:listar-por-proyecto",
  GET_FILE: "archivos:obtener",
  REGISTER_FILE: "archivos:registrar",
  DELETE_FILE: "archivos:eliminar"
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

function requireTextId(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} es obligatorio.`);
  }

  return value.trim();
}

function normalizeFileMetadata(payload = {}) {
  const source = payload && typeof payload === "object" ? payload : {};

  return {
    proyectoId: source.proyectoId,
    nombreOriginal: source.nombreOriginal,
    nombreGuardado: source.nombreGuardado,
    extension: source.extension ?? null,
    tipoMime: source.tipoMime ?? null,
    rutaRelativa: source.rutaRelativa,
    tamanoBytes: source.tamanoBytes ?? 0,
    hashSha256: source.hashSha256 ?? null
  };
}

function registerArchivosIpc() {
  registerHandler(CHANNELS.LIST_FILES, (projectId) =>
    archivosRepository.listByProject(
      requireTextId(projectId, "El identificador del proyecto")
    )
  );

  registerHandler(CHANNELS.GET_FILE, (fileId) =>
    archivosRepository.findById(requireTextId(fileId, "El identificador del archivo"))
  );

  registerHandler(CHANNELS.REGISTER_FILE, (payload) =>
    archivosRepository.create(normalizeFileMetadata(payload))
  );

  registerHandler(CHANNELS.DELETE_FILE, (fileId) =>
    archivosRepository.remove(requireTextId(fileId, "El identificador del archivo"))
  );

  return function unregisterArchivosIpc() {
    for (const channel of Object.values(CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };
}

module.exports = {
  CHANNELS,
  registerArchivosIpc
};
