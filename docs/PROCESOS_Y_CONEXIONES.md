# Procesos y conexiones de la aplicación

Este documento describe cómo fluye cada proceso desde la interfaz hasta la base local y el almacenamiento físico.

## Regla general de conexión

```text
Interfaz HTML/JS
    ↓
Servicio del módulo
    ↓
IpcService
    ↓
preload.js
    ↓
Canal IPC de Electron
    ↓
Repositorio o servicio local
    ↓
SQLite y/o carpeta privada del proyecto
```

La interfaz nunca accede directamente a Node.js, SQLite ni al sistema de archivos.

## 1. Inicio de la aplicación

```text
Electron inicia
    ↓
Obtiene el bloqueo de instancia única
    ↓
Inicializa SQLite
    ↓
Aplica migraciones pendientes
    ↓
Comprueba integridad y relaciones
    ↓
Inicializa la carpeta privada de proyectos
    ↓
Registra canales IPC
    ↓
Crea y carga la ventana principal
```

Si falla la base, el almacenamiento, los canales o la interfaz, la aplicación informa el problema y se cierra sin continuar con un estado incompleto.

## 2. Carga de la pantalla principal

```text
ProyectosPage.initialize
    ↓
Solicita información de la app, proyectos, tipos y resumen
    ↓
ProyectosService
    ↓
preload + IPC
    ↓
Repositorios de SQLite
    ↓
ProyectosState.replaceData
    ↓
Indicadores, filtros, tabla y paginación
```

Los proyectos, tipos e indicadores se reemplazan juntos para evitar renders con información parcial.

## 3. Creación de proyectos

```text
Nuevo proyecto
    ↓
Validar nombre y tipo
    ↓
Crear tipo nuevo, cuando corresponda
    ↓
Crear registro en SQLite
    ↓
Crear carpeta privada y metadata.json
    ↓
Actualizar la pantalla principal
```

Si la carpeta privada no puede crearse, el registro del proyecto se revierte.

## 4. Consulta, filtros e indicadores

- La tabla carga proyectos activos, completados y archivados una sola vez.
- Los filtros se aplican en la interfaz.
- El indicador Total muestra todos los proyectos, incluidos completados y archivados.
- Aporte esperado y recibido incluyen completados, pero no archivados.
- Próximos a vencer excluye completados y archivados.
- Los filtros manuales desactivan el indicador rápido seleccionado.

## 5. Apertura y edición de un proyecto

```text
Pulsar fila
    ↓
Consultar proyecto
    ↓
Verificar o reparar su carpeta privada
    ↓
Consultar hitos y documentos
    ↓
Mostrar pantalla interna
```

Al editar:

```text
Validar campos
    ↓
Actualizar SQLite
    ↓
Sincronizar metadata del proyecto
    ↓
Actualizar detalle y tabla principal
```

El avance y la próxima fecha no se editan manualmente; se calculan con los hitos.

## 6. Hitos y avance automático

```text
Crear, editar, completar o eliminar hito
    ↓
Repositorio de hitos
    ↓
Transacción SQLite
    ↓
Recalcular promedio de avance
    ↓
Buscar la fecha pendiente más cercana
    ↓
Actualizar proyecto
    ↓
Actualizar detalle y tabla principal
```

Todos los hitos tienen el mismo peso.

## 7. Documentos

### Importación

```text
Seleccionar PDF o Word
    ↓
Validar extensión
    ↓
Copiar a documents/
    ↓
Calcular SHA-256
    ↓
Registrar metadata en SQLite
    ↓
Actualizar documentCount en metadata.json
```

Si falla el registro en SQLite, la copia física se elimina para no dejar archivos huérfanos.

### Eliminación

```text
Mover temporalmente el archivo
    ↓
Eliminar registro de SQLite
    ↓
Enviar archivo a la Papelera
    ↓
Actualizar documentCount
```

Si la Papelera falla, se intenta restaurar tanto el archivo como su registro.

## 8. Archivo y restauración de proyectos

### Archivar

- Cambia `archivado` a verdadero.
- Conserva SQLite, hitos, documentos y carpeta privada.
- Oculta el proyecto de la vista normal.

### Restaurar

- Se localiza mediante Mostrar archivados o Total de proyectos.
- Cambia `archivado` a falso.
- Abre nuevamente la pantalla interna.

## 9. Eliminación de proyectos

```text
Renombrar temporalmente la carpeta privada
    ↓
Eliminar proyecto de SQLite
    ↓
SQLite elimina hitos y archivos en cascada
    ↓
Enviar la carpeta a la Papelera
```

Si la eliminación de SQLite falla, la carpeta recupera su nombre original.

## 10. Cierre

```text
Cerrar aplicación
    ↓
Desregistrar canales IPC
    ↓
Cerrar SQLite
    ↓
Finalizar Electron
```

## Verificaciones automáticas

`tests/connections.test.js` revisa:

- Coincidencia entre canales de `preload.js` e IPC.
- Orden de carga de scripts.
- Orden de inicialización de base, almacenamiento, IPC y ventana.
- Conexiones del servicio de interfaz.

Las demás pruebas revisan migraciones, integridad, proyectos, hitos, documentos, rutas y recuperación de metadata.
