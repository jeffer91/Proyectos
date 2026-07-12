"use strict";

const fs = require("fs");
const path = require("path");
const { BrowserWindow, dialog, ipcMain, shell } = require("electron");
const archivosRepository = require("../../database/repositories/archivos-repository");
const proyectosRepository = require("../../database/repositories/proyectos-repository");
const {
  ensureProjectStructure,
  getProjectPaths,
  setDocumentCount
} = require("../services/project-storage-service");
const {
  importDocument,
  removeImportedDocument,
  backupDocument,
  resolveStoredDocument
} = require("../services/file-storage-service");

const CHANNELS = Object.freeze({
  LIST_FILES: "archivos:listar-por-proyecto",
  GET_FILE: "archivos:obtener",
  REGISTER_FILE: "archivos:registrar",
  IMPORT_FILES: "archivos:importar",
  OPEN_FILE: "archivos:abrir",
  REVEAL_FILE: "archivos:mostrar-en-carpeta",
  OPEN_PROJECT_FOLDER: "archivos:abrir-carpeta-proyecto",
  BACKUP_FILE: "archivos:respaldar",
  DELETE_FILE: "archivos:eliminar"
});

function serializeError(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Ocurrió un error inesperado."
  };
}

function safeHandler(channel, callback) {
  return async (event, ...args) => {
    try {
      return { ok: true, data: await callback(event, ...args) };
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
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} es obligatorio.`);
  return value.trim();
}

function getProject(projectId) {
  const project = proyectosRepository.findById(
    requireTextId(projectId, "El identificador del proyecto")
  );
  if (!project) {
    const error = new Error("No se encontró el proyecto.");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }
  return project;
}

function getStoredFile(fileId) {
  const file = archivosRepository.findById(
    requireTextId(fileId, "El identificador del archivo")
  );
  if (!file) {
    const error = new Error("No se encontró el archivo.");
    error.code = "FILE_NOT_FOUND";
    throw error;
  }
  return file;
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

function updateDocumentCount(projectId) {
  setDocumentCount(projectId, archivosRepository.listByProject(projectId).length);
}

async function importSelectedDocuments(event, projectId) {
  const project = getProject(projectId);
  ensureProjectStructure({ projectId: project.id, projectName: project.nombre });

  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const selection = await dialog.showOpenDialog(ownerWindow || undefined, {
    title: `Agregar documentos a ${project.nombre}`,
    buttonLabel: "Agregar documentos",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "PDF y Word", extensions: ["pdf", "doc", "docx"] },
      { name: "PDF", extensions: ["pdf"] },
      { name: "Word", extensions: ["doc", "docx"] }
    ]
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return { canceled: true, files: [], errors: [] };
  }

  const files = [];
  const errors = [];

  for (const sourcePath of selection.filePaths) {
    let imported = null;
    try {
      imported = await importDocument({
        projectId: project.id,
        projectName: project.nombre,
        sourcePath
      });
      files.push(archivosRepository.create(normalizeFileMetadata(imported)));
    } catch (error) {
      if (imported?.rutaRelativa) {
        try {
          await removeImportedDocument(project.id, imported.rutaRelativa);
        } catch (rollbackError) {
          console.error("No se pudo revertir un archivo importado:", rollbackError);
        }
      }
      errors.push({
        fileName: path.basename(sourcePath),
        code: typeof error?.code === "string" ? error.code : "IMPORT_ERROR",
        message: error.message
      });
    }
  }

  updateDocumentCount(project.id);
  return { canceled: false, files, errors };
}

function registerArchivosIpc() {
  registerHandler(CHANNELS.LIST_FILES, (_event, projectId) =>
    archivosRepository.listByProject(requireTextId(projectId, "El identificador del proyecto"))
  );
  registerHandler(CHANNELS.GET_FILE, (_event, fileId) => getStoredFile(fileId));
  registerHandler(CHANNELS.REGISTER_FILE, (_event, payload) =>
    archivosRepository.create(normalizeFileMetadata(payload))
  );
  registerHandler(CHANNELS.IMPORT_FILES, importSelectedDocuments);

  registerHandler(CHANNELS.OPEN_FILE, async (_event, fileId) => {
    const file = getStoredFile(fileId);
    const absolutePath = resolveStoredDocument({
      projectId: file.proyectoId,
      relativePath: file.rutaRelativa
    });
    const openError = await shell.openPath(absolutePath);
    if (openError) throw new Error(openError);
    return true;
  });

  registerHandler(CHANNELS.REVEAL_FILE, (_event, fileId) => {
    const file = getStoredFile(fileId);
    shell.showItemInFolder(resolveStoredDocument({
      projectId: file.proyectoId,
      relativePath: file.rutaRelativa
    }));
    return true;
  });

  registerHandler(CHANNELS.OPEN_PROJECT_FOLDER, async (_event, projectId) => {
    const project = getProject(projectId);
    ensureProjectStructure({ projectId: project.id, projectName: project.nombre });
    const openError = await shell.openPath(getProjectPaths(project.id).documents);
    if (openError) throw new Error(openError);
    return true;
  });

  registerHandler(CHANNELS.BACKUP_FILE, async (_event, fileId) => {
    const file = getStoredFile(fileId);
    return backupDocument({
      projectId: file.proyectoId,
      relativePath: file.rutaRelativa
    });
  });

  registerHandler(CHANNELS.DELETE_FILE, async (_event, fileId) => {
    const file = getStoredFile(fileId);
    const absolutePath = resolveStoredDocument({
      projectId: file.proyectoId,
      relativePath: file.rutaRelativa
    });
    if (fs.existsSync(absolutePath)) await shell.trashItem(absolutePath);
    const removed = archivosRepository.remove(file.id);
    updateDocumentCount(file.proyectoId);
    return removed;
  });

  return function unregisterArchivosIpc() {
    for (const channel of Object.values(CHANNELS)) ipcMain.removeHandler(channel);
  };
}

module.exports = { CHANNELS, registerArchivosIpc };
