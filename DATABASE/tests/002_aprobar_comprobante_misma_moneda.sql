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
        'Proyecto prueba aprobacion',
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
        'Prueba aprobacion',
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
        'Comprobante con misma moneda que el presupuesto',
        125.50,
        'CRC',
        'FACTURA_FOTO',
        'PENDIENTE'
    )
    RETURNING comprobante_id INTO v_comprobante_id;

    PERFORM aprobar_comprobante(
        v_comprobante_id,
        v_usuario_id,
        'Prueba de aprobacion exitosa'
    );

    SELECT saldo_disponible
    INTO v_saldo_final
    FROM presupuesto
    WHERE presupuesto_id = v_presupuesto_id;

    IF v_saldo_final <> 874.50 THEN
        RAISE EXCEPTION
            'Saldo incorrecto. Esperado: 874.50, actual: %',
            v_saldo_final;
    END IF;

    SELECT estado
    INTO v_estado_final
    FROM comprobante
    WHERE comprobante_id = v_comprobante_id;

    IF v_estado_final <> 'APROBADO' THEN
        RAISE EXCEPTION
            'Estado incorrecto. Esperado: APROBADO, actual: %',
            v_estado_final;
    END IF;
END $$;

ROLLBACK;
