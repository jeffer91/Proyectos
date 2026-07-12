"use strict";

const currencyFormatter = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function formatCurrency(cents) {
  const amount = Number(cents || 0) / 100;
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function isOverdue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  return value < localToday;
}

function createTextCell(primary, secondary = "") {
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

function createDateCell(value, options = {}) {
  const cell = document.createElement("td");
  const span = document.createElement("span");
  span.textContent = formatDate(value);

  if (options.highlightOverdue && isOverdue(value)) {
    span.className = "text-danger";
    span.title = "Fecha vencida";
  }

  cell.append(span);
  return cell;
}

function createContributionCell(project) {
  const expected = Number(project.aporteEsperadoCentavos || 0);
  const received = Number(project.aporteRecibidoCentavos || 0);

  if (expected === 0 && received === 0) {
    return createTextCell("—");
  }

  return createTextCell(
    `${formatCurrency(received)} / ${formatCurrency(expected)}`,
    "Recibido / esperado"
  );
}

function renderProjects(projects) {
  const body = document.getElementById("projects-table-body");

  if (!body) {
    return;
  }

  body.replaceChildren();

  if (!Array.isArray(projects) || projects.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;

    const empty = document.createElement("div");
    empty.className = "empty-state";

    const title = document.createElement("h3");
    title.className = "empty-state-title";
    title.textContent = "Todavía no hay proyectos";

    const text = document.createElement("p");
    text.className = "empty-state-text";
    text.textContent =
      "La estructura visual está lista. En el siguiente bloque podrás crear el primer proyecto desde esta pantalla.";

    empty.append(title, text);
    cell.append(empty);
    row.append(cell);
    body.append(row);
    return;
  }

  for (const project of projects.slice(0, 10)) {
    const row = document.createElement("tr");
    row.dataset.projectId = project.id;

    row.append(
      createTextCell(project.nombre),
      createTextCell(project.tipoNombre),
      (() => {
        const cell = document.createElement("td");
        cell.append(window.StatusBadge.create(project.estado));
        return cell;
      })(),
      createDateCell(project.fechaInicio),
      createDateCell(project.proximaFecha, { highlightOverdue: true }),
      createDateCell(project.ultimaActualizacion),
      createContributionCell(project),
      (() => {
        const cell = document.createElement("td");
        cell.append(window.ProgressBar.create(project.avance));
        return cell;
      })()
    );

    body.append(row);
  }
}

function renderSummary(summary, projectCount) {
  setText("stat-total", summary.total || 0);
  setText("stat-due-soon", summary.proximosAVencer || 0);
  setText("stat-expected", formatCurrency(summary.aporteEsperadoCentavos));
  setText("stat-received", formatCurrency(summary.aporteRecibidoCentavos));
  setText(
    "project-count-label",
    `${projectCount} proyecto${projectCount === 1 ? "" : "s"}`
  );
  setText(
    "table-result-label",
    projectCount > 10
      ? `Mostrando 10 de ${projectCount} proyectos`
      : `Mostrando ${projectCount} proyecto${projectCount === 1 ? "" : "s"}`
  );
}

async function initializeApplication() {
  const statusElement = document.getElementById("technical-status");

  if (
    !window.IpcService ||
    !window.ProyectosService ||
    !window.ProyectosState ||
    !window.StatusBadge ||
    !window.ProgressBar ||
    !window.Modal
  ) {
    if (statusElement) {
      statusElement.textContent = "No se cargaron todos los módulos de la aplicación";
      statusElement.classList.add("is-error");
    }
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

    renderSummary(summary, projects.length);
    renderProjects(projects);

    if (statusElement) {
      statusElement.textContent = "Electron, SQLite e interfaz conectados";
      statusElement.classList.remove("is-error");
    }

    setText(
      "app-version",
      `Proyectos ${info.version} · Electron ${info.versions.electron} · ${types.length} tipo${types.length === 1 ? "" : "s"}`
    );
  } catch (error) {
    console.error("No fue posible iniciar la pantalla de proyectos:", error);

    if (statusElement) {
      statusElement.textContent = "No se pudo conectar con los servicios locales";
      statusElement.classList.add("is-error");
    }

    setText("app-version", error.message);
    renderProjects([]);
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    void initializeApplication();
  },
  { once: true }
);
