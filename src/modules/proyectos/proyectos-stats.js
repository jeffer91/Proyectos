"use strict";

(function exposeProyectosStats(global) {
  const formatter = new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  function currency(cents) {
    const value = Number(cents || 0) / 100;
    return formatter.format(Number.isFinite(value) ? value : 0);
  }

  function create({ onSelect } = {}) {
    const cards = Array.from(document.querySelectorAll("[data-stat-filter]"));

    if (cards.length === 0) {
      throw new Error("No se encontraron los indicadores de proyectos.");
    }

    for (const card of cards) {
      card.disabled = false;
      card.addEventListener("click", () => {
        if (typeof onSelect === "function") {
          onSelect(card.dataset.statFilter || "total");
        }
      });
    }

    function render(summary = {}, activeFilter = "total") {
      const values = {
        total: summary.total || 0,
        dueSoon: summary.proximosAVencer || 0,
        expected: currency(summary.aporteEsperadoCentavos),
        received: currency(summary.aporteRecibidoCentavos)
      };

      for (const [key, value] of Object.entries(values)) {
        const element = document.querySelector(`[data-stat-value="${key}"]`);
        if (element) {
          element.textContent = String(value);
        }
      }

      for (const card of cards) {
        const active = card.dataset.statFilter === activeFilter;
        card.classList.toggle("is-active", active);
        card.setAttribute("aria-pressed", String(active));
      }
    }

    return Object.freeze({ render });
  }

  Object.defineProperty(global, "ProyectosStats", {
    value: Object.freeze({ create }),
    configurable: false,
    enumerable: false,
    writable: false
  });
})(window);
