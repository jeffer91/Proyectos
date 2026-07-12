"use strict";

const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("path");
const {
  initializeDatabase,
  closeDatabase
} = require("./services/database-service");

let mainWindow = null;
let isQuitting = false;

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

  mainWindow.loadFile(path.join(__dirname, "..", "src", "index.html"));

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
    createMainWindow();
  } catch (error) {
    console.error("No se pudo iniciar la base de datos:", error);

    dialog.showErrorBox(
      "No se pudo iniciar Proyectos",
      `La base de datos local no pudo prepararse.\n\n${error.message}`
    );

    app.quit();
  }
}

app.whenReady().then(() => {
  void startApplication();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && !isQuitting) {
      createMainWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
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
