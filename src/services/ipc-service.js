"use strict";

(function exposeIpcService(global) {
  function createIpcError(payload) {
    const message = payload?.message || "No se pudo completar la operación.";
    const error = new Error(message);
    error.code = payload?.code || "IPC_ERROR";
    return error;
  }

  function getApi() {
    const api = global.proyectosAPI;

    if (!api || typeof api !== "object") {
      const error = new Error(
        "La interfaz no está conectada con Electron. Inicia la aplicación con npm start."
      );
      error.code = "IPC_NOT_AVAILABLE";
      throw error;
    }

    return api;
  }

  function resolveMethod(namespace, method) {
    const api = getApi();
    const group = api[namespace];
    const callback = group?.[method];

    if (typeof callback !== "function") {
      const error = new Error(`La función IPC ${namespace}.${method} no está disponible.`);
      error.code = "IPC_METHOD_NOT_AVAILABLE";
      throw error;
    }

    return callback;
  }

  async function call(namespace, method, ...args) {
    const callback = resolveMethod(namespace, method);
    const response = await callback(...args);

    if (!response || typeof response !== "object" || typeof response.ok !== "boolean") {
      const error = new Error("Electron devolvió una respuesta IPC no válida.");
      error.code = "INVALID_IPC_RESPONSE";
      throw error;
    }

    if (!response.ok) {
      throw createIpcError(response.error);
    }

    return response.data;
  }

  const service = Object.freeze({
    isAvailable() {
      return Boolean(global.proyectosAPI && typeof global.proyectosAPI === "object");
    },

    call,

    getAppInfo() {
      return call("app", "obtenerInformacion");
    },

    getWindowState() {
      return call("ventana", "obtenerEstado");
    },

    minimizeWindow() {
      return call("ventana", "minimizar");
    },

    toggleMaximizeWindow() {
      return call("ventana", "maximizarRestaurar");
    },

    closeWindow() {
      return call("ventana", "cerrar");
    }
  });

  Object.defineProperty(global, "IpcService", {
    value: service,
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
