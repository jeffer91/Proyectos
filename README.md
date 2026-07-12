# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 4 completado:** diseño general y componentes visuales reutilizables.

La aplicación ya incluye:

- Inicio seguro de Electron con aislamiento de contexto.
- Base SQLite local y migraciones versionadas.
- Repositorios para proyectos, tipos y metadatos de archivos.
- Canales IPC separados para proyectos, archivos y ventana.
- API limitada mediante `preload.js`.
- Estado central del módulo Proyectos.
- Diseño claro y adaptable para escritorio y pantallas pequeñas.
- Indicadores superiores, barra de filtros y tabla principal.
- Componentes reutilizables para ventanas emergentes, estados y barras de avance.
- Vista inicial conectada a los datos reales guardados en SQLite.

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

Al iniciar, Electron crea el archivo `proyectos.db` dentro de la carpeta privada de datos de la aplicación:

```text
<userData>/database/proyectos.db
```

La base, los documentos y los datos personales no se guardan dentro del repositorio.

## Estructura actual

```text
Proyectos/
├── package.json
├── .gitignore
├── README.md
├── database/
│   ├── schema.sql
│   ├── migrations/
│   │   └── 001-inicial.sql
│   └── repositories/
│       ├── proyectos-repository.js
│       ├── tipos-repository.js
│       └── archivos-repository.js
├── electron/
│   ├── main.js
│   ├── preload.js
│   ├── ipc/
│   │   ├── proyectos-ipc.js
│   │   ├── archivos-ipc.js
│   │   └── ventana-ipc.js
│   └── services/
│       └── database-service.js
└── src/
    ├── index.html
    ├── app.js
    ├── styles/
    │   ├── variables.css
    │   ├── global.css
    │   ├── layout.css
    │   └── components.css
    ├── components/
    │   ├── modal.js
    │   ├── status-badge.js
    │   └── progress-bar.js
    ├── services/
    │   └── ipc-service.js
    └── modules/
        └── proyectos/
            ├── proyectos-service.js
            └── proyectos-state.js
```

## Próximo bloque

El Bloque 5 activará la pantalla completa de Proyectos: creación por pop-up, buscador, filtros, ordenamiento, indicadores interactivos y paginación.
