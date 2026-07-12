"use strict";

const { contextBridge, ipcRenderer } = require("electron");

const appInfo = Object.freeze({
  platform: process.platform,
  versions: Object.freeze({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  })
});

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

const api = Object.freeze({
  getAppInfo: () => appInfo,

  app: Object.freeze({
    obtenerInformacion: () => invoke("app:obtener-informacion")
  }),

  proyectos: Object.freeze({
    listar: (options) => invoke("proyectos:listar", options),
    obtener: (projectId) => invoke("proyectos:obtener", projectId),
    crear: (payload) => invoke("proyectos:crear", payload),
    actualizar: (projectId, changes) =>
      invoke("proyectos:actualizar", projectId, changes),
    eliminar: (projectId) => invoke("proyectos:eliminar", projectId),
    obtenerResumen: () => invoke("proyectos:resumen")
  }),

  tipos: Object.freeze({
    listar: () => invoke("tipos:listar"),
    crear: (name) => invoke("tipos:crear", name),
    renombrar: (typeId, name) => invoke("tipos:renombrar", typeId, name)
  }),

  archivos: Object.freeze({
    listarPorProyecto: (projectId) =>
      invoke("archivos:listar-por-proyecto", projectId),
    obtener: (fileId) => invoke("archivos:obtener", fileId),
    registrar: (metadata) => invoke("archivos:registrar", metadata),
    importar: (projectId) => invoke("archivos:importar", projectId),
    abrir: (fileId) => invoke("archivos:abrir", fileId),
    mostrarEnCarpeta: (fileId) => invoke("archivos:mostrar-en-carpeta", fileId),
    abrirCarpetaProyecto: (projectId) =>
      invoke("archivos:abrir-carpeta-proyecto", projectId),
    respaldar: (fileId) => invoke("archivos:respaldar", fileId),
    eliminar: (fileId) => invoke("archivos:eliminar", fileId)
  }),

  ventana: Object.freeze({
    obtenerEstado: () => invoke("ventana:obtener-estado"),
    minimizar: () => invoke("ventana:minimizar"),
    maximizarRestaurar: () => invoke("ventana:maximizar-restaurar"),
    cerrar: () => invoke("ventana:cerrar")
  })
});

contextBridge.exposeInMainWorld("proyectosAPI", api);
