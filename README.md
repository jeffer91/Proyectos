# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico, hitos y documentos asociados.

## Estado actual

**Versión 0.8.2:** revisión integral de conexiones y flujo de procesos.

La aplicación permite:

- Crear proyectos mediante un pop-up con nombre y tipo.
- Buscar, filtrar, ordenar y paginar la tabla principal.
- Mostrar y restaurar proyectos archivados.
- Mostrar proyectos completados mediante filtro.
- Abrir un proyecto pulsando cualquier parte de su fila.
- Ver una pantalla interna con avance, próxima fecha y aportes.
- Crear, editar, completar y eliminar hitos.
- Calcular el avance general como el promedio de los hitos.
- Establecer la próxima fecha con el hito pendiente más cercano.
- Resaltar hitos vencidos y separar los completados.
- Editar nombre, tipo, estado, fecha de inicio y valores económicos.
- Archivar proyectos sin borrar sus datos, hitos ni documentos.
- Eliminar proyectos y enviar su carpeta privada a la Papelera.
- Importar archivos PDF, DOC y DOCX.
- Abrir documentos, mostrar su ubicación y crear respaldos.
- Eliminar documentos de forma coordinada con su registro en SQLite.
- Guardar toda la información estructurada en una base local.

## Correcciones de la versión 0.8.2

- La aplicación permite una sola instancia para evitar escrituras simultáneas sobre SQLite y documentos.
- El inicio respeta el orden: base local, almacenamiento, IPC y ventana.
- La carga fallida de la interfaz y el cierre inesperado del renderer quedan controlados.
- SQLite ejecuta comprobaciones de integridad y relaciones al iniciar.
- Las transacciones rechazan funciones asíncronas para evitar confirmaciones prematuras.
- Los proyectos, tipos e indicadores se cargan juntos, sin estados parciales en pantalla.
- El indicador Total coincide con su filtro e incluye completados y archivados.
- Los indicadores económicos coinciden con los proyectos que muestran al pulsarlos.
- Ningún indicador aparece seleccionado cuando existen filtros manuales o la vista predeterminada.
- Archivar y eliminar ya no provocan dos recargas consecutivas de la pantalla principal.
- La metadata dañada se respalda y se reconstruye automáticamente.
- El conteo de documentos vuelve a sincronizar la estructura antes de guardar.
- La actualización de un proyecto ya no escribe dos veces el mismo archivo de metadata.
- Se agregaron pruebas que verifican canales IPC, orden de scripts y conexiones entre capas.

Las correcciones anteriores de seguridad de archivos, valores monetarios, filtros y modales se mantienen.

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

La próxima fecha corresponde a la fecha más cercana entre los hitos que todavía no hayan llegado al 100 %. El estado del proyecto continúa siendo manual.

## Mapa de procesos

El documento `docs/PROCESOS_Y_CONEXIONES.md` describe el recorrido completo:

```text
Interfaz → Servicio → preload → IPC → Repositorio → SQLite/archivos
```

Incluye inicio, pantalla principal, creación, edición, hitos, documentos, archivo, restauración, eliminación y cierre.

## Verificación automática

El flujo `.github/workflows/ci.yml` ejecuta en cada cambio de la rama principal:

```text
npm run check
npm test
```

Las pruebas actuales comprueban:

- Coincidencia de canales entre preload e IPC.
- Orden de carga de scripts.
- Orden de inicialización de los servicios.
- Migraciones e integridad de SQLite.
- Proyectos, tipos, hitos y cálculo de avance.
- Archivos, rutas protegidas y eliminación en cascada.
- Recuperación de metadata dañada.
- Valores monetarios y validaciones.

La prueba local recomendada antes de trabajar con datos reales es:

```powershell
git pull
npm install
npm run check
npm test
npm start
```
