"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const databaseService = require("../electron/services/database-service");
const tiposRepository = require("../database/repositories/tipos-repository");
const proyectosRepository = require("../database/repositories/proyectos-repository");
const hitosRepository = require("../database/repositories/hitos-repository");
const archivosRepository = require("../database/repositories/archivos-repository");

test("migraciones, proyectos, hitos y archivos funcionan juntos", async (t) => {
  const userDataPath = await fsp.mkdtemp(path.join(os.tmpdir(), "proyectos-db-test-"));

  t.after(async () => {
    databaseService.closeDatabase();
    await fsp.rm(userDataPath, { recursive: true, force: true });
  });

  const db = databaseService.initializeDatabase({ userDataPath });
  const migrations = db
    .prepare("SELECT nombre FROM _migrations ORDER BY nombre")
    .all()
    .map((row) => row.nombre);

  assert.deepEqual(migrations, ["001-inicial.sql", "002-hitos.sql"]);
  assert.equal(databaseService.verifyDatabaseIntegrity(db), true);

  const type = tiposRepository.create("Desarrollo");
  const project = proyectosRepository.create({
    nombre: "Proyecto de prueba",
    tipoId: type.id,
    fechaInicio: "2026-07-01"
  });

  assert.equal(project.estado, "pendiente");
  assert.equal(project.avance, 0);
  assert.equal(project.proximaFecha, null);

  const firstMilestone = hitosRepository.create({
    proyectoId: project.id,
    titulo: "Diseño",
    descripcion: "Preparar el diseño inicial",
    fechaObjetivo: "2026-07-10",
    avance: 100
  });
  const secondMilestone = hitosRepository.create({
    proyectoId: project.id,
    titulo: "Implementación",
    fechaObjetivo: "2026-07-20",
    avance: 50
  });

  let updatedProject = proyectosRepository.findById(project.id);
  assert.equal(updatedProject.avance, 75);
  assert.equal(updatedProject.proximaFecha, "2026-07-20");

  hitosRepository.update(secondMilestone.id, { avance: 100 });
  updatedProject = proyectosRepository.findById(project.id);
  assert.equal(updatedProject.avance, 100);
  assert.equal(updatedProject.proximaFecha, null);

  proyectosRepository.update(project.id, {
    aporteEsperadoCentavos: 120000,
    aporteRecibidoCentavos: 50000
  });

  let summary = proyectosRepository.getSummary();
  assert.equal(summary.total, 1);
  assert.equal(summary.activos, 1);
  assert.equal(summary.aporteEsperadoCentavos, 120000);
  assert.equal(summary.aporteRecibidoCentavos, 50000);

  const file = archivosRepository.create({
    proyectoId: project.id,
    nombreOriginal: "Informe.pdf",
    nombreGuardado: "Informe.pdf",
    extension: "pdf",
    tipoMime: "application/pdf",
    rutaRelativa: "documents/Informe.pdf",
    tamanoBytes: 128,
    hashSha256: "a".repeat(64)
  });

  assert.equal(archivosRepository.listByProject(project.id).length, 1);
  assert.equal(archivosRepository.remove(file.id), true);
  assert.equal(archivosRepository.listByProject(project.id).length, 0);
  archivosRepository.restore(file);
  assert.equal(archivosRepository.listByProject(project.id).length, 1);

  proyectosRepository.update(project.id, { archivado: true });
  assert.equal(proyectosRepository.list().length, 0);
  assert.equal(
    proyectosRepository.list({ includeCompleted: true, includeArchived: true }).length,
    1
  );

  summary = proyectosRepository.getSummary();
  assert.equal(summary.total, 1);
  assert.equal(summary.activos, 0);
  assert.equal(summary.aporteEsperadoCentavos, 0);
  assert.equal(summary.aporteRecibidoCentavos, 0);

  assert.throws(
    () => databaseService.runInTransaction(async () => true),
    (error) => error?.code === "ASYNC_TRANSACTION_NOT_SUPPORTED"
  );

  assert.equal(hitosRepository.findById(firstMilestone.id)?.proyectoId, project.id);
  assert.equal(proyectosRepository.remove(project.id), true);
  assert.equal(hitosRepository.findById(firstMilestone.id), null);
  assert.equal(archivosRepository.findById(file.id), null);
  assert.equal(databaseService.verifyDatabaseIntegrity(db), true);
});
