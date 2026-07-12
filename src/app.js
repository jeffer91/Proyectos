"use strict";

function showElectronStatus() {
  const statusElement = document.getElementById("technical-status");
  const versionElement = document.getElementById("app-version");

  if (!statusElement || !versionElement) {
    return;
  }

  const api = window.proyectosAPI;

  if (!api || typeof api.getAppInfo !== "function") {
    statusElement.textContent = "No se pudo conectar con Electron";
    versionElement.textContent = "Abre esta pantalla mediante npm start.";
    return;
  }

  try {
    const info = api.getAppInfo();

    statusElement.textContent = "Electron conectado correctamente";
    versionElement.textContent = [
      `Electron ${info.versions.electron}`,
      `Node ${info.versions.node}`,
      `Plataforma ${info.platform}`
    ].join(" · ");
  } catch (error) {
    console.error("No fue posible obtener la información de Electron:", error);
    statusElement.textContent = "Error al comprobar Electron";
    versionElement.textContent = "Revisa la consola de desarrollo para más detalles.";
  }
}

document.addEventListener("DOMContentLoaded", showElectronStatus, { once: true });
