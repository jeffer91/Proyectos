"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { createHash } = require("crypto");
const {
  ensureProjectStructure,
  getProjectPaths,
  resolveProjectRelativePath
} = require("./project-storage-service");

const ALLOWED_EXTENSIONS = Object.freeze([".pdf", ".doc", ".docx"]);
const MIME_TYPES = Object.freeze({
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
});

function normalizeExtension(filePath) {
  return path.extname(String(filePath || "")).toLowerCase();
}

function validateAllowedDocument(filePath) {
  const extension = normalizeExtension(filePath);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    const error = new Error("Solo se permiten documentos PDF, DOC y DOCX.");
    error.code = "UNSUPPORTED_DOCUMENT_TYPE";
    throw error;
  }

  return extension;
}

function safeFileName(value) {
  const parsed = path.parse(String(value || ""));
  const extension = parsed.ext.toLowerCase();
  const base = parsed.name
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 180) || "documento";

  return `${base}${extension}`;
}

async function uniqueDestination(directoryPath, requestedName) {
  const parsed = path.parse(safeFileName(requestedName));
  let candidate = path.join(directoryPath, `${parsed.name}${parsed.ext}`);
  let counter = 2;

  while (true) {
    try {
      await fsp.access(candidate, fs.constants.F_OK);
      candidate = path.join(directoryPath, `${parsed.name} (${counter})${parsed.ext}`);
      counter += 1;
    } catch (error) {
      if (error?.code === "ENOENT") {
        return candidate;
      }
      throw error;
    }
  }
}

function hashFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function toProjectRelative(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

async function importDocument({ projectId, projectName, sourcePath } = {}) {
  if (typeof sourcePath !== "string" || !sourcePath.trim()) {
    throw new TypeError("La ruta del documento de origen es obligatoria.");
  }

  const absoluteSource = path.resolve(sourcePath);
  const extension = validateAllowedDocument(absoluteSource);
  const sourceStats = await fsp.stat(absoluteSource);

  if (!sourceStats.isFile()) {
    throw new Error("La ruta seleccionada no corresponde a un archivo.");
  }

  const { paths } = ensureProjectStructure({ projectId, projectName });
  const destination = await uniqueDestination(paths.documents, path.basename(absoluteSource));
  await fsp.copyFile(absoluteSource, destination, fs.constants.COPYFILE_EXCL);

  try {
    const [storedStats, hashSha256] = await Promise.all([
      fsp.stat(destination),
      hashFileSha256(destination)
    ]);

    return Object.freeze({
      proyectoId: projectId,
      nombreOriginal: path.basename(absoluteSource),
      nombreGuardado: path.basename(destination),
      extension: extension.slice(1),
      tipoMime: MIME_TYPES[extension],
      rutaRelativa: toProjectRelative(paths.root, destination),
      tamanoBytes: storedStats.size,
      hashSha256,
      absolutePath: destination
    });
  } catch (error) {
    await fsp.rm(destination, { force: true });
    throw error;
  }
}

async function removeImportedDocument(projectId, relativePath) {
  const absolutePath = resolveProjectRelativePath(projectId, relativePath);
  await fsp.rm(absolutePath, { force: true });
  return true;
}

async function backupDocument({ projectId, relativePath } = {}) {
  const source = resolveProjectRelativePath(projectId, relativePath);
  const paths = getProjectPaths(projectId);
  const stats = await fsp.stat(source);

  if (!stats.isFile()) {
    throw new Error("El documento que se desea respaldar no existe.");
  }

  const parsed = path.parse(source);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupName = `${parsed.name}-${timestamp}${parsed.ext}`;
  const destination = path.join(paths.backups, backupName);
  await fsp.copyFile(source, destination, fs.constants.COPYFILE_EXCL);

  return Object.freeze({
    nombreGuardado: backupName,
    rutaRelativa: toProjectRelative(paths.root, destination),
    tamanoBytes: stats.size
  });
}

function resolveStoredDocument({ projectId, relativePath } = {}) {
  return resolveProjectRelativePath(projectId, relativePath);
}

module.exports = {
  ALLOWED_EXTENSIONS,
  MIME_TYPES,
  validateAllowedDocument,
  safeFileName,
  hashFileSha256,
  importDocument,
  removeImportedDocument,
  backupDocument,
  resolveStoredDocument
};
