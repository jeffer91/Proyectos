"use strict";

const fs = require("fs");
const { ipcMain, shell } = require("electron");
const proyectosRepository = require("../../database/repositories/proyectos-repository");
const tiposRepository = require("../../database/repositories/tipos-repository");
const hitosRepository = require("../../database/repositories/hitos-repository");
const {
  ensureProjectStructure,
  getProjectPaths
} = require("../services/project-storage-service");

const CHANNELS = Object.freeze({
  LIST_PROJECTS: "proyectos:listar",
  GET_PROJECT: "proyectos:obtener",
  CREATE_PROJECT: "proyectos:crear",
  UPDATE_PROJECT: "proyectos:actualizar",
  DELETE_PROJECT: "proyectos:eliminar",
  GET_SUMMARY: "proyectos:resumen",
  LIST_TYPES: "tipos:listar",
  CREATE_TYPE: "tipos:crear",
  RENAME_TYPE: "tipos:renombrar",
  LIST_MILESTONES: "hitos:listar",
  GET_MILESTONE: "hitos:obtener",
  CREATE_MILESTONE: "hitos:crear",
  UPDATE_MILESTONE: "hitos:actualizar",
  DELETE_MILESTONE: "hitos:eliminar"
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
      return { ok: true, data: await callback(...args) };
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

function requireProjectId(value) {
  return requireTextId(value, "El identificador del proyecto");
}

function requireMilestoneId(value) {
  return requireTextId(value, "El identificador del hito");
}

function pickProjectChanges(value) {
  const source = value && typeof value === "object" ? value : {};
  const allowedFields = [
    "nombre",
    "tipoId",
    "estado",
    "fechaInicio",
    "aporteEsperadoCentavos",
    "aporteRecibidoCentavos",
    "archivado"
  ];
  const result = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = source[field];
  }
  return result;
}

function pickMilestoneChanges(value) {
  const source = value && typeof value === "object" ? value : {};
  const allowedFields = ["titulo", "descripcion", "fechaObjetivo", "avance"];
  const result = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) result[field] = source[field];
  }
  return result;
}

async function removeProjectAndStorage(projectId) {
  const normalizedId = requireProjectId(projectId);
  const project = proyectosRepository.findById(normalizedId);
  if (!project) return { removed: false, storageWarning: null };

  const projectRoot = getProjectPaths(normalizedId).root;
  const stagedRoot = `${projectRoot}.deleting-${Date.now()}`;
  let storageStaged = false;

  if (fs.existsSync(projectRoot)) {
    fs.renameSync(projectRoot, stagedRoot);
    storageStaged = true;
  }

  try {
    const removed = proyectosRepository.remove(normalizedId);
    if (!removed) {
      if (storageStaged && fs.existsSync(stagedRoot)) fs.renameSync(stagedRoot, projectRoot);
      return { removed: false, storageWarning: null };
    }
  } catch (error) {
    if (storageStaged && fs.existsSync(stagedRoot)) {
      try {
        fs.renameSync(stagedRoot, projectRoot);
      } catch (restoreError) {
        console.error("No se pudo restaurar la carpeta del proyecto:", restoreError);
      }
    }
    throw error;
  }

  let storageWarning = null;
  if (storageStaged && fs.existsSync(stagedRoot)) {
    try {
      await shell.trashItem(stagedRoot);
    } catch (trashError) {
      storageWarning =
        "El proyecto se eliminó de la base, pero su carpeta no pudo enviarse a la Papelera.";
      console.error(storageWarning, trashError);
    }
  }

  return { removed: true, storageWarning };
}

function registerProyectosIpc() {
  registerHandler(CHANNELS.LIST_PROJECTS, (options = {}) =>
    proyectosRepository.list({
      includeCompleted: options?.includeCompleted === true,
      includeArchived: options?.includeArchived === true
    })
  );

  registerHandler(CHANNELS.GET_PROJECT, (projectId) => {
    const project = proyectosRepository.findById(requireProjectId(projectId));
    if (project) ensureProjectStructure({ projectId: project.id, projectName: project.nombre });
    return project;
  });

  registerHandler(CHANNELS.CREATE_PROJECT, (payload = {}) => {
    const project = proyectosRepository.create({
      nombre: payload?.nombre,
      tipoId: payload?.tipoId,
      fechaInicio: payload?.fechaInicio
    });

    try {
      ensureProjectStructure({ projectId: project.id, projectName: project.nombre });
      return project;
    } catch (error) {
      proyectosRepository.remove(project.id);
      throw error;
    }
  });

  registerHandler(CHANNELS.UPDATE_PROJECT, (projectId, changes = {}) => {
    const project = proyectosRepository.update(
      requireProjectId(projectId),
      pickProjectChanges(changes)
    );
    ensureProjectStructure({ projectId: project.id, projectName: project.nombre });
    return project;
  });

  registerHandler(CHANNELS.DELETE_PROJECT, removeProjectAndStorage);
  registerHandler(CHANNELS.GET_SUMMARY, () => proyectosRepository.getSummary());
  registerHandler(CHANNELS.LIST_TYPES, () => tiposRepository.list());
  registerHandler(CHANNELS.CREATE_TYPE, (name) => tiposRepository.create(name));
  registerHandler(CHANNELS.RENAME_TYPE, (typeId, name) => tiposRepository.rename(typeId, name));

  registerHandler(CHANNELS.LIST_MILESTONES, (projectId) =>
    hitosRepository.listByProject(requireProjectId(projectId))
  );
  registerHandler(CHANNELS.GET_MILESTONE, (milestoneId) =>
    hitosRepository.findById(requireMilestoneId(milestoneId))
  );
  registerHandler(CHANNELS.CREATE_MILESTONE, (payload = {}) =>
    hitosRepository.create({
      proyectoId: requireProjectId(payload?.proyectoId),
      titulo: payload?.titulo,
      descripcion: payload?.descripcion,
      fechaObjetivo: payload?.fechaObjetivo,
      avance: payload?.avance ?? 0
    })
  );
  registerHandler(CHANNELS.UPDATE_MILESTONE, (milestoneId, changes = {}) =>
    hitosRepository.update(
      requireMilestoneId(milestoneId),
      pickMilestoneChanges(changes)
    )
  );
  registerHandler(CHANNELS.DELETE_MILESTONE, (milestoneId) =>
    hitosRepository.remove(requireMilestoneId(milestoneId))
  );

  return function unregisterProyectosIpc() {
    for (const channel of Object.values(CHANNELS)) ipcMain.removeHandler(channel);
  };
}

module.exports = { CHANNELS, registerProyectosIpc };
