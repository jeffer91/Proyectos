"use strict";

(function exposePagination(global) {
  function normalizePageSize(value) {
    if (value === "all") {
      return "all";
    }

    const numeric = Number(value);
    return [10, 25, 50].includes(numeric) ? numeric : 10;
  }

  function create({ container, onPageChange, onPageSizeChange } = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError("Pagination requiere un contenedor válido.");
    }

    container.classList.add("pagination");
    container.replaceChildren();

    const sizeGroup = document.createElement("label");
    sizeGroup.className = "pagination-size";

    const sizeLabel = document.createElement("span");
    sizeLabel.textContent = "Filas";

    const sizeSelect = document.createElement("select");
    sizeSelect.className = "select pagination-select";
    sizeSelect.setAttribute("aria-label", "Filas por página");

    for (const value of [10, 25, 50, "all"]) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = value === "all" ? "Todas" : String(value);
      sizeSelect.append(option);
    }

    sizeGroup.append(sizeLabel, sizeSelect);

    const navigation = document.createElement("div");
    navigation.className = "pagination-navigation";

    const previousButton = document.createElement("button");
    previousButton.type = "button";
    previousButton.className = "button button-secondary pagination-button";
    previousButton.textContent = "Anterior";

    const pageLabel = document.createElement("span");
    pageLabel.className = "pagination-label";
    pageLabel.setAttribute("aria-live", "polite");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "button button-secondary pagination-button";
    nextButton.textContent = "Siguiente";

    navigation.append(previousButton, pageLabel, nextButton);
    container.append(sizeGroup, navigation);

    let currentPage = 1;
    let totalPages = 1;

    previousButton.addEventListener("click", () => {
      if (currentPage > 1 && typeof onPageChange === "function") {
        onPageChange(currentPage - 1);
      }
    });

    nextButton.addEventListener("click", () => {
      if (currentPage < totalPages && typeof onPageChange === "function") {
        onPageChange(currentPage + 1);
      }
    });

    sizeSelect.addEventListener("change", () => {
      if (typeof onPageSizeChange === "function") {
        onPageSizeChange(normalizePageSize(sizeSelect.value));
      }
    });

    function render({ page = 1, pageSize = 10, totalItems = 0 } = {}) {
      const normalizedSize = normalizePageSize(pageSize);
      const itemCount = Math.max(0, Number(totalItems) || 0);
      totalPages = normalizedSize === "all"
        ? 1
        : Math.max(1, Math.ceil(itemCount / normalizedSize));
      currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

      sizeSelect.value = String(normalizedSize);
      previousButton.disabled = currentPage <= 1;
      nextButton.disabled = currentPage >= totalPages;
      pageLabel.textContent = `Página ${currentPage} de ${totalPages}`;
    }

    return Object.freeze({ render });
  }

  Object.defineProperty(global, "Pagination", {
    value: Object.freeze({ create }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
