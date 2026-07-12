"use strict";

(function exposeModal(global) {
  const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  function appendContent(target, content) {
    if (content instanceof Node) {
      target.append(content);
      return;
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        appendContent(target, item);
      }
      return;
    }

    if (content !== null && content !== undefined) {
      target.append(document.createTextNode(String(content)));
    }
  }

  function createButton(action, close) {
    const button = document.createElement("button");
    button.type = action.type || "button";
    button.className = action.className || "button button-secondary";
    button.textContent = action.label || "Aceptar";

    if (action.disabled === true) {
      button.disabled = true;
    }

    button.addEventListener("click", async (event) => {
      if (typeof action.onClick !== "function") {
        if (action.closeOnClick !== false) {
          close();
        }
        return;
      }

      const result = await action.onClick(event);
      if (result !== false && action.closeOnClick !== false) {
        close();
      }
    });

    return button;
  }

  function create(options = {}) {
    const title = String(options.title || "Ventana");
    const previousActiveElement = document.activeElement;
    let isOpen = false;

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.hidden = true;

    const dialog = document.createElement("section");
    dialog.className = "modal-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const header = document.createElement("header");
    header.className = "modal-header";

    const heading = document.createElement("h2");
    heading.className = "modal-title";
    heading.id = `modal-title-${Math.random().toString(36).slice(2)}`;
    heading.textContent = title;
    dialog.setAttribute("aria-labelledby", heading.id);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal-close";
    closeButton.setAttribute("aria-label", "Cerrar ventana");
    closeButton.textContent = "×";

    const body = document.createElement("div");
    body.className = "modal-body";
    appendContent(body, options.content);

    header.append(heading, closeButton);
    dialog.append(header, body);

    let footer = null;
    if (Array.isArray(options.actions) && options.actions.length > 0) {
      footer = document.createElement("footer");
      footer.className = "modal-footer";
      dialog.append(footer);
    }

    backdrop.append(dialog);

    function getFocusableElements() {
      return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
    }

    function close() {
      if (!isOpen) {
        return;
      }

      isOpen = false;
      backdrop.hidden = true;
      document.body.classList.remove("no-scroll");
      document.removeEventListener("keydown", handleKeydown);

      if (typeof options.onClose === "function") {
        options.onClose();
      }

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    }

    function handleKeydown(event) {
      if (event.key === "Escape" && options.closeOnEscape !== false) {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function open() {
      if (isOpen) {
        return;
      }

      if (!backdrop.isConnected) {
        document.body.append(backdrop);
      }

      isOpen = true;
      backdrop.hidden = false;
      document.body.classList.add("no-scroll");
      document.addEventListener("keydown", handleKeydown);

      const focusable = getFocusableElements();
      (focusable[0] || dialog).focus();

      if (typeof options.onOpen === "function") {
        options.onOpen();
      }
    }

    function destroy() {
      close();
      backdrop.remove();
    }

    closeButton.addEventListener("click", close);
    backdrop.addEventListener("mousedown", (event) => {
      if (event.target === backdrop && options.closeOnBackdrop !== false) {
        close();
      }
    });

    if (footer) {
      for (const action of options.actions) {
        footer.append(createButton(action, close));
      }
    }

    return Object.freeze({
      element: backdrop,
      dialog,
      body,
      open,
      close,
      destroy,
      isOpen: () => isOpen
    });
  }

  Object.defineProperty(global, "Modal", {
    value: Object.freeze({ create }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
