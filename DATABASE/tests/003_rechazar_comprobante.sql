BEGIN;

DO $$
DECLARE
    v_usuario_id UUID;
    v_proyecto_id UUID;
    v_presupuesto_id UUID;
    v_comprobante_id UUID;
    v_saldo_final NUMERIC(14,2);
    v_estado_final estado_comprobante;
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
        'Proyecto prueba rechazo',
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
        500.00,
        'Prueba rechazo',
        'CRC',
        500.00
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
        'Comprobante para rechazo',
        80.00,
        'CRC',
        'FACTURA_FOTO',
        'PENDIENTE'
    )
    RETURNING comprobante_id INTO v_comprobante_id;

    PERFORM rechazar_comprobante(
        v_comprobante_id,
        v_usuario_id,
        'Prueba de rechazo'
    );

    SELECT saldo_disponible
    INTO v_saldo_final
    FROM presupuesto
    WHERE presupuesto_id = v_presupuesto_id;

    IF v_saldo_final <> 500.00 THEN
        RAISE EXCEPTION
            'El rechazo no debe alterar el saldo. Esperado: 500.00, actual: %',
            v_saldo_final;
    END IF;

    SELECT estado
    INTO v_estado_final
    FROM comprobante
    WHERE comprobante_id = v_comprobante_id;

    IF v_estado_final <> 'RECHAZADO' THEN
        RAISE EXCEPTION
            'Estado incorrecto. Esperado: RECHAZADO, actual: %',
            v_estado_final;
    END IF;
END $$;

ROLLBACK;
