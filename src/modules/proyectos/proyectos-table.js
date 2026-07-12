"use strict";

(function exposeProyectosTable(global) {
  const fallbackCurrencyFormatter = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const fallbackDateFormatter = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  function formatCurrency(cents) {
    if (global.AppCurrency?.formatCurrency) return global.AppCurrency.formatCurrency(cents);
    const value = Number(cents || 0) / 100;
    return fallbackCurrencyFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(value) {
    if (global.AppDates?.formatDate) return global.AppDates.formatDate(value);
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : fallbackDateFormatter.format(date);
  }

  function isOverdue(value) {
    if (global.AppDates?.isOverdue) return global.AppDates.isOverdue(value);
    return Boolean(
      value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      value < global.ProyectosFilters.localDateString()
    );
  }

  function textCell(primary, secondary = "") {
    const cell = document.createElement("td");
    const main = document.createElement("span");
    main.className = "table-primary";
    main.textContent = primary || "—";
    cell.append(main);

    if (secondary) {
      const detail = document.createElement("span");
      detail.className = "table-secondary";
      detail.textContent = secondary;
      cell.append(detail);
    }
    return cell;
  }

  function dateCell(value, highlightOverdue = false) {
    const cell = document.createElement("td");
    const span = document.createElement("span");
    span.textContent = formatDate(value);
    if (highlightOverdue && isOverdue(value)) {
      span.className = "text-danger";
      span.title = "Fecha vencida";
    }
    cell.append(span);
    return cell;
  }

  function contributionCell(project) {
    const expected = Number(project.aporteEsperadoCentavos || 0);
    const received = Number(project.aporteRecibidoCentavos || 0);
    if (expected === 0 && received === 0) return textCell("—");
    return textCell(
      `${formatCurrency(received)} / ${formatCurrency(expected)}`,
      "Recibido / esperado"
    );
  }

  function sort(projects, { field = "proximaFecha", direction = "asc" } = {}) {
    const multiplier = direction === "desc" ? -1 : 1;
    const valueFor = (project) => {
      switch (field) {
        case "tipoNombre": return project.tipoNombre || "";
        case "estado": return project.estado || "";
        case "fechaInicio": return project.fechaInicio || null;
        case "ultimaActualizacion": return project.ultimaActualizacion || null;
        case "aporte": return Number(project.aporteEsperadoCentavos || 0);
        case "avance": return Number(project.avance || 0);
        case "nombre": return project.nombre || "";
        case "proximaFecha":
        default: return project.proximaFecha || null;
      }
    };

    return [...(Array.isArray(projects) ? projects : [])].sort((left, right) => {
      const a = valueFor(left);
      const b = valueFor(right);
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      if (typeof a === "number" && typeof b === "number") return (a - b) * multiplier;
      return String(a).localeCompare(String(b), "es", {
        numeric: true,
        sensitivity: "base"
      }) * multiplier;
    });
  }

  function create({ body, onOpen, onSort } = {}) {
    if (!(body instanceof HTMLElement)) {
      throw new TypeError("ProyectosTable requiere el cuerpo de una tabla.");
    }

    const sortButtons = Array.from(document.querySelectorAll("[data-sort-field]"));
    for (const button of sortButtons) {
      button.addEventListener("click", () => {
        if (typeof onSort === "function") onSort(button.dataset.sortField);
      });
    }

    function renderEmpty(message, detail) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const title = document.createElement("h3");
      title.className = "empty-state-title";
      title.textContent = message;
      const text = document.createElement("p");
      text.className = "empty-state-text";
      text.textContent = detail;
      empty.append(title, text);
      cell.append(empty);
      row.append(cell);
      body.append(row);
    }

    function render(projects, { hasProjects = false, sortState = {} } = {}) {
      body.replaceChildren();

      if (!Array.isArray(projects) || projects.length === 0) {
        renderEmpty(
          hasProjects ? "No hay resultados con estos filtros" : "Todavía no hay proyectos",
          hasProjects
            ? "Cambia o limpia los filtros para volver a mostrar proyectos."
            : "Pulsa “Nuevo proyecto” para crear el primero."
        );
      } else {
        for (const project of projects) {
          const row = document.createElement("tr");
          row.className = "project-row";
          row.classList.toggle("is-archived", project.archivado === true);
          row.dataset.projectId = project.id;
          row.tabIndex = 0;
          row.setAttribute("role", "button");
          row.setAttribute(
            "aria-label",
            `${project.archivado ? "Abrir proyecto archivado" : "Abrir proyecto"} ${project.nombre}`
          );

          const statusCell = document.createElement("td");
          statusCell.append(global.StatusBadge.create(project.estado));
          const progressCell = document.createElement("td");
          progressCell.append(global.ProgressBar.create(project.avance));

          row.append(
            textCell(project.nombre, project.archivado ? "Archivado" : ""),
            textCell(project.tipoNombre),
            statusCell,
            dateCell(project.fechaInicio),
            dateCell(
              project.proximaFecha,
              project.estado !== "completado" && project.archivado !== true
            ),
            dateCell(project.ultimaActualizacion),
            contributionCell(project),
            progressCell
          );

          const open = () => {
            if (typeof onOpen === "function") onOpen(project);
          };
          row.addEventListener("click", open);
          row.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              open();
            }
          });
          body.append(row);
        }
      }

      for (const button of sortButtons) {
        const active = button.dataset.sortField === sortState.field;
        button.classList.toggle("is-active", active);
        button.dataset.direction = active ? sortState.direction : "";
        button.setAttribute(
          "aria-sort",
          active ? (sortState.direction === "desc" ? "descending" : "ascending") : "none"
        );
      }
    }

    return Object.freeze({ render });
  }

  Object.defineProperty(global, "ProyectosTable", {
    value: Object.freeze({ create, sort, formatCurrency, formatDate }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
