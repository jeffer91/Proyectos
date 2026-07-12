"use strict";

const { contextBridge } = require("electron");

const appInfo = Object.freeze({
  platform: process.platform,
  versions: Object.freeze({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  })
});

contextBridge.exposeInMainWorld("proyectosAPI", Object.freeze({
  getAppInfo: () => appInfo
}));
