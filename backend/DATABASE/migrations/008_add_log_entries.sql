CREATE TABLE IF NOT EXISTS log_entry (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje TEXT NOT NULL CHECK (char_length(trim(mensaje)) > 0),
    usuario_id UUID NOT NULL REFERENCES usuario(usuario_id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_entry_created_at
    ON log_entry (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_log_entry_usuario_id
    ON log_entry (usuario_id);
