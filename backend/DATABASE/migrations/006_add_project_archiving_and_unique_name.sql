BEGIN;

ALTER TABLE t_proyectos
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
DECLARE
    duplicate_group RECORD;
    canonical_project_id UUID;
    duplicate_project RECORD;
BEGIN
    FOR duplicate_group IN
        SELECT nombre_proyecto
        FROM t_proyectos
        GROUP BY nombre_proyecto
        HAVING COUNT(*) > 1
    LOOP
        SELECT proyecto_id
        INTO canonical_project_id
        FROM t_proyectos
        WHERE nombre_proyecto = duplicate_group.nombre_proyecto
        ORDER BY created_at ASC, proyecto_id ASC
        LIMIT 1;

        FOR duplicate_project IN
            SELECT proyecto_id
            FROM t_proyectos
            WHERE nombre_proyecto = duplicate_group.nombre_proyecto
              AND proyecto_id <> canonical_project_id
        LOOP
            UPDATE presupuesto
            SET proyecto_id = canonical_project_id
            WHERE proyecto_id = duplicate_project.proyecto_id;

            DELETE FROM t_proyectos
            WHERE proyecto_id = duplicate_project.proyecto_id;
        END LOOP;
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_t_proyectos_nombre_proyecto'
    ) THEN
        ALTER TABLE t_proyectos
        ADD CONSTRAINT uq_t_proyectos_nombre_proyecto
        UNIQUE (nombre_proyecto);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

CREATE OR REPLACE FUNCTION archivar_proyecto(p_proyecto_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE t_proyectos
    SET activo = FALSE
    WHERE proyecto_id = p_proyecto_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proyecto no existe: %', p_proyecto_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;
