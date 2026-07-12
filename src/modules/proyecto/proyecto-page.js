"use strict";

(function exposeProyectoPage(global) {
  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function createDefinition(labelText, valueElement) {
    const wrapper = document.createElement("div");
    wrapper.className = "project-detail-item";
    const term = document.createElement("dt");
    term.textContent = labelText;
    const definition = document.createElement("dd");
    if (valueElement instanceof Node) definition.append(valueElement);
    else definition.textContent = valueElement ?? "—";
    wrapper.append(term, definition);
    return wrapper;
  }

  function createStatCard(labelText, valueId, hintText) {
    const card = document.createElement("article");
    card.className = "project-summary-card";
    const label = document.createElement("span");
    label.className = "stat-label";
    label.textContent = labelText;
    const value = document.createElement("strong");
    value.className = "stat-value";
    value.id = valueId;
    value.textContent = "—";
    const hint = document.createElement("span");
    hint.className = "stat-hint";
    hint.textContent = hintText;
    card.append(label, value, hint);
    return card;
  }

  function create({ root, onBack, onProjectChanged } = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("ProyectoPage requiere un contenedor válido.");
    }

    let currentProject = null;
    let currentTypes = [];
    let busy = false;

    const container = document.createElement("div");
    container.className = "page-container content-stack project-detail-page";

    const backButton = createButton(
      "← Volver a proyectos",
      "button button-secondary project-back-button",
      () => {
        if (!busy && typeof onBack === "function") onBack();
      }
    );

    const title = document.createElement("h1");
    title.className = "page-title project-detail-title";
    title.textContent = "Proyecto";
    const subtitle = document.createElement("p");
    subtitle.className = "page-subtitle";
    subtitle.textContent = "Información general, avance, aporte y documentos.";

    const titleGroup = document.createElement("div");
    titleGroup.className = "project-detail-heading";
    titleGroup.append(backButton, title, subtitle);

    const editButton = createButton("Editar", "button button-primary", () => {
      if (!currentProject || busy) return;
      global.ProyectoEditModal.open({
        project: currentProject,
        types: currentTypes,
        async onSaved(updated) {
          currentProject = updated;
          renderProject(updated);
          await documents.load(updated);
          if (typeof onProjectChanged === "function") {
            await onProjectChanged(updated);
          }
        }
      });
    });

    const archiveButton = createButton(
      "Archivar",
      "button button-secondary",
      () => {
        if (!currentProject || busy) return;
        confirmAction({
          titleText: "Archivar proyecto",
          messageText: `“${currentProject.nombre}” dejará de mostrarse en la lista principal. Sus datos y documentos se conservarán.`,
          confirmLabel: "Archivar proyecto",
          async action() {
            await global.ProyectosService.actualizar(currentProject.id, { archivado: true });
            if (typeof onProjectChanged === "function") await onProjectChanged(null);
            if (typeof onBack === "function") onBack();
          }
        });
      }
    );

    const deleteButton = createButton(
      "Eliminar",
      "button button-text-danger",
      () => {
        if (!currentProject || busy) return;
        confirmAction({
          titleText: "Eliminar proyecto",
          messageText: `Se eliminará “${currentProject.nombre}” y sus documentos se enviarán a la Papelera. Esta acción no se puede deshacer desde la aplicación.`,
          confirmLabel: "Eliminar proyecto",
          async action() {
            await global.ProyectosService.eliminar(currentProject.id);
            if (typeof onProjectChanged === "function") await onProjectChanged(null);
            if (typeof onBack === "function") onBack();
          }
        });
      }
    );

    const headerActions = document.createElement("div");
    headerActions.className = "page-actions project-detail-actions";
    headerActions.append(editButton, archiveButton, deleteButton);

    const header = document.createElement("header");
    header.className = "page-header project-detail-header";
    header.append(titleGroup, headerActions);

    const summary = document.createElement("section");
    summary.className = "project-summary-grid";
    summary.setAttribute("aria-label", "Resumen del proyecto");
    summary.append(
      createStatCard("Avance", "detail-progress-value", "Progreso actual"),
      createStatCard("Próxima fecha", "detail-next-date", "Siguiente fecha registrada"),
      createStatCard("Aporte esperado", "detail-expected", "Valor total del proyecto"),
      createStatCard("Aporte recibido", "detail-received", "Dinero recibido hasta hoy")
    );

    const informationPanel = document.createElement("section");
    informationPanel.className = "panel project-information-panel";

    const informationHeader = document.createElement("div");
    informationHeader.className = "panel-header";
    const informationTitle = document.createElement("h2");
    informationTitle.className = "panel-title";
    informationTitle.textContent = "Información general";
    const informationHint = document.createElement("span");
    informationHint.className = "text-muted";
    informationHint.textContent = "La última actualización cambia automáticamente.";
    informationHeader.append(informationTitle, informationHint);

    const informationBody = document.createElement("div");
    informationBody.className = "project-information-body";
    const details = document.createElement("dl");
    details.className = "project-detail-grid";
    details.id = "project-detail-grid";
    const progressHost = document.createElement("div");
    progressHost.className = "project-progress-host";
    informationBody.append(details, progressHost);
    informationPanel.append(informationHeader, informationBody);

    const documentsPanel = document.createElement("section");
    documentsPanel.className = "panel project-documents-panel";
    const documentsHost = document.createElement("div");
    documentsHost.className = "project-documents-body";
    documentsPanel.append(documentsHost);

    const statusBanner = document.createElement("section");
    statusBanner.className = "service-banner project-detail-status";
    const statusText = document.createElement("span");
    statusText.className = "technical-status";
    statusText.textContent = "Proyecto listo";
    statusText.setAttribute("role", "status");
    const statusDetail = document.createElement("span");
    statusDetail.textContent = "Los cambios se guardan en la base local.";
    statusBanner.append(statusText, statusDetail);

    container.append(header, summary, informationPanel, documentsPanel, statusBanner);
    root.replaceChildren(container);

    const documents = global.ProyectoDocuments.create({
      container: documentsHost,
      onChanged(files) {
        statusDetail.textContent = `${files.length} documento${files.length === 1 ? "" : "s"} guardado${files.length === 1 ? "" : "s"} en este proyecto.`;
      }
    });

    function setText(id, value) {
      const element = root.querySelector(`#${id}`);
      if (element) element.textContent = String(value ?? "—");
    }

    function setBusy(value, message = "") {
      busy = value === true;
      editButton.disabled = busy;
      archiveButton.disabled = busy;
      deleteButton.disabled = busy;
      backButton.disabled = busy;
      statusText.textContent = message || (busy ? "Procesando..." : "Proyecto listo");
      statusText.classList.remove("is-error");
    }

    function showError(error) {
      statusText.textContent = error?.message || "No se pudo completar la operación.";
      statusText.classList.add("is-error");
    }

    function confirmAction({ titleText, messageText, confirmLabel, action }) {
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
                setBusy(true, "Procesando proyecto...");
                await action();
                return true;
              } catch (error) {
                showError(error);
                button.disabled = false;
                button.textContent = confirmLabel;
                setBusy(false);
                return false;
              }
            }
          }
        ],
        onClose() {
          if (busy) setBusy(false);
          window.setTimeout(() => modal?.destroy(), 0);
        }
      });
      modal.open();
    }

    function renderProject(project) {
      currentProject = project;
      title.textContent = project.nombre;
      subtitle.textContent = `${project.tipoNombre} · ${global.AppFormatters.statusLabel(project.estado)}`;

      setText("detail-progress-value", `${project.avance ?? 0} %`);
      setText("detail-next-date", global.AppDates.formatDate(project.proximaFecha));
      setText("detail-expected", global.AppCurrency.formatCurrency(project.aporteEsperadoCentavos));
      setText("detail-received", global.AppCurrency.formatCurrency(project.aporteRecibidoCentavos));

      details.replaceChildren(
        createDefinition("Tipo", project.tipoNombre),
        createDefinition("Estado", global.StatusBadge.create(project.estado)),
        createDefinition("Fecha de inicio", global.AppDates.formatDate(project.fechaInicio)),
        createDefinition("Próxima fecha", global.AppDates.formatDate(project.proximaFecha)),
        createDefinition(
          "Última actualización",
          global.AppDates.formatDate(project.ultimaActualizacion)
        ),
        createDefinition("Creado", global.AppDates.formatDate(project.creadoEn))
      );

      progressHost.replaceChildren();
      const progressLabel = document.createElement("span");
      progressLabel.className = "field-label";
      progressLabel.textContent = "Avance general";
      progressHost.append(progressLabel, global.ProgressBar.create(project.avance));
      statusText.textContent = "Proyecto listo";
      statusText.classList.remove("is-error");
    }

    async function open(projectId, types = []) {
      currentTypes = Array.isArray(types) ? types.slice() : [];
      root.hidden = false;
      setBusy(true, "Cargando proyecto...");

      try {
        const project = await global.ProyectosService.obtener(projectId);
        if (!project) throw new Error("No se encontró el proyecto seleccionado.");
        renderProject(project);
        await documents.load(project);
        setBusy(false);
        return project;
      } catch (error) {
        setBusy(false);
        showError(error);
        throw error;
      }
    }

    function close() {
      currentProject = null;
      currentTypes = [];
      documents.clear();
      root.hidden = true;
      setBusy(false);
    }

    root.hidden = true;
    return Object.freeze({ open, close, getCurrentProject: () => currentProject });
  }

  Object.defineProperty(global, "ProyectoPage", {
    value: Object.freeze({ create }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
