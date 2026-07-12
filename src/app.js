"use strict";

async function showApplicationStatus() {
  const statusElement = document.getElementById("technical-status");
  const versionElement = document.getElementById("app-version");

  if (!statusElement || !versionElement) {
    return;
  }

  if (
    !window.IpcService ||
    !window.ProyectosService ||
    !window.ProyectosState
  ) {
    statusElement.textContent = "No se cargaron los servicios de la aplicación";
    versionElement.textContent = "Revisa el orden de los scripts en index.html.";
    return;
  }

  try {
    const [info, projects, types, summary] = await Promise.all([
      window.IpcService.getAppInfo(),
      window.ProyectosService.listar(),
      window.ProyectosService.listarTipos(),
      window.ProyectosService.obtenerResumen()
    ]);

    window.ProyectosState.setProjects(projects);
    window.ProyectosState.setTypes(types);
    window.ProyectosState.setSummary(summary);

    statusElement.textContent = "Electron y la base local están conectados";
    versionElement.textContent = [
      `Versión ${info.version}`,
      `Electron ${info.versions.electron}`,
      `${summary.total} proyecto${summary.total === 1 ? "" : "s"}`,
      `${types.length} tipo${types.length === 1 ? "" : "s"}`
    ].join(" · ");
  } catch (error) {
    console.error("No fue posible comprobar los servicios de la aplicación:", error);
    statusElement.textContent = "No se pudo conectar con la base local";
    versionElement.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void showApplicationStatus();
}, { once: true });
