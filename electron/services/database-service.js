"use strict";

const fs = require("fs");
const path = require("path");

let database = null;
let databasePath = null;

function loadDatabaseSync() {
  try {
    const { DatabaseSync } = require("node:sqlite");
    return DatabaseSync;
  } catch (error) {
    const wrappedError = new Error(
      "La versión de Electron instalada no incluye node:sqlite. Ejecuta npm install para actualizar Electron."
    );
    wrappedError.code = "SQLITE_NOT_AVAILABLE";
    wrappedError.cause = error;
    throw wrappedError;
  }
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function getMigrationsDirectory() {
  return path.join(__dirname, "..", "..", "database", "migrations");
}

function getMigrationFiles() {
  const migrationsDirectory = getMigrationsDirectory();

  if (!fs.existsSync(migrationsDirectory)) {
    throw new Error(`No existe la carpeta de migraciones: ${migrationsDirectory}`);
  }

  return fs
    .readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+[-_].+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function createMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nombre TEXT PRIMARY KEY,
      aplicado_en TEXT NOT NULL
    ) STRICT;
  `);
}

function getAppliedMigrations(db) {
  const rows = db.prepare("SELECT nombre FROM _migrations ORDER BY nombre").all();
  return new Set(rows.map((row) => row.nombre));
}

function applyMigration(db, fileName) {
  const migrationPath = path.join(getMigrationsDirectory(), fileName);
  const sql = fs.readFileSync(migrationPath, "utf8").trim();

  if (!sql) {
    throw new Error(`La migración ${fileName} está vacía.`);
  }

  const appliedAt = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE;");

  try {
    db.exec(sql);
    db.prepare("INSERT INTO _migrations (nombre, aplicado_en) VALUES (?, ?)").run(
      fileName,
      appliedAt
    );
    db.exec("COMMIT;");
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // La transacción puede haberse cerrado por el propio error de SQLite.
    }

    const wrappedError = new Error(`No se pudo aplicar la migración ${fileName}: ${error.message}`);
    wrappedError.code = "MIGRATION_FAILED";
    wrappedError.cause = error;
    throw wrappedError;
  }
}

function runMigrations(db) {
  createMigrationsTable(db);

  const appliedMigrations = getAppliedMigrations(db);
  const migrationFiles = getMigrationFiles();

  for (const fileName of migrationFiles) {
    if (!appliedMigrations.has(fileName)) {
      applyMigration(db, fileName);
    }
  }
}

function configureDatabase(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
  `);
}

function firstColumnValue(row) {
  if (!row || typeof row !== "object") return null;
  return Object.values(row)[0];
}

function verifyDatabaseIntegrity(db) {
  const quickCheckRows = db.prepare("PRAGMA quick_check").all();
  const quickCheckErrors = quickCheckRows
    .map(firstColumnValue)
    .filter((value) => String(value).toLowerCase() !== "ok");

  if (quickCheckErrors.length > 0) {
    const error = new Error(
      `La base local no superó la comprobación de integridad: ${quickCheckErrors.join("; ")}`
    );
    error.code = "DATABASE_INTEGRITY_FAILED";
    throw error;
  }

  const foreignKeyErrors = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyErrors.length > 0) {
    const error = new Error(
      `La base local contiene ${foreignKeyErrors.length} relación${foreignKeyErrors.length === 1 ? "" : "es"} inválida${foreignKeyErrors.length === 1 ? "" : "s"}.`
    );
    error.code = "DATABASE_FOREIGN_KEY_FAILED";
    error.details = foreignKeyErrors;
    throw error;
  }

  return true;
}

function initializeDatabase({ userDataPath } = {}) {
  if (database) {
    return database;
  }

  if (!userDataPath || typeof userDataPath !== "string" || !userDataPath.trim()) {
    throw new TypeError("initializeDatabase requiere una ruta userDataPath válida.");
  }

  const DatabaseSync = loadDatabaseSync();
  const databaseDirectory = path.join(userDataPath, "database");

  ensureDirectory(databaseDirectory);
  databasePath = path.join(databaseDirectory, "proyectos.db");

  const db = new DatabaseSync(databasePath);

  try {
    configureDatabase(db);
    runMigrations(db);
    verifyDatabaseIntegrity(db);
    database = db;
    return database;
  } catch (error) {
    try {
      db.close();
    } catch {
      // Evita ocultar el error original si el cierre también falla.
    }

    databasePath = null;
    throw error;
  }
}

function getDatabase() {
  if (!database) {
    throw new Error("La base de datos todavía no ha sido inicializada.");
  }

  return database;
}

function getDatabasePath() {
  return databasePath;
}

function closeDatabase() {
  if (!database) {
    return;
  }

  try {
    database.close();
  } finally {
    database = null;
    databasePath = null;
  }
}

function runInTransaction(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("runInTransaction requiere una función.");
  }

  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE;");

  try {
    const result = callback(db);

    if (result && typeof result.then === "function") {
      const error = new Error(
        "Las transacciones de la base local deben ejecutarse con una función sincrónica."
      );
      error.code = "ASYNC_TRANSACTION_NOT_SUPPORTED";
      throw error;
    }

    db.exec("COMMIT;");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // Conserva el error original.
    }

    throw error;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  getDatabasePath,
  closeDatabase,
  runInTransaction,
  verifyDatabaseIntegrity
};
