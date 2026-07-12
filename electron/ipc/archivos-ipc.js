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
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} es obligatorio.`);
  }
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

function getExistingStoredPath(file) {
  const absolutePath = resolveStoredDocument({
    projectId: file.proyectoId,
    relativePath: file.rutaRelativa
  });

  let stats;
  try {
    stats = fs.statSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const missingError = new Error("El documento ya no existe en la carpeta del proyecto.");
      missingError.code = "STORED_FILE_MISSING";
      throw missingError;
    }
    throw error;
  }

  if (!stats.isFile()) {
    const error = new Error("La ruta guardada no corresponde a un documento.");
    error.code = "STORED_PATH_NOT_FILE";
    throw error;
  }

  return absolutePath;
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

async function deleteStoredFile(fileId) {
  const file = getStoredFile(fileId);
  const absolutePath = resolveStoredDocument({
    projectId: file.proyectoId,
    relativePath: file.rutaRelativa
  });
  const stagedPath = `${absolutePath}.deleting-${Date.now()}`;
  let staged = false;

  if (fs.existsSync(absolutePath)) {
    fs.renameSync(absolutePath, stagedPath);
    staged = true;
  }

  try {
    const removed = archivosRepository.remove(file.id);
    if (!removed) {
      if (staged && fs.existsSync(stagedPath)) {
        fs.renameSync(stagedPath, absolutePath);
      }
      return { removed: false, trashed: false };
    }
  } catch (error) {
    if (staged && fs.existsSync(stagedPath)) {
      try {
        fs.renameSync(stagedPath, absolutePath);
      } catch (restoreError) {
        console.error("No se pudo restaurar el documento tras el error:", restoreError);
      }
    }
    throw error;
  }

  if (staged && fs.existsSync(stagedPath)) {
    try {
      await shell.trashItem(stagedPath);
    } catch (trashError) {
      try {
        fs.renameSync(stagedPath, absolutePath);
        archivosRepository.restore(file);
        updateDocumentCount(file.proyectoId);
      } catch (restoreError) {
        console.error("No se pudo restaurar el documento ni su metadata:", restoreError);
      }

      const error = new Error(
        "No se pudo enviar el documento a la Papelera. El archivo se conservó."
      );
      error.code = "FILE_TRASH_FAILED";
      error.cause = trashError;
      throw error;
    }
  }

  updateDocumentCount(file.proyectoId);
  return { removed: true, trashed: staged };
}

function registerArchivosIpc() {
  registerHandler(CHANNELS.LIST_FILES, (_event, projectId) => {
    const project = getProject(projectId);
    return archivosRepository.listByProject(project.id);
  });

  registerHandler(CHANNELS.GET_FILE, (_event, fileId) => getStoredFile(fileId));
  registerHandler(CHANNELS.IMPORT_FILES, importSelectedDocuments);

  registerHandler(CHANNELS.OPEN_FILE, async (_event, fileId) => {
    const file = getStoredFile(fileId);
    const absolutePath = getExistingStoredPath(file);
    const openError = await shell.openPath(absolutePath);
    if (openError) throw new Error(openError);
    return true;
  });

  registerHandler(CHANNELS.REVEAL_FILE, (_event, fileId) => {
    const file = getStoredFile(fileId);
    shell.showItemInFolder(getExistingStoredPath(file));
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
    getExistingStoredPath(file);
    return backupDocument({
      projectId: file.proyectoId,
      relativePath: file.rutaRelativa
    });
  });

  registerHandler(CHANNELS.DELETE_FILE, (_event, fileId) => deleteStoredFile(fileId));

  return function unregisterArchivosIpc() {
    for (const channel of Object.values(CHANNELS)) ipcMain.removeHandler(channel);
  };
}

module.exports = { CHANNELS, registerArchivosIpc };
