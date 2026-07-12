# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 6 completado:** almacenamiento físico de documentos, utilidades y pruebas de la primera etapa.

La aplicación ya permite:

- Crear proyectos mediante un pop-up con nombre y tipo.
- Buscar, filtrar, ordenar y paginar la tabla principal.
- Usar indicadores superiores como filtros rápidos.
- Guardar la información estructurada en SQLite.
- Crear una carpeta privada para cada proyecto.
- Importar archivos PDF, DOC y DOCX mediante canales seguros de Electron.
- Evitar sobrescribir documentos con el mismo nombre.
- Calcular SHA-256 de cada documento guardado.
- Abrir documentos, mostrar su ubicación y abrir la carpeta del proyecto.
- Crear respaldos antes de futuras modificaciones.
- Enviar documentos eliminados a la Papelera del sistema.
- Validar nombres, fechas, avances y extensiones permitidas.
- Ejecutar pruebas automáticas del almacenamiento y las utilidades.

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

## Archivos principales del Bloque 6

```text
electron/services/
├── project-storage-service.js
└── file-storage-service.js

src/utils/
├── dates.js
├── currency.js
├── validators.js
└── formatters.js

tests/
├── proyectos.test.js
└── validators.test.js
```

## Estado de la primera etapa

La pantalla principal y la infraestructura local están completas. La siguiente etapa puede desarrollar la pantalla interna de cada proyecto para administrar fechas, avance, aporte, documentos y acciones de edición o archivo.
