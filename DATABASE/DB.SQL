-- =====================================================
-- EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
        CREATE TYPE rol_usuario AS ENUM (
            'ADMIN',
            'APROBADOR',
            'REGISTRADOR'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_comprobante') THEN
        CREATE TYPE tipo_comprobante AS ENUM (
            'FACTURA_FOTO',
            'SINPE_MOVIL',
            'CAJA_CHICA'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'moneda') THEN
        CREATE TYPE moneda AS ENUM (
            'CRC',
            'USD'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_comprobante') THEN
        CREATE TYPE estado_comprobante AS ENUM (
            'BORRADOR',
            'PENDIENTE',
            'APROBADO',
            'RECHAZADO'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_presupuesto') THEN
        CREATE TYPE estado_presupuesto AS ENUM (
            'ACTIVO',
            'AGOTADO',
            'CERRADO'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento_presupuesto') THEN
        CREATE TYPE tipo_movimiento_presupuesto AS ENUM (
            'ASIGNACION_INICIAL',
            'AUMENTO',
            'DISMINUCION',
            'CONSUMO',
            'AJUSTE'
        );
    END IF;
END $$;

-- =====================================================
-- TABLA: usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS usuario (
    usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol rol_usuario NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLA: t_proyectos
-- =====================================================
CREATE TABLE IF NOT EXISTS t_proyectos (
    proyecto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_proyecto VARCHAR(180) NOT NULL UNIQUE,
    fecha_inicio_proyecto DATE NOT NULL,
    fecha_fin_proyecto DATE NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    presupuesto_proyecto NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (presupuesto_proyecto >= 0),
    balance_proyecto NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance_proyecto >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_t_proyectos_fechas
        CHECK (fecha_fin_proyecto IS NULL OR fecha_fin_proyecto >= fecha_inicio_proyecto),
    CONSTRAINT chk_t_proyectos_balance_no_supera_presupuesto
        CHECK (balance_proyecto <= presupuesto_proyecto)
);

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
    WHEN duplicate_table THEN
        NULL;
    WHEN duplicate_object THEN
        NULL;
END $$;

-- =====================================================
-- TABLA: presupuesto
-- =====================================================
CREATE TABLE IF NOT EXISTS presupuesto (
    presupuesto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL,
    monto_total NUMERIC(14,2) NOT NULL CHECK (monto_total >= 0),
    categoria VARCHAR(120) NOT NULL,
    moneda moneda NOT NULL,
    saldo_disponible NUMERIC(14,2) NOT NULL CHECK (saldo_disponible >= 0),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado estado_presupuesto NOT NULL DEFAULT 'ACTIVO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_presupuesto_proyecto
        FOREIGN KEY (proyecto_id)
        REFERENCES t_proyectos (proyecto_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_presupuesto_saldo_no_supera_monto
        CHECK (saldo_disponible <= monto_total)
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
        SELECT proyecto_id
        INTO v_default_project_id
        FROM t_proyectos
        WHERE nombre_proyecto = 'Proyecto migrado'
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_default_project_id IS NULL THEN
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
        END IF;

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

-- =====================================================
-- TABLA: comprobante
-- =====================================================
CREATE TABLE IF NOT EXISTS comprobante (
    comprobante_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL,
    usuario_creador_id UUID NOT NULL,
    usuario_aprobador_id UUID NULL,

    fecha DATE NOT NULL,
    numero_referencia VARCHAR(100),
    numero_factura VARCHAR(100),
    negocio VARCHAR(200) NOT NULL,
    cedula VARCHAR(50),
    descripcion TEXT NOT NULL,
    monto_gasto NUMERIC(14,2) NOT NULL CHECK (monto_gasto > 0),
    moneda moneda NOT NULL,
    tipo_cambio NUMERIC(14,6) NULL CHECK (tipo_cambio IS NULL OR tipo_cambio > 0),
    monto_presupuesto NUMERIC(14,2) NULL CHECK (monto_presupuesto IS NULL OR monto_presupuesto > 0),
    tipo_comprobante tipo_comprobante NOT NULL,
    estado estado_comprobante NOT NULL DEFAULT 'BORRADOR',
    observacion TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_comprobante_presupuesto
        FOREIGN KEY (presupuesto_id)
        REFERENCES presupuesto (presupuesto_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comprobante_usuario_creador
        FOREIGN KEY (usuario_creador_id)
        REFERENCES usuario (usuario_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_comprobante_usuario_aprobador
        FOREIGN KEY (usuario_aprobador_id)
        REFERENCES usuario (usuario_id)
        ON DELETE RESTRICT
);

-- =====================================================
-- TABLA: adjunto
-- =====================================================
CREATE TABLE IF NOT EXISTS adjunto (
    adjunto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comprobante_id UUID NOT NULL,
    cdn_path TEXT NOT NULL,
    nombre_archivo VARCHAR(255),
    tipo_archivo VARCHAR(100),
    orden INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_adjunto_comprobante
        FOREIGN KEY (comprobante_id)
        REFERENCES comprobante (comprobante_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_adjunto_cdn_path_no_vacio
        CHECK (length(trim(cdn_path)) > 0),

    CONSTRAINT chk_adjunto_orden_positivo
        CHECK (orden > 0)
);

-- =====================================================
-- TABLA: movimiento_presupuesto
-- =====================================================
CREATE TABLE IF NOT EXISTS movimiento_presupuesto (
    movimiento_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id UUID NOT NULL,
    comprobante_id UUID NULL,
    usuario_id UUID NULL,

    tipo_movimiento tipo_movimiento_presupuesto NOT NULL,
    monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),

    saldo_anterior NUMERIC(14,2) NOT NULL CHECK (saldo_anterior >= 0),
    saldo_nuevo NUMERIC(14,2) NOT NULL CHECK (saldo_nuevo >= 0),

    moneda moneda NOT NULL,
    descripcion TEXT,
    referencia_externa VARCHAR(150),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_movimiento_presupuesto
        FOREIGN KEY (presupuesto_id)
        REFERENCES presupuesto (presupuesto_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_comprobante
        FOREIGN KEY (comprobante_id)
        REFERENCES comprobante (comprobante_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (usuario_id)
        ON DELETE SET NULL
);

-- =====================================================
-- INDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS ix_usuario_email
    ON usuario (email);

CREATE INDEX IF NOT EXISTS ix_usuario_rol
    ON usuario (rol);

CREATE INDEX IF NOT EXISTS ix_t_proyectos_nombre_proyecto
    ON t_proyectos (nombre_proyecto);

CREATE INDEX IF NOT EXISTS ix_presupuesto_categoria
    ON presupuesto (categoria);

CREATE INDEX IF NOT EXISTS ix_presupuesto_proyecto_id
    ON presupuesto (proyecto_id);

CREATE INDEX IF NOT EXISTS ix_presupuesto_estado
    ON presupuesto (estado);

CREATE INDEX IF NOT EXISTS ix_comprobante_presupuesto_id
    ON comprobante (presupuesto_id);

CREATE INDEX IF NOT EXISTS ix_comprobante_usuario_creador_id
    ON comprobante (usuario_creador_id);

CREATE INDEX IF NOT EXISTS ix_comprobante_usuario_aprobador_id
    ON comprobante (usuario_aprobador_id);

CREATE INDEX IF NOT EXISTS ix_comprobante_fecha
    ON comprobante (fecha);

CREATE INDEX IF NOT EXISTS ix_comprobante_estado
    ON comprobante (estado);

CREATE INDEX IF NOT EXISTS ix_comprobante_tipo
    ON comprobante (tipo_comprobante);

CREATE INDEX IF NOT EXISTS ix_comprobante_numero_factura
    ON comprobante (numero_factura);

CREATE INDEX IF NOT EXISTS ix_adjunto_comprobante_id
    ON adjunto (comprobante_id);

CREATE INDEX IF NOT EXISTS ix_adjunto_orden
    ON adjunto (comprobante_id, orden);

CREATE INDEX IF NOT EXISTS ix_movimiento_presupuesto_id
    ON movimiento_presupuesto (presupuesto_id);

CREATE INDEX IF NOT EXISTS ix_movimiento_comprobante_id
    ON movimiento_presupuesto (comprobante_id);

CREATE INDEX IF NOT EXISTS ix_movimiento_usuario_id
    ON movimiento_presupuesto (usuario_id);

CREATE INDEX IF NOT EXISTS ix_movimiento_tipo
    ON movimiento_presupuesto (tipo_movimiento);

CREATE INDEX IF NOT EXISTS ix_movimiento_created_at
    ON movimiento_presupuesto (created_at);

-- =====================================================
-- FUNCION: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCION: recalcular totales de proyecto
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_project_totals(p_proyecto_id UUID)
RETURNS VOID AS $$
BEGIN
    IF p_proyecto_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE t_proyectos
    SET
        presupuesto_proyecto = COALESCE((
            SELECT SUM(monto_total)
            FROM presupuesto
            WHERE proyecto_id = p_proyecto_id
        ), 0),
        balance_proyecto = COALESCE((
            SELECT SUM(saldo_disponible)
            FROM presupuesto
            WHERE proyecto_id = p_proyecto_id
        ), 0)
    WHERE proyecto_id = p_proyecto_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCION: archivar proyecto
-- =====================================================
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

-- =====================================================
-- FUNCION: trigger de sincronizacion de proyecto
-- =====================================================
CREATE OR REPLACE FUNCTION sync_project_totals_from_budget()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_project_totals(OLD.proyecto_id);
        RETURN OLD;
    END IF;

    PERFORM refresh_project_totals(NEW.proyecto_id);

    IF TG_OP = 'UPDATE' AND NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id THEN
        PERFORM refresh_project_totals(OLD.proyecto_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS: updated_at
-- =====================================================
DROP TRIGGER IF EXISTS trg_t_proyectos_set_updated_at ON t_proyectos;
CREATE TRIGGER trg_t_proyectos_set_updated_at
BEFORE UPDATE ON t_proyectos
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_presupuesto_set_updated_at ON presupuesto;
CREATE TRIGGER trg_presupuesto_set_updated_at
BEFORE UPDATE ON presupuesto
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_comprobante_set_updated_at ON comprobante;
CREATE TRIGGER trg_comprobante_set_updated_at
BEFORE UPDATE ON comprobante
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_presupuesto_sync_project_totals ON presupuesto;
CREATE TRIGGER trg_presupuesto_sync_project_totals
AFTER INSERT OR UPDATE OR DELETE ON presupuesto
FOR EACH ROW
EXECUTE FUNCTION sync_project_totals_from_budget();

-- =====================================================
-- FUNCION: aprobar comprobante
-- Descuenta saldo y registra movimiento de auditoria
-- =====================================================
CREATE OR REPLACE FUNCTION aprobar_comprobante(
    p_comprobante_id UUID,
    p_usuario_aprobador_id UUID,
    p_observacion TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_presupuesto_id UUID;
    v_monto NUMERIC(14,2);
    v_moneda moneda;
    v_tipo_cambio NUMERIC(14,6);
    v_monto_presupuesto NUMERIC(14,2);
    v_moneda_presupuesto moneda;
    v_tipo_comprobante tipo_comprobante;
    v_estado_actual estado_comprobante;
    v_monto_total_actual NUMERIC(14,2);
    v_saldo_actual NUMERIC(14,2);
    v_saldo_nuevo NUMERIC(14,2);
BEGIN
    SELECT
        c.presupuesto_id,
        c.monto_gasto,
        c.moneda,
        c.tipo_cambio,
        c.tipo_comprobante,
        c.estado
    INTO
        v_presupuesto_id,
        v_monto,
        v_moneda,
        v_tipo_cambio,
        v_tipo_comprobante,
        v_estado_actual
    FROM comprobante c
    WHERE c.comprobante_id = p_comprobante_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no existe: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'APROBADO' THEN
        RAISE EXCEPTION 'El comprobante ya está aprobado: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'RECHAZADO' THEN
        RAISE EXCEPTION 'No se puede aprobar un comprobante rechazado: %', p_comprobante_id;
    END IF;

    SELECT monto_total, saldo_disponible, moneda
    INTO v_monto_total_actual
        ,v_saldo_actual
        ,v_moneda_presupuesto
    FROM presupuesto
    WHERE presupuesto_id = v_presupuesto_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Presupuesto no existe: %', v_presupuesto_id;
    END IF;

    IF v_moneda_presupuesto = v_moneda THEN
        v_monto_presupuesto := v_monto;
    ELSE
        IF v_tipo_cambio IS NULL OR v_tipo_cambio <= 0 THEN
            RAISE EXCEPTION
                'Tipo de cambio requerido. Presupuesto: %, comprobante: %',
                v_moneda_presupuesto,
                v_moneda;
        END IF;

        v_monto_presupuesto := CASE
            WHEN v_moneda = 'CRC' AND v_moneda_presupuesto = 'USD' THEN
                ROUND((v_monto / v_tipo_cambio)::numeric, 2)
            WHEN v_moneda = 'USD' AND v_moneda_presupuesto = 'CRC' THEN
                ROUND((v_monto * v_tipo_cambio)::numeric, 2)
            ELSE
                ROUND((v_monto * v_tipo_cambio)::numeric, 2)
        END;
    END IF;

    IF v_tipo_comprobante <> 'CAJA_CHICA' AND v_saldo_actual < v_monto_presupuesto THEN
        RAISE EXCEPTION 'Saldo insuficiente. Saldo actual: %, monto presupuesto: %', v_saldo_actual, v_monto_presupuesto;
    END IF;

    IF v_tipo_comprobante = 'CAJA_CHICA' THEN
        v_saldo_nuevo := v_saldo_actual + v_monto_presupuesto;
    ELSE
        v_saldo_nuevo := v_saldo_actual - v_monto_presupuesto;
    END IF;

    UPDATE presupuesto
    SET
        monto_total = CASE
                        WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN monto_total + v_monto_presupuesto
                        ELSE monto_total
                      END,
        saldo_disponible = v_saldo_nuevo,
        estado = CASE
                    WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN 'ACTIVO'
                    WHEN v_saldo_nuevo = 0 THEN 'AGOTADO'
                    WHEN v_saldo_nuevo > 0 AND estado = 'AGOTADO' THEN 'ACTIVO'
                    ELSE estado
                 END
    WHERE presupuesto_id = v_presupuesto_id;

    UPDATE comprobante
    SET
        estado = 'APROBADO',
        usuario_aprobador_id = p_usuario_aprobador_id,
        monto_presupuesto = v_monto_presupuesto,
        observacion = COALESCE(p_observacion, observacion)
    WHERE comprobante_id = p_comprobante_id;

    INSERT INTO movimiento_presupuesto (
        presupuesto_id,
        comprobante_id,
        usuario_id,
        tipo_movimiento,
        monto,
        saldo_anterior,
        saldo_nuevo,
        moneda,
        descripcion
    )
    VALUES (
        v_presupuesto_id,
        p_comprobante_id,
        p_usuario_aprobador_id,
        CASE
            WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN 'AUMENTO'::tipo_movimiento_presupuesto
            ELSE 'CONSUMO'::tipo_movimiento_presupuesto
        END,
        v_monto_presupuesto,
        v_saldo_actual,
        v_saldo_nuevo,
        v_moneda_presupuesto,
        CASE
            WHEN v_tipo_comprobante = 'CAJA_CHICA' AND v_moneda_presupuesto = v_moneda THEN
                'Fondeo de presupuesto por caja chica'
            WHEN v_tipo_comprobante = 'CAJA_CHICA' THEN
                'Fondeo de presupuesto por caja chica con conversion cambiaria'
            WHEN v_moneda_presupuesto = v_moneda THEN
                'Consumo generado por aprobación de comprobante'
            ELSE
                'Consumo generado por aprobación de comprobante con conversion cambiaria'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCION: rechazar comprobante
-- No toca presupuesto
-- =====================================================
CREATE OR REPLACE FUNCTION rechazar_comprobante(
    p_comprobante_id UUID,
    p_usuario_aprobador_id UUID,
    p_observacion TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_estado_actual estado_comprobante;
BEGIN
    SELECT estado
    INTO v_estado_actual
    FROM comprobante
    WHERE comprobante_id = p_comprobante_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comprobante no existe: %', p_comprobante_id;
    END IF;

    IF v_estado_actual = 'APROBADO' THEN
        RAISE EXCEPTION 'No se puede rechazar un comprobante ya aprobado';
    END IF;

    IF v_estado_actual = 'RECHAZADO' THEN
        RAISE EXCEPTION 'El comprobante ya está rechazado';
    END IF;

    UPDATE comprobante
    SET
        estado = 'RECHAZADO',
        usuario_aprobador_id = p_usuario_aprobador_id,
        observacion = COALESCE(p_observacion, observacion)
    WHERE comprobante_id = p_comprobante_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCION: bloquear cambios críticos en comprobantes aprobados
-- =====================================================
CREATE OR REPLACE FUNCTION bloquear_campos_criticos_comprobante_aprobado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'APROBADO' THEN
        IF
            NEW.presupuesto_id IS DISTINCT FROM OLD.presupuesto_id OR
            NEW.usuario_creador_id IS DISTINCT FROM OLD.usuario_creador_id OR
            NEW.fecha IS DISTINCT FROM OLD.fecha OR
            NEW.numero_referencia IS DISTINCT FROM OLD.numero_referencia OR
            NEW.numero_factura IS DISTINCT FROM OLD.numero_factura OR
            NEW.negocio IS DISTINCT FROM OLD.negocio OR
            NEW.cedula IS DISTINCT FROM OLD.cedula OR
            NEW.descripcion IS DISTINCT FROM OLD.descripcion OR
            NEW.monto_gasto IS DISTINCT FROM OLD.monto_gasto OR
            NEW.moneda IS DISTINCT FROM OLD.moneda OR
            NEW.tipo_comprobante IS DISTINCT FROM OLD.tipo_comprobante
        THEN
            RAISE EXCEPTION
                'No se pueden modificar campos críticos de un comprobante APROBADO (comprobante_id=%)',
                OLD.comprobante_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_update_comprobante_aprobado ON comprobante;
CREATE TRIGGER trg_bloquear_update_comprobante_aprobado
BEFORE UPDATE ON comprobante
FOR EACH ROW
EXECUTE FUNCTION bloquear_campos_criticos_comprobante_aprobado();

-- =====================================================
-- FUNCION: bloquear borrado de comprobantes aprobados
-- =====================================================
CREATE OR REPLACE FUNCTION bloquear_delete_comprobante_aprobado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'APROBADO' THEN
        RAISE EXCEPTION
            'No se puede eliminar un comprobante en estado APROBADO (comprobante_id=%)',
            OLD.comprobante_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_delete_comprobante_aprobado ON comprobante;
CREATE TRIGGER trg_bloquear_delete_comprobante_aprobado
BEFORE DELETE ON comprobante
FOR EACH ROW
EXECUTE FUNCTION bloquear_delete_comprobante_aprobado();

-- =====================================================
-- FUNCION: bloquear cambios en adjuntos de comprobantes aprobados
-- =====================================================
CREATE OR REPLACE FUNCTION bloquear_cambios_adjuntos_comprobante_aprobado()
RETURNS TRIGGER AS $$
DECLARE
    v_estado estado_comprobante;
    v_comprobante_id UUID;
BEGIN
    v_comprobante_id := COALESCE(NEW.comprobante_id, OLD.comprobante_id);

    SELECT estado
    INTO v_estado
    FROM comprobante
    WHERE comprobante_id = v_comprobante_id;

    IF v_estado = 'APROBADO' THEN
        RAISE EXCEPTION
            'No se pueden modificar adjuntos de un comprobante APROBADO (comprobante_id=%)',
            v_comprobante_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_insert_adjunto_aprobado ON adjunto;
CREATE TRIGGER trg_bloquear_insert_adjunto_aprobado
BEFORE INSERT ON adjunto
FOR EACH ROW
EXECUTE FUNCTION bloquear_cambios_adjuntos_comprobante_aprobado();

DROP TRIGGER IF EXISTS trg_bloquear_update_adjunto_aprobado ON adjunto;
CREATE TRIGGER trg_bloquear_update_adjunto_aprobado
BEFORE UPDATE ON adjunto
FOR EACH ROW
EXECUTE FUNCTION bloquear_cambios_adjuntos_comprobante_aprobado();

DROP TRIGGER IF EXISTS trg_bloquear_delete_adjunto_aprobado ON adjunto;
CREATE TRIGGER trg_bloquear_delete_adjunto_aprobado
BEFORE DELETE ON adjunto
FOR EACH ROW
EXECUTE FUNCTION bloquear_cambios_adjuntos_comprobante_aprobado();

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================
INSERT INTO usuario (nombre, email, password_hash, rol)
VALUES
    (
        'Andres Admin',
        'andres.admin@example.com',
        crypt('Admin123!', gen_salt('bf')),
        'ADMIN'
    ),
    (
        'Maria Aprobadora',
        'maria.aprobadora@example.com',
        crypt('Aprobador123!', gen_salt('bf')),
        'APROBADOR'
    ),
    (
        'Luis Registrador',
        'luis.registrador@example.com',
        crypt('Registrador123!', gen_salt('bf')),
        'REGISTRADOR'
    )
ON CONFLICT (email) DO NOTHING;
