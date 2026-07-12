"use strict";

(function exposeProyectosService(global) {
  function requireIpcService() {
    const service = global.IpcService;

    if (!service || typeof service.call !== "function") {
      const error = new Error("IpcService debe cargarse antes que ProyectosService.");
      error.code = "IPC_SERVICE_NOT_LOADED";
      throw error;
    }

    return service;
  }

  function normalizeListOptions(options = {}) {
    return {
      includeCompleted: options?.includeCompleted === true,
      includeArchived: options?.includeArchived === true
    };
  }

  function normalizeProjectPayload(payload = {}) {
    return {
      nombre: payload?.nombre,
      tipoId: payload?.tipoId,
      fechaInicio: payload?.fechaInicio
    };
  }

  const service = Object.freeze({
    listar(options = {}) {
      return requireIpcService().call(
        "proyectos",
        "listar",
        normalizeListOptions(options)
      );
    },

    obtener(projectId) {
      return requireIpcService().call("proyectos", "obtener", projectId);
    },

    crear(payload) {
      return requireIpcService().call(
        "proyectos",
        "crear",
        normalizeProjectPayload(payload)
      );
    },

    actualizar(projectId, changes) {
      return requireIpcService().call(
        "proyectos",
        "actualizar",
        projectId,
        changes && typeof changes === "object" ? changes : {}
      );
    },

    eliminar(projectId) {
      return requireIpcService().call("proyectos", "eliminar", projectId);
    },

    obtenerResumen() {
      return requireIpcService().call("proyectos", "obtenerResumen");
    },

    listarTipos() {
      return requireIpcService().call("tipos", "listar");
    },

    crearTipo(name) {
      return requireIpcService().call("tipos", "crear", name);
    },

    renombrarTipo(typeId, name) {
      return requireIpcService().call("tipos", "renombrar", typeId, name);
    },

    listarArchivos(projectId) {
      return requireIpcService().call(
        "archivos",
        "listarPorProyecto",
        projectId
      );
    },

    obtenerArchivo(fileId) {
      return requireIpcService().call("archivos", "obtener", fileId);
    },

    registrarArchivo(metadata) {
      return requireIpcService().call("archivos", "registrar", metadata);
    },

    eliminarArchivo(fileId) {
      return requireIpcService().call("archivos", "eliminar", fileId);
    }
  });

  Object.defineProperty(global, "ProyectosService", {
    value: service,
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
