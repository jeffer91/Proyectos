"use strict";

(function exposeProyectosState(global) {
  const VALID_PAGE_SIZES = new Set([10, 25, 50, "all"]);
  const VALID_SORT_DIRECTIONS = new Set(["asc", "desc"]);
  const listeners = new Set();

  function createDefaultFilters() {
    return {
      search: "",
      typeId: null,
      status: "",
      dateFrom: "",
      dateTo: "",
      economic: "todos",
      includeCompleted: false,
      includeArchived: false,
      quickFilter: "custom"
    };
  }

  function createDefaultSummary() {
    return {
      total: 0,
      activos: 0,
      proximosAVencer: 0,
      aporteEsperadoCentavos: 0,
      aporteRecibidoCentavos: 0
    };
  }

  const state = {
    projects: [],
    types: [],
    summary: createDefaultSummary(),
    filters: createDefaultFilters(),
    sort: {
      field: "proximaFecha",
      direction: "asc"
    },
    pagination: {
      page: 1,
      pageSize: 10
    },
    selectedProjectId: null,
    loading: false,
    error: null
  };

  function clone(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
  }

  function getSnapshot() {
    return Object.freeze(clone(state));
  }

  function notify() {
    const snapshot = getSnapshot();

    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Error en un suscriptor de ProyectosState:", error);
      }
    }
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? clone(value) : [];
  }

  function assignArray(key, value) {
    state[key] = normalizeArray(value);
    notify();
  }

  function normalizePage(value) {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }

  function setSort(field, direction = "asc") {
    if (typeof field !== "string" || !field.trim()) {
      throw new Error("El campo de ordenamiento es obligatorio.");
    }

    const normalizedDirection = VALID_SORT_DIRECTIONS.has(direction)
      ? direction
      : "asc";

    state.sort = {
      field: field.trim(),
      direction: normalizedDirection
    };
    state.pagination.page = 1;
    notify();
  }

  const store = Object.freeze({
    getSnapshot,

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("El suscriptor debe ser una función.");
      }

      listeners.add(listener);
      listener(getSnapshot());

      return () => {
        listeners.delete(listener);
      };
    },

    replaceData({ projects = [], types = [], summary = {} } = {}) {
      state.projects = normalizeArray(projects);
      state.types = normalizeArray(types);
      state.summary = {
        ...createDefaultSummary(),
        ...(summary && typeof summary === "object" ? summary : {})
      };
      notify();
    },

    setProjects(projects) {
      assignArray("projects", projects);
    },

    setTypes(types) {
      assignArray("types", types);
    },

    setSummary(summary = {}) {
      state.summary = {
        ...createDefaultSummary(),
        ...(summary && typeof summary === "object" ? summary : {})
      };
      notify();
    },

    setFilters(changes = {}) {
      const source = changes && typeof changes === "object" ? changes : {};
      state.filters = {
        ...state.filters,
        ...source,
        search: Object.prototype.hasOwnProperty.call(source, "search")
          ? String(source.search ?? "").trimStart()
          : state.filters.search,
        includeCompleted: Object.prototype.hasOwnProperty.call(
          source,
          "includeCompleted"
        )
          ? source.includeCompleted === true
          : state.filters.includeCompleted,
        includeArchived: Object.prototype.hasOwnProperty.call(
          source,
          "includeArchived"
        )
          ? source.includeArchived === true
          : state.filters.includeArchived,
        quickFilter: Object.prototype.hasOwnProperty.call(source, "quickFilter")
          ? String(source.quickFilter || "custom")
          : state.filters.quickFilter
      };
      state.pagination.page = 1;
      notify();
    },

    resetFilters() {
      state.filters = createDefaultFilters();
      state.pagination.page = 1;
      notify();
    },

    setSort,

    toggleSort(field) {
      const nextDirection =
        state.sort.field === field && state.sort.direction === "asc" ? "desc" : "asc";
      setSort(field, nextDirection);
    },

    setPage(page) {
      state.pagination.page = normalizePage(page);
      notify();
    },

    setPageSize(pageSize) {
      const normalized = pageSize === "all" ? "all" : Number(pageSize);

      if (!VALID_PAGE_SIZES.has(normalized)) {
        throw new Error("La cantidad de filas por página no es válida.");
      }

      state.pagination.pageSize = normalized;
      state.pagination.page = 1;
      notify();
    },

    selectProject(projectId) {
      state.selectedProjectId =
        typeof projectId === "string" && projectId.trim() ? projectId.trim() : null;
      notify();
    },

    setLoading(value) {
      const nextValue = value === true;
      if (state.loading === nextValue) return;
      state.loading = nextValue;
      notify();
    },

    setError(error) {
      if (!error) {
        state.error = null;
      } else {
        state.error = {
          code: typeof error.code === "string" ? error.code : "UNKNOWN_ERROR",
          message: error instanceof Error ? error.message : String(error)
        };
      }

      notify();
    },

    clear() {
      state.projects = [];
      state.types = [];
      state.summary = createDefaultSummary();
      state.filters = createDefaultFilters();
      state.sort = { field: "proximaFecha", direction: "asc" };
      state.pagination = { page: 1, pageSize: 10 };
      state.selectedProjectId = null;
      state.loading = false;
      state.error = null;
      notify();
    }
  });

  Object.defineProperty(global, "ProyectosState", {
    value: store,
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
