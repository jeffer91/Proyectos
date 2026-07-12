"use strict";

(function exposeProyectosPage(global) {
  function text(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(value);
    }
  }

  function requiredModulesAvailable() {
    return [
      "IpcService",
      "ProyectosService",
      "ProyectosState",
      "ProyectosFilters",
      "ProyectosStats",
      "ProyectosTable",
      "ProyectoCreateModal",
      "Pagination",
      "StatusBadge",
      "ProgressBar",
      "Modal"
    ].every((name) => Boolean(global[name]));
  }

  function createProjectPreview(project) {
    const content = document.createElement("div");
    content.className = "project-preview";

    const note = document.createElement("p");
    note.className = "text-muted";
    note.textContent =
      "La pantalla interna de este proyecto se construirá en la siguiente etapa. La fila ya queda preparada para abrirla.";

    const details = document.createElement("dl");
    details.className = "project-preview-grid";

    const values = [
      ["Tipo", project.tipoNombre || "—"],
      ["Estado", String(project.estado || "").replaceAll("_", " ")],
      ["Fecha de inicio", global.ProyectosTable.formatDate(project.fechaInicio)],
      ["Próxima fecha", global.ProyectosTable.formatDate(project.proximaFecha)],
      ["Aporte esperado", global.ProyectosTable.formatCurrency(project.aporteEsperadoCentavos)],
      ["Aporte recibido", global.ProyectosTable.formatCurrency(project.aporteRecibidoCentavos)]
    ];

    for (const [label, value] of values) {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value;
      wrapper.append(term, definition);
      details.append(wrapper);
    }

    const progressTitle = document.createElement("span");
    progressTitle.className = "field-label";
    progressTitle.textContent = "Avance";

    const progress = global.ProgressBar.create(project.avance);
    content.append(note, details, progressTitle, progress);
    return content;
  }

  async function initialize() {
    const statusElement = document.getElementById("technical-status");
    const newProjectButton = document.getElementById("new-project-button");
    const tableBody = document.getElementById("projects-table-body");
    const paginationContainer = document.getElementById("pagination-container");

    if (!requiredModulesAvailable()) {
      if (statusElement) {
        statusElement.textContent = "No se cargaron todos los módulos de la pantalla";
        statusElement.classList.add("is-error");
      }
      return;
    }

    const filters = global.ProyectosFilters.create({
      onChange(values) {
        global.ProyectosState.setFilters(values);
      }
    });

    const stats = global.ProyectosStats.create({
      onSelect(name) {
        filters.applyQuickFilter(name);
      }
    });

    const table = global.ProyectosTable.create({
      body: tableBody,
      onSort(field) {
        global.ProyectosState.toggleSort(field);
      },
      onOpen(project) {
        global.ProyectosState.selectProject(project.id);
        let previewModal = null;
        previewModal = global.Modal.create({
          title: project.nombre,
          content: createProjectPreview(project),
          actions: [{ label: "Cerrar", className: "button button-secondary" }],
          onClose() {
            window.setTimeout(() => previewModal?.destroy(), 0);
          }
        });
        previewModal.open();
      }
    });

    const pagination = global.Pagination.create({
      container: paginationContainer,
      onPageChange(page) {
        global.ProyectosState.setPage(page);
      },
      onPageSizeChange(pageSize) {
        global.ProyectosState.setPageSize(pageSize);
      }
    });

    function setTechnicalStatus(message, isError = false) {
      if (!statusElement) {
        return;
      }

      statusElement.textContent = message;
      statusElement.classList.toggle("is-error", isError);
    }

    function render(snapshot) {
      filters.populateTypes(snapshot.types);

      const filtered = global.ProyectosFilters.apply(snapshot.projects, snapshot.filters);
      const sorted = global.ProyectosTable.sort(filtered, snapshot.sort);
      const pageSize = snapshot.pagination.pageSize;
      const totalPages = pageSize === "all"
        ? 1
        : Math.max(1, Math.ceil(sorted.length / pageSize));

      if (snapshot.pagination.page > totalPages) {
        global.ProyectosState.setPage(totalPages);
        return;
      }

      const start = pageSize === "all"
        ? 0
        : (snapshot.pagination.page - 1) * pageSize;
      const visible = pageSize === "all"
        ? sorted
        : sorted.slice(start, start + pageSize);

      table.render(visible, {
        hasProjects: snapshot.projects.length > 0,
        sortState: snapshot.sort
      });

      pagination.render({
        page: snapshot.pagination.page,
        pageSize,
        totalItems: sorted.length
      });

      stats.render(snapshot.summary, snapshot.filters.quickFilter || "custom");
      text(
        "project-count-label",
        `${filtered.length} proyecto${filtered.length === 1 ? "" : "s"}`
      );

      const firstVisible = sorted.length === 0 ? 0 : start + 1;
      const lastVisible = Math.min(start + visible.length, sorted.length);
      text(
        "table-result-label",
        sorted.length === 0
          ? "Sin resultados"
          : `Mostrando ${firstVisible}–${lastVisible} de ${sorted.length}`
      );

      if (newProjectButton) {
        newProjectButton.disabled = snapshot.loading;
      }
    }

    global.ProyectosState.subscribe(render);

    async function refreshData() {
      global.ProyectosState.setLoading(true);
      global.ProyectosState.setError(null);
      setTechnicalStatus("Actualizando proyectos...");

      try {
        const [info, projects, types, summary] = await Promise.all([
          global.IpcService.getAppInfo(),
          global.ProyectosService.listar({ includeCompleted: true }),
          global.ProyectosService.listarTipos(),
          global.ProyectosService.obtenerResumen()
        ]);

        global.ProyectosState.setProjects(projects);
        global.ProyectosState.setTypes(types);
        global.ProyectosState.setSummary(summary);
        text(
          "app-version",
          `Proyectos ${info.version} · Electron ${info.versions.electron} · Base local activa`
        );
        setTechnicalStatus("Electron, SQLite e interfaz conectados");
      } catch (error) {
        console.error("No fue posible cargar la pantalla de proyectos:", error);
        global.ProyectosState.setError(error);
        setTechnicalStatus("No se pudieron cargar los proyectos", true);
        text("app-version", error.message);
      } finally {
        global.ProyectosState.setLoading(false);
      }
    }

    newProjectButton?.addEventListener("click", () => {
      const snapshot = global.ProyectosState.getSnapshot();
      global.ProyectoCreateModal.open({
        types: snapshot.types,
        async onCreated() {
          await refreshData();
        }
      });
    });

    await refreshData();
  }

  Object.defineProperty(global, "ProyectosPage", {
    value: Object.freeze({ initialize }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
