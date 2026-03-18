BEGIN;

CREATE TABLE IF NOT EXISTS t_proyectos (
    proyecto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_proyecto VARCHAR(180) NOT NULL,
    fecha_inicio_proyecto DATE NOT NULL,
    fecha_fin_proyecto DATE NULL,
    presupuesto_proyecto NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_proyecto >= 0),
    balance_proyecto NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_proyecto >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_t_proyectos_fechas
        CHECK (fecha_fin_proyecto IS NULL OR fecha_fin_proyecto >= fecha_inicio_proyecto),
    CONSTRAINT chk_t_proyectos_balance_no_supera_presupuesto
        CHECK (balance_proyecto <= presupuesto_proyecto)
);

ALTER TABLE presupuesto
ADD COLUMN IF NOT EXISTS proyecto_id UUID;

DO $$
DECLARE
    v_default_project_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM presupuesto
        WHERE proyecto_id IS NULL
    ) THEN
        INSERT INTO t_proyectos (
            nombre_proyecto,
            fecha_inicio_proyecto,
            fecha_fin_proyecto
        )
        VALUES (
            'Proyecto migrado',
            CURRENT_DATE,
            NULL
        )
        RETURNING proyecto_id INTO v_default_project_id;

        UPDATE presupuesto
        SET proyecto_id = v_default_project_id
        WHERE proyecto_id IS NULL;
    END IF;
END $$;

ALTER TABLE presupuesto
ALTER COLUMN proyecto_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_presupuesto_proyecto'
    ) THEN
        ALTER TABLE presupuesto
        ADD CONSTRAINT fk_presupuesto_proyecto
        FOREIGN KEY (proyecto_id)
        REFERENCES t_proyectos (proyecto_id)
        ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_t_proyectos_nombre_proyecto
    ON t_proyectos (nombre_proyecto);

CREATE INDEX IF NOT EXISTS ix_presupuesto_proyecto_id
    ON presupuesto (proyecto_id);

UPDATE t_proyectos tp
SET
    presupuesto_proyecto = COALESCE(agg.presupuesto_proyecto, 0),
    balance_proyecto = COALESCE(agg.balance_proyecto, 0)
FROM (
    SELECT
        proyecto_id,
        SUM(monto_total) AS presupuesto_proyecto,
        SUM(saldo_disponible) AS balance_proyecto
    FROM presupuesto
    GROUP BY proyecto_id
) agg
WHERE tp.proyecto_id = agg.proyecto_id;

COMMIT;
