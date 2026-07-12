"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");

const CHANNELS = Object.freeze({
  GET_APP_INFO: "app:obtener-informacion",
  GET_WINDOW_STATE: "ventana:obtener-estado",
  MINIMIZE: "ventana:minimizar",
  TOGGLE_MAXIMIZE: "ventana:maximizar-restaurar",
  CLOSE: "ventana:cerrar"
});

function serializeError(error) {
  return {
    code: typeof error?.code === "string" ? error.code : "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Ocurrió un error inesperado."
  };
}

function safeHandler(channel, callback) {
  return async (event, ...args) => {
    try {
      const data = await callback(event, ...args);
      return { ok: true, data };
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

function getSenderWindow(event) {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window || window.isDestroyed()) {
    const error = new Error("No se encontró la ventana de la aplicación.");
    error.code = "WINDOW_NOT_FOUND";
    throw error;
  }

  return window;
}

function getWindowState(window) {
  return {
    maximized: window.isMaximized(),
    minimized: window.isMinimized(),
    fullScreen: window.isFullScreen(),
    visible: window.isVisible()
  };
}

function registerVentanaIpc() {
  registerHandler(CHANNELS.GET_APP_INFO, () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    versions: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  }));

  registerHandler(CHANNELS.GET_WINDOW_STATE, (event) =>
    getWindowState(getSenderWindow(event))
  );

  registerHandler(CHANNELS.MINIMIZE, (event) => {
    const window = getSenderWindow(event);
    window.minimize();
    return getWindowState(window);
  });

  registerHandler(CHANNELS.TOGGLE_MAXIMIZE, (event) => {
    const window = getSenderWindow(event);

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }

    return getWindowState(window);
  });

  registerHandler(CHANNELS.CLOSE, (event) => {
    const window = getSenderWindow(event);
    setImmediate(() => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    return true;
  });

  return function unregisterVentanaIpc() {
    for (const channel of Object.values(CHANNELS)) {
      ipcMain.removeHandler(channel);
    }
  };
}

module.exports = {
  CHANNELS,
  registerVentanaIpc
};
