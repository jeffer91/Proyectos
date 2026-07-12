# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico, hitos y documentos asociados.

## Estado actual

**Bloque 8 completado:** hitos y cálculo automático del avance.

La aplicación ya permite:

- Crear proyectos mediante un pop-up con nombre y tipo.
- Buscar, filtrar, ordenar y paginar la tabla principal.
- Abrir un proyecto pulsando cualquier parte de su fila.
- Ver una pantalla interna con avance, próxima fecha y aportes.
- Crear, editar, completar y eliminar hitos.
- Guardar en cada hito un título, descripción, fecha objetivo y porcentaje.
- Calcular el avance general como el promedio de todos los hitos.
- Establecer la próxima fecha con el hito pendiente más cercano.
- Resaltar hitos vencidos y separar los completados.
- Editar nombre, tipo, estado, fechas y valores económicos del proyecto.
- Archivar proyectos sin borrar sus datos, hitos ni documentos.
- Eliminar proyectos enviando su carpeta privada a la Papelera.
- Importar archivos PDF, DOC y DOCX.
- Abrir documentos, mostrar su ubicación y crear respaldos.
- Eliminar documentos enviándolos a la Papelera del sistema.
- Guardar toda la información estructurada en SQLite.

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

## Verificar sintaxis

```bash
npm run check
```

## Ejecutar pruebas

```bash
npm test
```

## Datos locales

La aplicación crea automáticamente:

```text
<userData>/
├── database/
│   └── proyectos.db
└── projects/
    └── <id-del-proyecto>/
        ├── metadata.json
        ├── documents/
        ├── backups/
        └── temp/
```

La base, los documentos y los datos personales no se guardan dentro del repositorio.

## Cálculo del avance

Cada hito tiene un avance entre 0 % y 100 %. Todos los hitos tienen el mismo peso.

```text
Avance general = promedio de los porcentajes de todos los hitos
```

Ejemplo:

```text
Hito 1: 100 %
Hito 2: 50 %
Hito 3: 0 %

Avance general: 50 %
```

La próxima fecha del proyecto corresponde a la fecha más cercana entre los hitos que todavía no han llegado al 100 %. El estado del proyecto continúa siendo manual.

## Archivos principales del Bloque 8

```text
database/
├── migrations/
│   └── 002-hitos.sql
├── repositories/
│   └── hitos-repository.js
└── schema.sql

electron/
├── preload.js
└── ipc/
    └── proyectos-ipc.js

src/
├── modules/
│   ├── proyectos/
│   │   └── proyectos-service.js
│   └── proyecto/
│       └── proyecto-page.js
└── styles/
    └── proyecto-detalle.css
```

## Siguiente bloque recomendado

El Bloque 9 puede incorporar historial de cambios y actividad: creación y edición de hitos, cambios de estado, documentos agregados y avances registrados.
