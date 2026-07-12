"use strict";

const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const {
  initializeDatabase,
  closeDatabase
} = require("./services/database-service");
const { registerProyectosIpc } = require("./ipc/proyectos-ipc");
const { registerArchivosIpc } = require("./ipc/archivos-ipc");
const { registerVentanaIpc } = require("./ipc/ventana-ipc");

let mainWindow = null;
let isQuitting = false;
let applicationReady = false;
let unregisterIpcHandlers = null;

function registerApplicationIpc() {
  if (unregisterIpcHandlers) {
    return;
  }

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

  void mainWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const currentUrl = mainWindow?.webContents.getURL();

    if (currentUrl && url !== currentUrl) {
      event.preventDefault();

      if (/^https?:\/\//i.test(url)) {
        void shell.openExternal(url);
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startApplication() {
  try {
    initializeDatabase({ userDataPath: app.getPath("userData") });
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

app.whenReady().then(() => {
  void startApplication();

  app.on("activate", () => {
    if (
      applicationReady &&
      BrowserWindow.getAllWindows().length === 0 &&
      !isQuitting
    ) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  applicationReady = false;

  if (unregisterIpcHandlers) {
    unregisterIpcHandlers();
  }

  closeDatabase();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  console.error("Error no controlado en el proceso principal:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin controlar en el proceso principal:", reason);
});
