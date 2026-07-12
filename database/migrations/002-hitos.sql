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

CREATE INDEX IF NOT EXISTS idx_hitos_proyecto
  ON hitos(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_hitos_fecha_objetivo
  ON hitos(fecha_objetivo);

CREATE INDEX IF NOT EXISTS idx_hitos_proyecto_avance
  ON hitos(proyecto_id, avance);
