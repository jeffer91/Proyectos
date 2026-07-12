"use strict";

(function exposeProyectosPage(global) {
  function text(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
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
      "ProyectoPage",
      "ProyectoEditModal",
      "ProyectoDocuments",
      "Pagination",
      "StatusBadge",
      "ProgressBar",
      "Modal",
      "AppDates",
      "AppCurrency",
      "AppValidators",
      "AppFormatters"
    ].every((name) => Boolean(global[name]));
  }

  async function initialize() {
    const listView = document.getElementById("projects-list-view");
    const detailView = document.getElementById("project-detail-view");
    const statusElement = document.getElementById("technical-status");
    const newProjectButton = document.getElementById("new-project-button");
    const tableBody = document.getElementById("projects-table-body");
    const paginationContainer = document.getElementById("pagination-container");

    if (
      !listView ||
      !detailView ||
      !tableBody ||
      !paginationContainer ||
      !requiredModulesAvailable()
    ) {
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

    let refreshData = async () => {};

    const detailPage = global.ProyectoPage.create({
      root: detailView,
      async onBack() {
        detailPage.close();
        listView.hidden = false;
        global.ProyectosState.selectProject(null);
        await refreshData();
      },
      async onProjectChanged() {
        await refreshData();
      }
    });

    const table = global.ProyectosTable.create({
      body: tableBody,
      onSort(field) {
        global.ProyectosState.toggleSort(field);
      },
      async onOpen(project) {
        try {
          global.ProyectosState.selectProject(project.id);
          listView.hidden = true;
          detailView.hidden = false;
          const snapshot = global.ProyectosState.getSnapshot();
          await detailPage.open(project.id, snapshot.types);
        } catch (error) {
          console.error("No fue posible abrir el proyecto:", error);
          detailPage.close();
          listView.hidden = false;
          setTechnicalStatus(error.message, true);
        }
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
      if (!statusElement) return;
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

      if (newProjectButton) newProjectButton.disabled = snapshot.loading;
    }

    global.ProyectosState.subscribe(render);

    refreshData = async function refreshProjectsData() {
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
    };

    newProjectButton?.addEventListener("click", () => {
      const snapshot = global.ProyectosState.getSnapshot();
      global.ProyectoCreateModal.open({
        types: snapshot.types,
        async onCreated() {
          await refreshData();
        }
      });
    });

    listView.hidden = false;
    detailView.hidden = true;
    await refreshData();
  }

  Object.defineProperty(global, "ProyectosPage", {
    value: Object.freeze({ initialize }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
