"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertContains(source, value, label) {
  assert.match(
    source,
    new RegExp(escapeRegExp(value)),
    `${label} debe contener el canal ${value}`
  );
}

test("preload e IPC comparten todos los canales expuestos", () => {
  const preload = read("electron/preload.js");
  const ipcSource = [
    read("electron/ipc/proyectos-ipc.js"),
    read("electron/ipc/archivos-ipc.js"),
    read("electron/ipc/ventana-ipc.js")
  ].join("\n");

  const channels = [
    "app:obtener-informacion",
    "proyectos:listar",
    "proyectos:obtener",
    "proyectos:crear",
    "proyectos:actualizar",
    "proyectos:eliminar",
    "proyectos:resumen",
    "tipos:listar",
    "tipos:crear",
    "tipos:renombrar",
    "hitos:listar",
    "hitos:obtener",
    "hitos:crear",
    "hitos:actualizar",
    "hitos:eliminar",
    "archivos:listar-por-proyecto",
    "archivos:obtener",
    "archivos:importar",
    "archivos:abrir",
    "archivos:mostrar-en-carpeta",
    "archivos:abrir-carpeta-proyecto",
    "archivos:respaldar",
    "archivos:eliminar",
    "ventana:obtener-estado",
    "ventana:minimizar",
    "ventana:maximizar-restaurar",
    "ventana:cerrar"
  ];

  for (const channel of channels) {
    assertContains(preload, channel, "preload.js");
    assertContains(ipcSource, channel, "los controladores IPC");
  }
});

test("la interfaz carga utilidades, servicios, módulos y aplicación en orden", () => {
  const html = read("src/index.html");
  const scripts = [
    "./utils/dates.js",
    "./utils/currency.js",
    "./utils/validators.js",
    "./utils/formatters.js",
    "./components/modal.js",
    "./components/status-badge.js",
    "./components/progress-bar.js",
    "./components/pagination.js",
    "./services/ipc-service.js",
    "./modules/proyectos/proyectos-service.js",
    "./modules/proyectos/proyectos-state.js",
    "./modules/proyectos/proyectos-filters.js",
    "./modules/proyectos/proyectos-stats.js",
    "./modules/proyectos/proyectos-table.js",
    "./modules/proyectos/proyecto-create-modal.js",
    "./modules/proyecto/proyecto-edit-modal.js",
    "./modules/proyecto/proyecto-documents.js",
    "./modules/proyecto/proyecto-page.js",
    "./modules/proyectos/proyectos-page.js",
    "./app.js"
  ];

  let previousIndex = -1;
  for (const script of scripts) {
    const currentIndex = html.indexOf(script);
    assert.notEqual(currentIndex, -1, `Falta cargar ${script}`);
    assert.ok(currentIndex > previousIndex, `${script} está fuera del orden requerido`);
    previousIndex = currentIndex;
  }
});

test("Electron prepara base, almacenamiento e IPC antes de crear la ventana", () => {
  const main = read("electron/main.js");
  const databaseIndex = main.indexOf("initializeDatabase({ userDataPath })");
  const storageIndex = main.indexOf("initializeProjectStorage({ userDataPath })");
  const ipcIndex = main.indexOf("registerApplicationIpc()");
  const windowIndex = main.indexOf("createMainWindow()", ipcIndex);

  assert.ok(databaseIndex >= 0, "Falta inicializar la base local");
  assert.ok(storageIndex > databaseIndex, "El almacenamiento debe iniciar después de la base");
  assert.ok(ipcIndex > storageIndex, "Los canales IPC deben registrarse después del almacenamiento");
  assert.ok(windowIndex > ipcIndex, "La ventana debe crearse al final del inicio");
  assert.match(main, /requestSingleInstanceLock\(\)/);
});

test("el servicio de interfaz conserva las conexiones de cada proceso", () => {
  const service = read("src/modules/proyectos/proyectos-service.js");
  const requiredCalls = [
    ["proyectos", "listar"],
    ["proyectos", "crear"],
    ["proyectos", "actualizar"],
    ["proyectos", "eliminar"],
    ["tipos", "listar"],
    ["tipos", "crear"],
    ["hitos", "listar"],
    ["hitos", "crear"],
    ["hitos", "actualizar"],
    ["hitos", "eliminar"],
    ["archivos", "listarPorProyecto"],
    ["archivos", "importar"],
    ["archivos", "abrir"],
    ["archivos", "respaldar"],
    ["archivos", "eliminar"]
  ];

  for (const [namespace, method] of requiredCalls) {
    assert.match(
      service,
      new RegExp(`call\\(\\s*["']${namespace}["']\\s*,\\s*["']${method}["']`),
      `Falta la conexión ${namespace}.${method}`
    );
  }
});
