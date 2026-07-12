"use strict";

const fs = require("fs");
const path = require("path");

const METADATA_FILE = "metadata.json";
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

let storageRoot = null;
let projectsRoot = null;

function requireInitialized() {
  if (!storageRoot || !projectsRoot) {
    throw new Error("El almacenamiento de proyectos todavía no ha sido inicializado.");
  }
}

function normalizeProjectId(value) {
  if (typeof value !== "string") {
    throw new TypeError("El identificador del proyecto debe ser texto.");
  }

  const projectId = value.trim();
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    const error = new Error("El identificador del proyecto no es válido.");
    error.code = "INVALID_PROJECT_ID";
    throw error;
  }

  return projectId;
}

function normalizeProjectName(value) {
  if (typeof value !== "string") {
    throw new TypeError("El nombre del proyecto debe ser texto.");
  }

  const name = value.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new Error("El nombre del proyecto es obligatorio.");
  }

  return name.slice(0, 160);
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  try {
    fs.writeFileSync(temporaryPath, serialized, "utf8");
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) {
      try {
        fs.rmSync(temporaryPath, { force: true });
      } catch (cleanupError) {
        console.error("No se pudo retirar un archivo temporal de metadata:", cleanupError);
      }
    }
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    const wrapped = new Error(`No se pudo leer ${filePath}: ${error.message}`);
    wrapped.code = "INVALID_PROJECT_METADATA";
    wrapped.cause = error;
    throw wrapped;
  }
}

function initializeProjectStorage({ userDataPath } = {}) {
  if (typeof userDataPath !== "string" || !userDataPath.trim()) {
    throw new TypeError("initializeProjectStorage requiere una ruta userDataPath válida.");
  }

  storageRoot = path.resolve(userDataPath);
  projectsRoot = path.join(storageRoot, "projects");
  ensureDirectory(projectsRoot);

  return getStoragePaths();
}

function getStoragePaths() {
  requireInitialized();

  return Object.freeze({
    root: storageRoot,
    projects: projectsRoot
  });
}

function getProjectPaths(projectId) {
  requireInitialized();
  const normalizedId = normalizeProjectId(projectId);
  const root = path.join(projectsRoot, normalizedId);

  return Object.freeze({
    root,
    documents: path.join(root, "documents"),
    backups: path.join(root, "backups"),
    temp: path.join(root, "temp"),
    metadata: path.join(root, METADATA_FILE)
  });
}

function corruptMetadataBackupPath(paths) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(paths.backups, `metadata-corrupt-${timestamp}.json`);
}

function readMetadataWithRecovery(paths) {
  try {
    return readJson(paths.metadata);
  } catch (error) {
    if (error?.code !== "INVALID_PROJECT_METADATA" || !fs.existsSync(paths.metadata)) {
      throw error;
    }

    const backupPath = corruptMetadataBackupPath(paths);

    try {
      fs.renameSync(paths.metadata, backupPath);
      console.warn(`Se respaldó una metadata dañada en ${backupPath}.`);
      return null;
    } catch (backupError) {
      const wrapped = new Error(
        `La metadata del proyecto está dañada y no pudo respaldarse: ${backupError.message}`
      );
      wrapped.code = "PROJECT_METADATA_RECOVERY_FAILED";
      wrapped.cause = error;
      throw wrapped;
    }
  }
}

function ensureProjectStructure({ projectId, projectName } = {}) {
  const normalizedId = normalizeProjectId(projectId);
  const normalizedName = normalizeProjectName(projectName);
  const paths = getProjectPaths(normalizedId);

  ensureDirectory(paths.root);
  ensureDirectory(paths.documents);
  ensureDirectory(paths.backups);
  ensureDirectory(paths.temp);

  const now = new Date().toISOString();
  const current = readMetadataWithRecovery(paths);
  const metadata = {
    schemaVersion: 1,
    projectId: normalizedId,
    projectName: normalizedName,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    documentCount: Number.isInteger(current?.documentCount)
      ? Math.max(0, current.documentCount)
      : 0
  };

  writeJsonAtomic(paths.metadata, metadata);
  return Object.freeze({ paths, metadata: Object.freeze({ ...metadata }) });
}

function readProjectMetadata(projectId) {
  const paths = getProjectPaths(projectId);
  return readJson(paths.metadata);
}

function updateProjectMetadata(projectId, changes = {}) {
  const paths = getProjectPaths(projectId);
  const current = readMetadataWithRecovery(paths);

  if (!current) {
    throw new Error("El proyecto todavía no tiene metadata local.");
  }

  const next = {
    ...current,
    ...(changes && typeof changes === "object" ? changes : {}),
    projectId: current.projectId,
    projectName: Object.prototype.hasOwnProperty.call(changes, "projectName")
      ? normalizeProjectName(changes.projectName)
      : current.projectName,
    updatedAt: new Date().toISOString()
  };

  if (!Number.isInteger(next.documentCount) || next.documentCount < 0) {
    next.documentCount = 0;
  }

  writeJsonAtomic(paths.metadata, next);
  return Object.freeze({ ...next });
}

function setDocumentCount(projectId, count) {
  const numericCount = Number(count);
  if (!Number.isInteger(numericCount) || numericCount < 0) {
    throw new Error("La cantidad de documentos debe ser un entero igual o mayor que cero.");
  }

  return updateProjectMetadata(projectId, { documentCount: numericCount });
}

function resolveProjectRelativePath(projectId, relativePath) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new TypeError("La ruta relativa del archivo es obligatoria.");
  }

  const paths = getProjectPaths(projectId);
  const normalizedRelative = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolute = path.resolve(paths.root, normalizedRelative);
  const rootWithSeparator = `${path.resolve(paths.root)}${path.sep}`;

  if (absolute !== path.resolve(paths.root) && !absolute.startsWith(rootWithSeparator)) {
    const error = new Error("La ruta solicitada está fuera de la carpeta del proyecto.");
    error.code = "UNSAFE_PROJECT_PATH";
    throw error;
  }

  return absolute;
}

module.exports = {
  initializeProjectStorage,
  getStoragePaths,
  getProjectPaths,
  ensureProjectStructure,
  readProjectMetadata,
  updateProjectMetadata,
  setDocumentCount,
  resolveProjectRelativePath,
  normalizeProjectId
};
