"use strict";

(function exposeProyectoDocuments(global) {
  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function create({ container, onChanged } = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError("ProyectoDocuments requiere un contenedor válido.");
    }

    let currentProject = null;
    let files = [];
    let busy = false;

    const header = document.createElement("div");
    header.className = "project-documents-header";

    const headingGroup = document.createElement("div");
    const title = document.createElement("h2");
    title.className = "panel-title";
    title.textContent = "Documentos";
    const subtitle = document.createElement("p");
    subtitle.className = "text-muted project-section-subtitle";
    subtitle.textContent = "Archivos Word y PDF guardados dentro de este proyecto.";
    headingGroup.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "project-documents-actions";
    const folderButton = createButton(
      "Abrir carpeta",
      "button button-secondary",
      async () => {
        if (!currentProject || busy) return;
        try {
          await global.ProyectosService.abrirCarpetaDelProyecto(currentProject.id);
        } catch (error) {
          showMessage(error.message, true);
        }
      }
    );
    const addButton = createButton(
      "Agregar documentos",
      "button button-primary",
      async () => {
        if (!currentProject || busy) return;
        setBusy(true);
        showMessage("Selecciona uno o varios archivos PDF o Word.");
        try {
          const result = await global.ProyectosService.importarArchivos(currentProject.id);
          if (result.canceled) {
            showMessage("No se seleccionaron documentos.");
          } else {
            await load(currentProject);
            const imported = result.files.length;
            const failed = result.errors.length;
            showMessage(
              failed > 0
                ? `${imported} documento${imported === 1 ? "" : "s"} agregado${imported === 1 ? "" : "s"}. ${failed} no se pudo importar.`
                : `${imported} documento${imported === 1 ? "" : "s"} agregado${imported === 1 ? "" : "s"}.`,
              failed > 0
            );
          }
        } catch (error) {
          showMessage(error.message, true);
        } finally {
          setBusy(false);
        }
      }
    );
    actions.append(folderButton, addButton);
    header.append(headingGroup, actions);

    const message = document.createElement("p");
    message.className = "project-documents-message";
    message.hidden = true;
    message.setAttribute("role", "status");

    const list = document.createElement("div");
    list.className = "project-documents-list";
    container.replaceChildren(header, message, list);

    function setBusy(value) {
      busy = value === true;
      addButton.disabled = busy;
      folderButton.disabled = busy;
    }

    function showMessage(text, isError = false) {
      message.textContent = text || "";
      message.hidden = !text;
      message.classList.toggle("is-error", isError);
    }

    function confirmation({ titleText, messageText, confirmLabel, onConfirm }) {
      const content = document.createElement("p");
      content.className = "confirmation-text";
      content.textContent = messageText;
      let modal = null;

      modal = global.Modal.create({
        title: titleText,
        content,
        actions: [
          { label: "Cancelar", className: "button button-secondary" },
          {
            label: confirmLabel,
            className: "button button-danger",
            async onClick(event) {
              const button = event.currentTarget;
              try {
                button.disabled = true;
                button.textContent = "Procesando...";
                await onConfirm();
                return true;
              } catch (error) {
                showMessage(error.message, true);
                button.disabled = false;
                button.textContent = confirmLabel;
                return false;
              }
            }
          }
        ],
        onClose() {
          window.setTimeout(() => modal?.destroy(), 0);
        }
      });
      modal.open();
    }

    function fileIcon(extension) {
      const icon = document.createElement("span");
      icon.className = `document-icon document-${String(extension || "file").toLowerCase()}`;
      icon.textContent = String(extension || "archivo").toUpperCase();
      return icon;
    }

    function renderEmpty() {
      const empty = document.createElement("div");
      empty.className = "empty-state compact-empty-state";
      const emptyTitle = document.createElement("h3");
      emptyTitle.className = "empty-state-title";
      emptyTitle.textContent = "Este proyecto todavía no tiene documentos";
      const emptyText = document.createElement("p");
      emptyText.className = "empty-state-text";
      emptyText.textContent = "Pulsa “Agregar documentos” para guardar el primer PDF o archivo de Word.";
      empty.append(emptyTitle, emptyText);
      list.append(empty);
    }

    function render() {
      list.replaceChildren();
      if (files.length === 0) {
        renderEmpty();
        return;
      }

      for (const file of files) {
        const item = document.createElement("article");
        item.className = "document-item";

        const main = document.createElement("div");
        main.className = "document-main";
        const info = document.createElement("div");
        info.className = "document-info";
        const name = document.createElement("strong");
        name.className = "document-name";
        name.textContent = file.nombreOriginal || file.nombreGuardado;
        const metadata = document.createElement("span");
        metadata.className = "document-metadata";
        metadata.textContent = [
          global.AppFormatters.formatFileSize(file.tamanoBytes),
          global.AppDates.formatDate(file.creadoEn)
        ].join(" · ");
        info.append(name, metadata);
        main.append(fileIcon(file.extension), info);

        const itemActions = document.createElement("div");
        itemActions.className = "document-actions";
        itemActions.append(
          createButton("Abrir", "button button-secondary button-small", async () => {
            try {
              await global.ProyectosService.abrirArchivo(file.id);
            } catch (error) {
              showMessage(error.message, true);
            }
          }),
          createButton("Ubicación", "button button-secondary button-small", async () => {
            try {
              await global.ProyectosService.mostrarArchivoEnCarpeta(file.id);
            } catch (error) {
              showMessage(error.message, true);
            }
          }),
          createButton("Respaldar", "button button-secondary button-small", async () => {
            try {
              await global.ProyectosService.respaldarArchivo(file.id);
              showMessage(`Se creó un respaldo de “${file.nombreOriginal}”.`);
            } catch (error) {
              showMessage(error.message, true);
            }
          }),
          createButton("Eliminar", "button button-text-danger button-small", () => {
            confirmation({
              titleText: "Eliminar documento",
              messageText: `“${file.nombreOriginal}” se enviará a la Papelera del sistema.`,
              confirmLabel: "Eliminar documento",
              async onConfirm() {
                await global.ProyectosService.eliminarArchivo(file.id);
                await load(currentProject);
                showMessage("Documento enviado a la Papelera.");
              }
            });
          })
        );

        item.append(main, itemActions);
        list.append(item);
      }
    }

    async function load(project) {
      if (!project?.id) {
        throw new Error("No se recibió un proyecto válido para cargar documentos.");
      }

      currentProject = project;
      files = await global.ProyectosService.listarArchivos(project.id);
      render();

      if (typeof onChanged === "function") {
        onChanged(files.slice());
      }
      return files.slice();
    }

    function clear() {
      currentProject = null;
      files = [];
      showMessage("");
      render();
    }

    render();
    return Object.freeze({ load, clear, getFiles: () => files.slice() });
  }

  Object.defineProperty(global, "ProyectoDocuments", {
    value: Object.freeze({ create }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
