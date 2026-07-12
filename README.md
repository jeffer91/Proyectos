# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 3 completado:** comunicación segura entre la interfaz, Electron y la base local.

La aplicación ya incluye:

- Inicio seguro de Electron con aislamiento de contexto.
- Base SQLite local creada automáticamente.
- Migraciones versionadas para conservar la información.
- Repositorios para proyectos, tipos y metadatos de archivos.
- Canales IPC separados para proyectos, archivos y ventana.
- API limitada mediante `preload.js`, sin exponer Node.js al navegador.
- Servicios del lado de la interfaz para consumir la base local.
- Estado central del módulo Proyectos con filtros, ordenamiento y paginación preparados.
- Comprobación automática de Electron, SQLite e IPC al abrir la aplicación.

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

La ubicación depende del sistema operativo. La base, los documentos y los datos personales no se guardan dentro del repositorio.

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
    ├── services/
    │   └── ipc-service.js
    └── modules/
        └── proyectos/
            ├── proyectos-service.js
            └── proyectos-state.js
```

## Próximo bloque

El Bloque 4 incorporará el diseño general, los estilos y los componentes visuales reutilizables.
