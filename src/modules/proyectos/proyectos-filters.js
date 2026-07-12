"use strict";

(function exposeProyectosFilters(global) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function normalizeSearch(value) {
    if (global.AppFormatters?.normalizeSearchText) {
      return global.AppFormatters.normalizeSearchText(value);
    }

    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function localDateString(date = new Date()) {
    if (global.AppDates?.localDateString) {
      return global.AppDates.localDateString(date);
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function isDueSoon(project) {
    const value = project?.proximaFecha;
    if (!value || project.estado === "completado" || project.archivado === true) {
      return false;
    }

    if (global.AppDates?.daysUntil) {
      const days = global.AppDates.daysUntil(value);
      return Number.isInteger(days) && days >= 0 && days <= 7;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today.getTime() + (7 * DAY_MS));
    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime()) && date >= today && date <= limit;
  }

  function apply(projects, filters = {}) {
    const search = normalizeSearch(filters.search);
    const typeId = filters.typeId ? Number(filters.typeId) : null;
    const status = String(filters.status || "");
    const dateFrom = String(filters.dateFrom || "");
    const dateTo = String(filters.dateTo || "");
    const economic = String(filters.economic || "todos");
    const includeCompleted = filters.includeCompleted === true;
    const includeArchived = filters.includeArchived === true;
    const quickFilter = String(filters.quickFilter || "custom");

    return (Array.isArray(projects) ? projects : []).filter((project) => {
      if (!includeArchived && project.archivado === true) {
        return false;
      }

      if (
        !includeCompleted &&
        project.estado === "completado" &&
        status !== "completado"
      ) {
        return false;
      }

      if (search) {
        const haystack = normalizeSearch([
          project.nombre,
          project.tipoNombre,
          String(project.estado || "").replaceAll("_", " "),
          project.archivado ? "archivado" : ""
        ].join(" "));

        if (!haystack.includes(search)) {
          return false;
        }
      }

      if (typeId && Number(project.tipoId) !== typeId) {
        return false;
      }

      if (status && project.estado !== status) {
        return false;
      }

      const referenceDate = project.proximaFecha || project.fechaInicio || "";
      if (dateFrom && (!referenceDate || referenceDate < dateFrom)) {
        return false;
      }

      if (dateTo && (!referenceDate || referenceDate > dateTo)) {
        return false;
      }

      const expected = Number(project.aporteEsperadoCentavos || 0);
      const received = Number(project.aporteRecibidoCentavos || 0);

      if (economic === "con_aporte" && expected === 0 && received === 0) {
        return false;
      }

      if (economic === "sin_aporte" && (expected > 0 || received > 0)) {
        return false;
      }

      if (economic === "recibido" && received <= 0) {
        return false;
      }

      if (quickFilter === "dueSoon" && !isDueSoon(project)) {
        return false;
      }

      return true;
    });
  }

  function create({ onChange } = {}) {
    const elements = {
      search: document.getElementById("project-search"),
      type: document.getElementById("project-type-filter"),
      status: document.getElementById("project-status-filter"),
      dateFrom: document.getElementById("project-date-from"),
      dateTo: document.getElementById("project-date-to"),
      economic: document.getElementById("project-economic-filter"),
      completed: document.getElementById("project-completed-filter"),
      archived: document.getElementById("project-archived-filter"),
      clear: document.getElementById("clear-filters-button")
    };

    for (const [name, element] of Object.entries(elements)) {
      if (!(element instanceof HTMLElement)) {
        throw new Error(`No se encontró el control de filtros: ${name}.`);
      }
    }

    let quickFilter = "custom";
    let searchTimer = null;

    function getValues() {
      return {
        search: elements.search.value,
        typeId: elements.type.value ? Number(elements.type.value) : null,
        status: elements.status.value,
        dateFrom: elements.dateFrom.value,
        dateTo: elements.dateTo.value,
        economic: elements.economic.value,
        includeCompleted: elements.completed.checked,
        includeArchived: elements.archived.checked,
        quickFilter
      };
    }

    function emit({ preserveQuickFilter = false } = {}) {
      if (!preserveQuickFilter) {
        quickFilter = "custom";
      }

      if (typeof onChange === "function") {
        onChange(getValues());
      }
    }

    elements.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => emit(), 160);
    });

    for (const element of [
      elements.type,
      elements.status,
      elements.dateFrom,
      elements.dateTo,
      elements.economic,
      elements.completed,
      elements.archived
    ]) {
      element.addEventListener("change", () => {
        if (element === elements.status && elements.status.value === "completado") {
          elements.completed.checked = true;
        }
        emit();
      });
    }

    function reset({ emitChange = true } = {}) {
      window.clearTimeout(searchTimer);
      elements.search.value = "";
      elements.type.value = "";
      elements.status.value = "";
      elements.dateFrom.value = "";
      elements.dateTo.value = "";
      elements.economic.value = "todos";
      elements.completed.checked = false;
      elements.archived.checked = false;
      quickFilter = "custom";

      if (emitChange) {
        emit({ preserveQuickFilter: true });
      }
    }

    elements.clear.addEventListener("click", () => reset());

    function populateTypes(types) {
      const selected = elements.type.value;
      elements.type.replaceChildren();

      const allOption = document.createElement("option");
      allOption.value = "";
      allOption.textContent = "Todos los tipos";
      elements.type.append(allOption);

      for (const type of Array.isArray(types) ? types : []) {
        const option = document.createElement("option");
        option.value = String(type.id);
        option.textContent = type.nombre;
        elements.type.append(option);
      }

      if (Array.from(elements.type.options).some((option) => option.value === selected)) {
        elements.type.value = selected;
      }
    }

    function applyQuickFilter(name) {
      reset({ emitChange: false });
      quickFilter = name;

      if (name === "total") {
        elements.completed.checked = true;
        elements.archived.checked = true;
      } else if (name === "expected") {
        elements.completed.checked = true;
        elements.economic.value = "con_aporte";
      } else if (name === "received") {
        elements.completed.checked = true;
        elements.economic.value = "recibido";
      }

      emit({ preserveQuickFilter: true });
    }

    return Object.freeze({
      getValues,
      populateTypes,
      reset,
      applyQuickFilter
    });
  }

  Object.defineProperty(global, "ProyectosFilters", {
    value: Object.freeze({ create, apply, isDueSoon, localDateString }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
