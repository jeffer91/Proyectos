"use strict";

(function exposeProyectoEditModal(global) {
  const STATES = Object.freeze([
    ["pendiente", "Pendiente"],
    ["en_proceso", "En proceso"],
    ["pausado", "Pausado"],
    ["completado", "Completado"]
  ]);

  function createField(labelText, control, helpText = "") {
    const label = document.createElement("label");
    label.className = "field";
    const labelSpan = document.createElement("span");
    labelSpan.className = "field-label";
    labelSpan.textContent = labelText;
    label.append(labelSpan, control);

    if (helpText) {
      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = helpText;
      label.append(help);
    }

    return label;
  }

  function createInput(type, value = "") {
    const input = document.createElement("input");
    input.className = "input";
    input.type = type;
    input.value = value ?? "";
    return input;
  }

  function createSelect(options, selectedValue) {
    const select = document.createElement("select");
    select.className = "select";

    for (const [value, label] of options) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = label;
      option.selected = String(value) === String(selectedValue);
      select.append(option);
    }

    return select;
  }

  function dollarsFromCents(cents) {
    const value = Number(cents || 0) / 100;
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  }

  function open({ project, types = [], onSaved } = {}) {
    if (!project?.id) {
      throw new Error("No se recibió un proyecto válido para editar.");
    }

    const form = document.createElement("form");
    form.className = "project-edit-form";
    form.noValidate = true;

    const nameInput = createInput("text", project.nombre);
    nameInput.maxLength = 160;
    nameInput.required = true;

    const typeSelect = createSelect(
      (Array.isArray(types) ? types : []).map((type) => [type.id, type.nombre]),
      project.tipoId
    );
    typeSelect.required = true;

    const statusSelect = createSelect(STATES, project.estado);
    const startDateInput = createInput("date", project.fechaInicio);
    startDateInput.required = true;

    const nextDateInput = createInput("date", project.proximaFecha || "");
    nextDateInput.disabled = true;

    const progressInput = createInput("number", String(project.avance ?? 0));
    progressInput.min = "0";
    progressInput.max = "100";
    progressInput.step = "1";
    progressInput.disabled = true;

    const expectedInput = createInput(
      "number",
      dollarsFromCents(project.aporteEsperadoCentavos)
    );
    expectedInput.min = "0";
    expectedInput.step = "0.01";

    const receivedInput = createInput(
      "number",
      dollarsFromCents(project.aporteRecibidoCentavos)
    );
    receivedInput.min = "0";
    receivedInput.step = "0.01";

    const error = document.createElement("p");
    error.className = "form-error";
    error.hidden = true;
    error.setAttribute("role", "alert");

    const automaticNote = document.createElement("p");
    automaticNote.className = "form-note";
    automaticNote.textContent =
      "La próxima fecha y el avance se calculan automáticamente con los hitos del proyecto.";

    const grid = document.createElement("div");
    grid.className = "project-edit-grid";
    grid.append(
      createField("Nombre", nameInput),
      createField("Tipo", typeSelect),
      createField("Estado", statusSelect),
      createField("Fecha de inicio", startDateInput),
      createField("Próxima fecha", nextDateInput, "Se toma del hito pendiente más cercano."),
      createField("Avance (%)", progressInput, "Es el promedio de todos los hitos."),
      createField("Aporte esperado (USD)", expectedInput),
      createField("Aporte recibido (USD)", receivedInput)
    );
    form.append(automaticNote, grid, error);

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
    }

    function clearError() {
      error.textContent = "";
      error.hidden = true;
    }

    let modal = null;

    async function save(event) {
      const button = event?.currentTarget;
      clearError();

      try {
        const name = global.AppValidators.assertValid(
          global.AppValidators.validateProjectName(nameInput.value)
        );
        const startDate = global.AppValidators.assertValid(
          global.AppValidators.validateDate(startDateInput.value, { required: true })
        );
        const typeId = Number(typeSelect.value);

        if (!Number.isInteger(typeId) || typeId <= 0) {
          throw new Error("Selecciona un tipo de proyecto válido.");
        }

        const expectedCents = global.AppCurrency.parseCurrencyToCents(expectedInput.value);
        const receivedCents = global.AppCurrency.parseCurrencyToCents(receivedInput.value);
        if (expectedCents === null || receivedCents === null) {
          throw new Error("Los aportes deben ser valores iguales o mayores que cero.");
        }

        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
          button.textContent = "Guardando...";
        }

        const updated = await global.ProyectosService.actualizar(project.id, {
          nombre: name,
          tipoId,
          estado: statusSelect.value,
          fechaInicio: startDate,
          aporteEsperadoCentavos: expectedCents,
          aporteRecibidoCentavos: receivedCents
        });

        if (typeof onSaved === "function") {
          await onSaved(updated);
        }
        return true;
      } catch (saveError) {
        showError(saveError.message);
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          button.textContent = "Guardar cambios";
        }
        return false;
      }
    }

    modal = global.Modal.create({
      title: "Editar proyecto",
      content: form,
      actions: [
        { label: "Cancelar", className: "button button-secondary" },
        {
          label: "Guardar cambios",
          className: "button button-primary",
          onClick: save
        }
      ],
      onOpen() {
        nameInput.focus();
        nameInput.select();
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
    return modal;
  }

  Object.defineProperty(global, "ProyectoEditModal", {
    value: Object.freeze({ open }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
