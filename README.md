# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 2 completado:** base local SQLite y repositorios de datos.

La aplicación ya incluye:

- Inicio seguro de Electron.
- Ventana principal y puente `preload`.
- Base SQLite local creada automáticamente al iniciar.
- Migraciones versionadas para actualizar la estructura sin borrar información.
- Tablas para tipos de proyecto, proyectos y archivos.
- Repositorios para crear, consultar, actualizar y eliminar registros.
- Almacenamiento de aportes económicos en centavos para evitar errores de decimales.
- Cierre seguro de la base de datos al salir de la aplicación.

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

La ubicación real depende del sistema operativo y no se guarda dentro del repositorio de GitHub.

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
│   └── services/
│       └── database-service.js
└── src/
    ├── index.html
    └── app.js
```

## Próximo bloque

El Bloque 3 conectará la interfaz con los repositorios mediante canales IPC seguros.
