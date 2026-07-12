# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 7 completado:** pantalla interna de cada proyecto.

La aplicación ya permite:

- Crear proyectos mediante un pop-up con nombre y tipo.
- Buscar, filtrar, ordenar y paginar la tabla principal.
- Abrir un proyecto pulsando cualquier parte de su fila.
- Ver una pantalla interna con avance, próxima fecha y aportes.
- Editar nombre, tipo, estado, fechas, avance y valores económicos.
- Archivar proyectos sin borrar sus datos ni documentos.
- Eliminar proyectos enviando su carpeta privada a la Papelera.
- Importar archivos PDF, DOC y DOCX.
- Abrir documentos, mostrar su ubicación y crear respaldos.
- Eliminar documentos enviándolos a la Papelera del sistema.
- Guardar la información estructurada en SQLite.
- Mantener una carpeta privada y metadata para cada proyecto.
- Validar nombres, fechas, avances, dinero y extensiones permitidas.

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

## Pantallas actuales

```text
Pantalla principal
├── Indicadores
├── Buscador y filtros
├── Tabla ordenable
├── Paginación
└── Nuevo proyecto

Pantalla interna del proyecto
├── Resumen de avance, fecha y aportes
├── Información general
├── Edición del proyecto
├── Administración de documentos
├── Archivar proyecto
└── Eliminar proyecto
```

## Archivos principales del Bloque 7

```text
src/modules/proyecto/
├── proyecto-page.js
├── proyecto-edit-modal.js
└── proyecto-documents.js

src/styles/
└── proyecto-detalle.css
```

## Siguiente bloque recomendado

El Bloque 8 puede incorporar avances o hitos dentro de cada proyecto. Estos registros permitirán guardar actividades, fechas y porcentajes, y después calcular el avance general de forma automática en lugar de escribirlo manualmente.
