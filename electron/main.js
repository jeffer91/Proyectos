"use strict";

const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const {
  initializeDatabase,
  closeDatabase
} = require("./services/database-service");
const { initializeProjectStorage } = require("./services/project-storage-service");
const { registerProyectosIpc } = require("./ipc/proyectos-ipc");
const { registerArchivosIpc } = require("./ipc/archivos-ipc");
const { registerVentanaIpc } = require("./ipc/ventana-ipc");

const hasSingleInstanceLock = app.requestSingleInstanceLock();

let mainWindow = null;
let isQuitting = false;
let applicationReady = false;
let unregisterIpcHandlers = null;

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function registerApplicationIpc() {
  if (unregisterIpcHandlers) return;

  const unregisterCallbacks = [
    registerProyectosIpc(),
    registerArchivosIpc(),
    registerVentanaIpc()
  ];

  unregisterIpcHandlers = () => {
    for (const unregister of unregisterCallbacks.reverse()) {
      try {
        unregister();
      } catch (error) {
        console.error("No se pudo retirar un grupo de canales IPC:", error);
      }
    }
    unregisterIpcHandlers = null;
  };
}

function handleWindowLoadFailure(error) {
  console.error("No se pudo cargar la interfaz principal:", error);

  if (!isQuitting) {
    dialog.showErrorBox(
      "No se pudo abrir Proyectos",
      `La interfaz de la aplicación no pudo cargarse.\n\n${error.message}`
    );
  }

  app.quit();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#f5f7fb",
    title: "Proyectos",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  void mainWindow
    .loadFile(path.join(__dirname, "..", "src", "index.html"))
    .catch(handleWindowLoadFailure);

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && url !== currentUrl) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("El proceso de la interfaz terminó inesperadamente:", details);

    if (!isQuitting) {
      dialog.showErrorBox(
        "La interfaz dejó de funcionar",
        "Proyectos debe cerrarse para proteger la información local. Vuelve a abrir la aplicación."
      );
      app.quit();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startApplication() {
  try {
    const userDataPath = app.getPath("userData");
    initializeDatabase({ userDataPath });
    initializeProjectStorage({ userDataPath });
    registerApplicationIpc();
    applicationReady = true;
    createMainWindow();
  } catch (error) {
    console.error("No se pudo iniciar la aplicación:", error);
    dialog.showErrorBox(
      "No se pudo iniciar Proyectos",
      `La aplicación no pudo preparar sus servicios locales.\n\n${error.message}`
    );
    app.quit();
  }
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    void startApplication();

    app.on("activate", () => {
      if (applicationReady && BrowserWindow.getAllWindows().length === 0 && !isQuitting) {
        createMainWindow();
      } else {
        focusMainWindow();
      }
    });
  });

  app.on("before-quit", () => {
    isQuitting = true;
    applicationReady = false;
    if (unregisterIpcHandlers) unregisterIpcHandlers();
    closeDatabase();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

process.on("uncaughtException", (error) => {
  console.error("Error no controlado en el proceso principal:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin controlar en el proceso principal:", reason);
});
