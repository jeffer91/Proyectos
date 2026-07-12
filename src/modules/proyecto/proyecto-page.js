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

  function createField(labelText, control) {
    const label = document.createElement("label");
    label.className = "field";
    const labelSpan = document.createElement("span");
    labelSpan.className = "field-label";
    labelSpan.textContent = labelText;
    label.append(labelSpan, control);
    return label;
  }

  function create({ root, onBack, onProjectChanged } = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("ProyectoPage requiere un contenedor válido.");
    }

    let currentProject = null;
    let currentTypes = [];
    let milestones = [];
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
    subtitle.textContent = "Información general, hitos, aporte y documentos.";

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
          messageText: `“${currentProject.nombre}” dejará de mostrarse en la lista principal. Sus datos, hitos y documentos se conservarán.`,
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
          messageText: `Se eliminará “${currentProject.nombre}” junto con sus hitos. Sus documentos se enviarán a la Papelera.`,
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
      createStatCard("Avance", "detail-progress-value", "Promedio de los hitos"),
      createStatCard("Próxima fecha", "detail-next-date", "Hito pendiente más cercano"),
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
    informationHint.textContent = "Los hitos recalculan el avance y la próxima fecha.";
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

    const milestonesPanel = document.createElement("section");
    milestonesPanel.className = "panel project-milestones-panel";
    const milestonesBody = document.createElement("div");
    milestonesBody.className = "project-milestones-body";
    const milestonesHeader = document.createElement("div");
    milestonesHeader.className = "project-milestones-header";
    const milestonesHeading = document.createElement("div");
    const milestonesTitle = document.createElement("h2");
    milestonesTitle.className = "panel-title";
    milestonesTitle.textContent = "Hitos y avances";
    const milestonesSubtitle = document.createElement("p");
    milestonesSubtitle.className = "text-muted project-section-subtitle";
    milestonesSubtitle.textContent = "Cada hito aporta por igual al avance general del proyecto.";
    milestonesHeading.append(milestonesTitle, milestonesSubtitle);
    const addMilestoneButton = createButton(
      "Nuevo hito",
      "button button-primary",
      () => openMilestoneModal()
    );
    milestonesHeader.append(milestonesHeading, addMilestoneButton);
    const milestonesMessage = document.createElement("p");
    milestonesMessage.className = "project-documents-message";
    milestonesMessage.hidden = true;
    milestonesMessage.setAttribute("role", "status");
    const milestonesList = document.createElement("div");
    milestonesList.className = "project-milestones-list";
    milestonesBody.append(milestonesHeader, milestonesMessage, milestonesList);
    milestonesPanel.append(milestonesBody);

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

    container.append(
      header,
      summary,
      informationPanel,
      milestonesPanel,
      documentsPanel,
      statusBanner
    );
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
      addMilestoneButton.disabled = busy;
      statusText.textContent = message || (busy ? "Procesando..." : "Proyecto listo");
      statusText.classList.remove("is-error");
    }

    function showError(error) {
      statusText.textContent = error?.message || "No se pudo completar la operación.";
      statusText.classList.add("is-error");
    }

    function showMilestoneMessage(message, isError = false) {
      milestonesMessage.textContent = message || "";
      milestonesMessage.hidden = !message;
      milestonesMessage.classList.toggle("is-error", isError);
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
      progressLabel.textContent = milestones.length > 0
        ? `Avance automático · ${milestones.length} hito${milestones.length === 1 ? "" : "s"}`
        : "Avance general";
      progressHost.append(progressLabel, global.ProgressBar.create(project.avance));
      statusText.textContent = "Proyecto listo";
      statusText.classList.remove("is-error");
    }

    function milestoneStatus(milestone) {
      if (milestone.avance === 100) return "Completado";
      if (global.AppDates.isOverdue(milestone.fechaObjetivo)) return "Vencido";
      if (milestone.avance > 0) return "En proceso";
      return "Pendiente";
    }

    function renderMilestones() {
      milestonesList.replaceChildren();

      if (milestones.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state compact-empty-state";
        const emptyTitle = document.createElement("h3");
        emptyTitle.className = "empty-state-title";
        emptyTitle.textContent = "Este proyecto todavía no tiene hitos";
        const emptyText = document.createElement("p");
        emptyText.className = "empty-state-text";
        emptyText.textContent = "Crea el primer hito para calcular el avance y la próxima fecha automáticamente.";
        empty.append(emptyTitle, emptyText);
        milestonesList.append(empty);
        return;
      }

      for (const milestone of milestones) {
        const item = document.createElement("article");
        item.className = "milestone-item";
        if (milestone.avance === 100) item.classList.add("is-complete");
        if (milestone.avance < 100 && global.AppDates.isOverdue(milestone.fechaObjetivo)) {
          item.classList.add("is-overdue");
        }

        const main = document.createElement("div");
        main.className = "milestone-main";
        const header = document.createElement("div");
        header.className = "milestone-item-header";
        const milestoneTitle = document.createElement("strong");
        milestoneTitle.className = "milestone-title";
        milestoneTitle.textContent = milestone.titulo;
        const badge = document.createElement("span");
        badge.className = "milestone-status";
        badge.textContent = milestoneStatus(milestone);
        header.append(milestoneTitle, badge);

        const date = document.createElement("span");
        date.className = "milestone-date";
        date.textContent = `Fecha objetivo: ${global.AppDates.formatDate(milestone.fechaObjetivo)}`;

        const description = document.createElement("p");
        description.className = "milestone-description";
        description.textContent = milestone.descripcion || "Sin descripción.";

        const progress = global.ProgressBar.create(milestone.avance);
        main.append(header, date, description, progress);

        const actions = document.createElement("div");
        actions.className = "milestone-actions";
        actions.append(
          createButton("Editar", "button button-secondary button-small", () => {
            openMilestoneModal(milestone);
          })
        );

        if (milestone.avance < 100) {
          actions.append(
            createButton("Completar", "button button-secondary button-small", async () => {
              try {
                setBusy(true, "Completando hito...");
                await global.ProyectosService.actualizarHito(milestone.id, { avance: 100 });
                await refreshMilestones("Hito marcado como completado.");
              } catch (error) {
                showMilestoneMessage(error.message, true);
              } finally {
                setBusy(false);
              }
            })
          );
        }

        actions.append(
          createButton("Eliminar", "button button-text-danger button-small", () => {
            confirmAction({
              titleText: "Eliminar hito",
              messageText: `Se eliminará “${milestone.titulo}” y el avance general se recalculará.`,
              confirmLabel: "Eliminar hito",
              async action() {
                await global.ProyectosService.eliminarHito(milestone.id);
                await refreshMilestones("Hito eliminado.");
              }
            });
          })
        );

        item.append(main, actions);
        milestonesList.append(item);
      }
    }

    function openMilestoneModal(milestone = null) {
      if (!currentProject || busy) return;

      const form = document.createElement("form");
      form.className = "milestone-form";
      form.noValidate = true;

      const titleInput = document.createElement("input");
      titleInput.className = "input";
      titleInput.type = "text";
      titleInput.maxLength = 160;
      titleInput.required = true;
      titleInput.value = milestone?.titulo || "";
      titleInput.placeholder = "Ejemplo: Terminar el prototipo";

      const descriptionInput = document.createElement("textarea");
      descriptionInput.className = "input milestone-description-input";
      descriptionInput.maxLength = 2000;
      descriptionInput.rows = 4;
      descriptionInput.value = milestone?.descripcion || "";
      descriptionInput.placeholder = "Descripción breve del resultado esperado";

      const dateInput = document.createElement("input");
      dateInput.className = "input";
      dateInput.type = "date";
      dateInput.required = true;
      dateInput.value = milestone?.fechaObjetivo || currentProject.proximaFecha || "";

      const progressInput = document.createElement("input");
      progressInput.className = "input";
      progressInput.type = "number";
      progressInput.min = "0";
      progressInput.max = "100";
      progressInput.step = "1";
      progressInput.value = String(milestone?.avance ?? 0);

      const error = document.createElement("p");
      error.className = "form-error";
      error.hidden = true;
      error.setAttribute("role", "alert");

      form.append(
        createField("Título", titleInput),
        createField("Descripción", descriptionInput),
        createField("Fecha objetivo", dateInput),
        createField("Avance del hito (%)", progressInput),
        error
      );

      function showFormError(message) {
        error.textContent = message;
        error.hidden = false;
      }

      let modal = null;
      const saveLabel = milestone ? "Guardar cambios" : "Crear hito";

      async function save(event) {
        const button = event.currentTarget;
        error.hidden = true;

        try {
          const validatedTitle = global.AppValidators.assertValid(
            global.AppValidators.validateRequiredText(titleInput.value, {
              label: "El título del hito",
              maxLength: 160
            })
          );
          const validatedDate = global.AppValidators.assertValid(
            global.AppValidators.validateDate(dateInput.value, { required: true })
          );
          const validatedProgress = global.AppValidators.assertValid(
            global.AppValidators.validateProgress(progressInput.value)
          );

          button.disabled = true;
          button.textContent = "Guardando...";

          const payload = {
            titulo: validatedTitle,
            descripcion: descriptionInput.value.trim(),
            fechaObjetivo: validatedDate,
            avance: validatedProgress
          };

          if (milestone) {
            await global.ProyectosService.actualizarHito(milestone.id, payload);
          } else {
            await global.ProyectosService.crearHito({
              proyectoId: currentProject.id,
              ...payload
            });
          }

          await refreshMilestones(milestone ? "Hito actualizado." : "Hito creado.");
          return true;
        } catch (saveError) {
          showFormError(saveError.message);
          button.disabled = false;
          button.textContent = saveLabel;
          return false;
        }
      }

      modal = global.Modal.create({
        title: milestone ? "Editar hito" : "Nuevo hito",
        content: form,
        actions: [
          { label: "Cancelar", className: "button button-secondary" },
          { label: saveLabel, className: "button button-primary", onClick: save }
        ],
        onOpen() {
          titleInput.focus();
        },
        onClose() {
          window.setTimeout(() => modal?.destroy(), 0);
        }
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        modal.dialog.querySelector(".button-primary")?.click();
      });
      modal.open();
    }

    async function refreshMilestones(message = "") {
      if (!currentProject) return;

      const projectId = currentProject.id;
      const [project, projectMilestones] = await Promise.all([
        global.ProyectosService.obtener(projectId),
        global.ProyectosService.listarHitos(projectId)
      ]);

      if (!project) throw new Error("No se encontró el proyecto.");
      currentProject = project;
      milestones = projectMilestones;
      renderProject(project);
      renderMilestones();
      if (message) showMilestoneMessage(message);

      if (typeof onProjectChanged === "function") {
        await onProjectChanged(project);
      }
    }

    async function open(projectId, types = []) {
      currentTypes = Array.isArray(types) ? types.slice() : [];
      root.hidden = false;
      setBusy(true, "Cargando proyecto...");

      try {
        const [project, projectMilestones] = await Promise.all([
          global.ProyectosService.obtener(projectId),
          global.ProyectosService.listarHitos(projectId)
        ]);
        if (!project) throw new Error("No se encontró el proyecto seleccionado.");

        currentProject = project;
        milestones = projectMilestones;
        renderProject(project);
        renderMilestones();
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
      milestones = [];
      documents.clear();
      milestonesList.replaceChildren();
      showMilestoneMessage("");
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
