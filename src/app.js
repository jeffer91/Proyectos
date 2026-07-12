"use strict";

document.addEventListener(
  "DOMContentLoaded",
  () => {
    if (!window.ProyectosPage || typeof window.ProyectosPage.initialize !== "function") {
      const status = document.getElementById("technical-status");
      if (status) {
        status.textContent = "No se pudo cargar la pantalla de Proyectos";
        status.classList.add("is-error");
      }
      return;
    }

    void window.ProyectosPage.initialize();
  },
  { once: true }
);
