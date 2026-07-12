# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 5 completado:** pantalla principal de Proyectos completamente funcional.

La aplicación ya permite:

- Crear proyectos mediante un pop-up con nombre y tipo.
- Seleccionar tipos existentes o crear tipos nuevos.
- Asignar automáticamente fecha de inicio, estado Pendiente y avance 0 %.
- Buscar por nombre, tipo o estado.
- Filtrar por tipo, estado, rango de fechas y aporte económico.
- Mostrar u ocultar proyectos completados.
- Ordenar la tabla desde todos sus encabezados.
- Cambiar entre 10, 25, 50 o todas las filas.
- Usar los indicadores superiores como filtros rápidos.
- Abrir cualquier proyecto pulsando su fila.
- Resaltar fechas vencidas y mostrar aporte recibido/esperado.
- Trabajar con datos reales guardados en SQLite.

## Requisitos

- Node.js 22.13 o superior.
- npm.

## Instalación

```bash
npm install
```

## Ejecutar la aplicación

```bash
npm start
```

## Verificar archivos JavaScript

```bash
npm run check
```

## Base de datos local

La aplicación crea automáticamente:

```text
<userData>/database/proyectos.db
```

La base, los documentos y los datos personales no se guardan dentro del repositorio.

## Estructura del módulo Proyectos

```text
src/
├── components/
│   ├── modal.js
│   ├── status-badge.js
│   ├── progress-bar.js
│   └── pagination.js
├── styles/
│   ├── variables.css
│   ├── global.css
│   ├── layout.css
│   ├── components.css
│   └── proyectos.css
└── modules/
    └── proyectos/
        ├── proyectos-service.js
        ├── proyectos-state.js
        ├── proyectos-filters.js
        ├── proyectos-stats.js
        ├── proyectos-table.js
        ├── proyecto-create-modal.js
        └── proyectos-page.js
```

## Próximo bloque

El Bloque 6 preparará el almacenamiento físico de Word y PDF, las carpetas privadas por proyecto, utilidades, validaciones y pruebas finales de esta primera etapa.
