"use strict";

(function exposeProyectoCreateModal(global) {
  function field(labelText, control) {
    const label = document.createElement("label");
    label.className = "field";

    const labelSpan = document.createElement("span");
    labelSpan.className = "field-label";
    labelSpan.textContent = labelText;

    label.append(labelSpan, control);
    return label;
  }

  function open({ types = [], onCreated } = {}) {
    const form = document.createElement("form");
    form.className = "project-form";
    form.noValidate = true;

    const nameInput = document.createElement("input");
    nameInput.className = "input";
    nameInput.type = "text";
    nameInput.maxLength = 160;
    nameInput.autocomplete = "off";
    nameInput.placeholder = "Ejemplo: Aplicación de proyectos";
    nameInput.required = true;

    const typeSelect = document.createElement("select");
    typeSelect.className = "select";
    typeSelect.required = true;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un tipo";
    typeSelect.append(placeholder);

    for (const type of Array.isArray(types) ? types : []) {
      const option = document.createElement("option");
      option.value = String(type.id);
      option.textContent = type.nombre;
      typeSelect.append(option);
    }

    const newTypeOption = document.createElement("option");
    newTypeOption.value = "__new__";
    newTypeOption.textContent = "+ Crear un tipo nuevo";
    typeSelect.append(newTypeOption);

    const newTypeInput = document.createElement("input");
    newTypeInput.className = "input";
    newTypeInput.type = "text";
    newTypeInput.maxLength = 80;
    newTypeInput.autocomplete = "off";
    newTypeInput.placeholder = "Nombre del tipo nuevo";

    const newTypeField = field("Nuevo tipo", newTypeInput);
    newTypeField.hidden = true;

    const error = document.createElement("p");
    error.className = "form-error";
    error.hidden = true;
    error.setAttribute("role", "alert");

    form.append(
      field("Nombre", nameInput),
      field("Tipo", typeSelect),
      newTypeField,
      error
    );

    function showError(message) {
      error.textContent = message;
      error.hidden = false;
    }

    function clearError() {
      error.textContent = "";
      error.hidden = true;
    }

    function toggleNewType() {
      const isNew = typeSelect.value === "__new__";
      newTypeField.hidden = !isNew;
      newTypeInput.required = isNew;

      if (isNew && newTypeInput.isConnected) {
        newTypeInput.focus();
      }
    }

    typeSelect.addEventListener("change", () => {
      clearError();
      toggleNewType();
    });

    if (!Array.isArray(types) || types.length === 0) {
      typeSelect.value = "__new__";
      toggleNewType();
    }

    let modal = null;

    async function createProject(event) {
      const button = event?.currentTarget;
      clearError();

      const name = nameInput.value.trim().replace(/\s+/g, " ");
      if (!name) {
        showError("Escribe el nombre del proyecto.");
        nameInput.focus();
        return false;
      }

      let typeId = Number(typeSelect.value);

      if (typeSelect.value === "__new__") {
        const typeName = newTypeInput.value.trim().replace(/\s+/g, " ");
        if (!typeName) {
          showError("Escribe el nombre del tipo nuevo.");
          newTypeInput.focus();
          return false;
        }

        try {
          if (button instanceof HTMLButtonElement) {
            button.disabled = true;
            button.textContent = "Creando...";
          }

          const createdType = await global.ProyectosService.crearTipo(typeName);
          typeId = createdType.id;

          const createdOption = document.createElement("option");
          createdOption.value = String(createdType.id);
          createdOption.textContent = createdType.nombre;
          typeSelect.insertBefore(createdOption, newTypeOption);
          typeSelect.value = String(createdType.id);
          newTypeField.hidden = true;
          newTypeInput.required = false;
        } catch (creationError) {
          showError(creationError.message);
          if (button instanceof HTMLButtonElement) {
            button.disabled = false;
            button.textContent = "Crear proyecto";
          }
          return false;
        }
      }

      if (!Number.isInteger(typeId) || typeId <= 0) {
        showError("Selecciona un tipo de proyecto.");
        typeSelect.focus();
        return false;
      }

      try {
        if (button instanceof HTMLButtonElement) {
          button.disabled = true;
          button.textContent = "Creando...";
        }

        const project = await global.ProyectosService.crear({ nombre: name, tipoId });

        if (typeof onCreated === "function") {
          await onCreated(project);
        }

        return true;
      } catch (creationError) {
        showError(creationError.message);
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
          button.textContent = "Crear proyecto";
        }
        return false;
      }
    }

    modal = global.Modal.create({
      title: "Nuevo proyecto",
      content: form,
      actions: [
        {
          label: "Cancelar",
          className: "button button-secondary"
        },
        {
          label: "Crear proyecto",
          className: "button button-primary",
          onClick: createProject
        }
      ],
      onOpen() {
        nameInput.focus();
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

  Object.defineProperty(global, "ProyectoCreateModal", {
    value: Object.freeze({ open }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
