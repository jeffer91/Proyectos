-- Esquema actual de la base de datos local de Proyectos.
-- Este archivo sirve como referencia completa. La aplicación aplica los cambios
-- mediante los archivos versionados de database/migrations.

CREATE TABLE IF NOT EXISTS _migrations (
  nombre TEXT PRIMARY KEY,
  aplicado_en TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS tipos_proyecto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL COLLATE NOCASE UNIQUE,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS proyectos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo_id INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'pausado', 'completado')),
  fecha_inicio TEXT NOT NULL,
  proxima_fecha TEXT,
  ultima_actualizacion TEXT NOT NULL,
  aporte_esperado_centavos INTEGER NOT NULL DEFAULT 0
    CHECK (aporte_esperado_centavos >= 0),
  aporte_recibido_centavos INTEGER NOT NULL DEFAULT 0
    CHECK (aporte_recibido_centavos >= 0),
  avance INTEGER NOT NULL DEFAULT 0
    CHECK (avance BETWEEN 0 AND 100),
  archivado INTEGER NOT NULL DEFAULT 0
    CHECK (archivado IN (0, 1)),
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL,
  FOREIGN KEY (tipo_id) REFERENCES tipos_proyecto(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS hitos (
  id TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_objetivo TEXT NOT NULL,
  avance INTEGER NOT NULL DEFAULT 0
    CHECK (avance BETWEEN 0 AND 100),
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS archivos (
  id TEXT PRIMARY KEY,
  proyecto_id TEXT NOT NULL,
  nombre_original TEXT NOT NULL,
  nombre_guardado TEXT NOT NULL,
  extension TEXT,
  tipo_mime TEXT,
  ruta_relativa TEXT NOT NULL,
  tamano_bytes INTEGER NOT NULL DEFAULT 0
    CHECK (tamano_bytes >= 0),
  hash_sha256 TEXT,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  UNIQUE (proyecto_id, nombre_guardado)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_proyectos_tipo
  ON proyectos(tipo_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_estado
  ON proyectos(estado);

CREATE INDEX IF NOT EXISTS idx_proyectos_proxima_fecha
  ON proyectos(proxima_fecha);

CREATE INDEX IF NOT EXISTS idx_proyectos_ultima_actualizacion
  ON proyectos(ultima_actualizacion DESC);

CREATE INDEX IF NOT EXISTS idx_hitos_proyecto
  ON hitos(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_hitos_fecha_objetivo
  ON hitos(fecha_objetivo);

CREATE INDEX IF NOT EXISTS idx_hitos_proyecto_avance
  ON hitos(proyecto_id, avance);

CREATE INDEX IF NOT EXISTS idx_archivos_proyecto
  ON archivos(proyecto_id);
