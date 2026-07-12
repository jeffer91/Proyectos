# Proyectos

Aplicación de escritorio para gestionar proyectos personales, su avance, fechas, aporte económico y documentos asociados.

## Estado actual

**Bloque 1 completado:** base de Electron y pantalla inicial.

La aplicación ya incluye:

- Inicio seguro de Electron.
- Ventana principal.
- Puente `preload` preparado para futuras funciones.
- Pantalla inicial del módulo Proyectos.
- Estructura base para continuar con la base de datos y los módulos.

## Requisitos

- Node.js 20 o superior.
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

## Estructura actual

```text
Proyectos/
├── package.json
├── .gitignore
├── README.md
├── electron/
│   ├── main.js
│   └── preload.js
└── src/
    ├── index.html
    └── app.js
```

## Próximo bloque

El Bloque 2 incorporará la base de datos local y los repositorios para proyectos, tipos y archivos.
