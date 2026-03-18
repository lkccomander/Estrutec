BEGIN;

DO $$
DECLARE
    v_usuario_id UUID;
    v_proyecto_id UUID;
    v_presupuesto_id UUID;
    v_comprobante_id UUID;
BEGIN
    SELECT usuario_id
    INTO v_usuario_id
    FROM usuario
    WHERE email = 'andres.admin@example.com';

    INSERT INTO t_proyectos (
        nombre_proyecto,
        fecha_inicio_proyecto,
        fecha_fin_proyecto
    )
    VALUES (
        'Proyecto prueba moneda',
        CURRENT_DATE,
        NULL
    )
    RETURNING proyecto_id INTO v_proyecto_id;

    INSERT INTO presupuesto (
        proyecto_id,
        monto_total,
        categoria,
        moneda,
        saldo_disponible
    )
    VALUES (
        v_proyecto_id,
        1000.00,
        'Prueba moneda',
        'CRC',
        1000.00
    )
    RETURNING presupuesto_id INTO v_presupuesto_id;

    INSERT INTO comprobante (
        presupuesto_id,
        usuario_creador_id,
        fecha,
        negocio,
        descripcion,
        monto_gasto,
        moneda,
        tipo_comprobante,
        estado
    )
    VALUES (
        v_presupuesto_id,
        v_usuario_id,
        CURRENT_DATE,
        'Negocio de prueba',
        'Comprobante con moneda distinta al presupuesto',
        25.00,
        'USD',
        'FACTURA_FOTO',
        'PENDIENTE'
    )
    RETURNING comprobante_id INTO v_comprobante_id;

    BEGIN
        PERFORM aprobar_comprobante(
            v_comprobante_id,
            v_usuario_id,
            'Prueba de validacion de moneda'
        );
        RAISE EXCEPTION 'La aprobacion debio fallar por tipo de cambio faltante';
    EXCEPTION
        WHEN OTHERS THEN
            IF POSITION('Tipo de cambio requerido' IN SQLERRM) = 0 THEN
                RAISE;
            END IF;
    END;
END $$;

ROLLBACK;
