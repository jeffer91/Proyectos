# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico, hitos y documentos asociados.

## Estado actual

**Versión 0.8.1:** revisión general de funcionamiento, seguridad local y consistencia de datos.

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

## Correcciones de la versión 0.8.1

- Los cuatro indicadores superiores muestran ahora los valores reales.
- El filtro de estado `Completado` funciona aunque estuviera oculto por defecto.
- Los proyectos archivados se pueden localizar y restaurar.
- La tabla identifica visualmente los proyectos archivados.
- El avance y la próxima fecha ya no se pueden sobrescribir manualmente; dependen de los hitos.
- Los modales permanecen bloqueados mientras una operación está en curso.
- Los errores de acciones asíncronas dentro de los modales quedan controlados.
- La eliminación de documentos mantiene coordinados el archivo físico y su registro.
- La aplicación detecta cuando un documento registrado ya no existe físicamente.
- La API del navegador ya no permite registrar rutas arbitrarias de archivos.
- Los importes aceptan formatos como `1.250,50` y `1,250.50` y rechazan valores inválidos.
- Se agregaron pruebas de migraciones, proyectos, hitos, archivos y eliminación en cascada.
- Se agregó una verificación automática mediante GitHub Actions.

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

## Verificación automática

El flujo `.github/workflows/ci.yml` ejecuta en cada cambio de la rama principal:

```text
npm run check
npm test
```

La prueba local recomendada antes de trabajar con datos reales es:

```powershell
git pull
npm install
npm run check
npm test
npm start
```
