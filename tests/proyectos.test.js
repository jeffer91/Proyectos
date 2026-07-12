"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const dates = require("../src/utils/dates");
const currency = require("../src/utils/currency");
const formatters = require("../src/utils/formatters");
const projectStorage = require("../electron/services/project-storage-service");
const fileStorage = require("../electron/services/file-storage-service");

test("formatea fechas, moneda y tamaños de archivo", () => {
  assert.equal(dates.localDateString(new Date(2026, 6, 12)), "2026-07-12");
  assert.equal(dates.daysUntil("2026-07-15", new Date(2026, 6, 12)), 3);
  assert.equal(currency.parseCurrencyToCents("$1.250,50"), 125050);
  assert.equal(currency.parseCurrencyToCents("$1,250.50"), 125050);
  assert.equal(currency.parseCurrencyToCents("1250.5"), 125050);
  assert.equal(currency.parseCurrencyToCents(""), 0);
  assert.equal(currency.parseCurrencyToCents("valor inválido"), null);
  assert.equal(currency.parseCurrencyToCents("-10"), null);
  assert.match(currency.formatCurrency(125050), /1[.,]250/);
  assert.equal(formatters.formatFileSize(1024), "1 KB");
  assert.equal(formatters.statusLabel("en_proceso"), "En proceso");
});

test("crea la estructura privada e importa un PDF sin sobrescribir", async (t) => {
  const userDataPath = await fsp.mkdtemp(path.join(os.tmpdir(), "proyectos-test-"));
  t.after(async () => fsp.rm(userDataPath, { recursive: true, force: true }));

  projectStorage.initializeProjectStorage({ userDataPath });
  const structure = projectStorage.ensureProjectStructure({
    projectId: "project-test-1",
    projectName: "Proyecto de prueba"
  });

  assert.equal(fs.existsSync(structure.paths.documents), true);
  assert.equal(fs.existsSync(structure.paths.backups), true);
  assert.equal(fs.existsSync(structure.paths.metadata), true);

  const sourcePath = path.join(userDataPath, "Informe final.pdf");
  await fsp.writeFile(sourcePath, "%PDF-1.4\nprueba", "utf8");

  const first = await fileStorage.importDocument({
    projectId: "project-test-1",
    projectName: "Proyecto de prueba",
    sourcePath
  });
  const second = await fileStorage.importDocument({
    projectId: "project-test-1",
    projectName: "Proyecto de prueba",
    sourcePath
  });

  assert.equal(first.extension, "pdf");
  assert.equal(first.hashSha256.length, 64);
  assert.notEqual(first.nombreGuardado, second.nombreGuardado);
  assert.equal(fs.existsSync(first.absolutePath), true);
  assert.equal(fs.existsSync(second.absolutePath), true);
});

test("bloquea extensiones no permitidas y rutas fuera del proyecto", async (t) => {
  const userDataPath = await fsp.mkdtemp(path.join(os.tmpdir(), "proyectos-safe-test-"));
  t.after(async () => fsp.rm(userDataPath, { recursive: true, force: true }));

  projectStorage.initializeProjectStorage({ userDataPath });
  projectStorage.ensureProjectStructure({
    projectId: "project-safe-1",
    projectName: "Proyecto seguro"
  });

  assert.throws(
    () => fileStorage.validateAllowedDocument("archivo.exe"),
    /Solo se permiten/
  );
  assert.throws(
    () => projectStorage.resolveProjectRelativePath("project-safe-1", "../fuera.pdf"),
    /fuera de la carpeta/
  );
});
