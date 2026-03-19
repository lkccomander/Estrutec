from psycopg.rows import dict_row


class ReceiptRepository:
    def __init__(self, connection):
        self._connection = connection

    def _receipt_select_clause(self) -> str:
        return """
                SELECT
                    comprobante_id,
                    presupuesto_id,
                    usuario_creador_id,
                    usuario_aprobador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    monto_presupuesto,
                    tipo_comprobante,
                    estado,
                    observacion,
                    (
                        SELECT mp.saldo_nuevo
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ) AS balance,
                    (
                        SELECT mp.created_at
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ) AS applied_at,
                    created_at,
                    updated_at
                FROM comprobante
        """

    def list_receipts(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {self._receipt_select_clause()}
                ORDER BY COALESCE(
                    (
                        SELECT mp.created_at
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ),
                    created_at
                ) DESC
                """
            )
            return cursor.fetchall()

    def list_receipts_by_creator(self, user_id: str) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                {self._receipt_select_clause()}
                WHERE usuario_creador_id = %s
                ORDER BY COALESCE(
                    (
                        SELECT mp.created_at
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ),
                    created_at
                ) DESC
                """,
                (user_id,),
            )
            return cursor.fetchall()

    def create_receipt(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO comprobante (
                    presupuesto_id,
                    usuario_creador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    tipo_comprobante,
                    estado,
                    observacion
                )
                VALUES (
                    %(presupuesto_id)s,
                    %(usuario_creador_id)s,
                    %(fecha)s,
                    %(numero_referencia)s,
                    %(numero_factura)s,
                    %(negocio)s,
                    %(cedula)s,
                    %(descripcion)s,
                    %(monto_gasto)s,
                    %(moneda)s,
                    %(tipo_cambio)s,
                    %(tipo_comprobante)s,
                    'PENDIENTE',
                    %(observacion)s
                )
                RETURNING
                    comprobante_id,
                    presupuesto_id,
                    usuario_creador_id,
                    usuario_aprobador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    monto_presupuesto,
                    tipo_comprobante,
                    estado,
                    observacion,
                    NULL::numeric AS balance,
                    created_at,
                    updated_at
                """,
                payload,
            )
            receipt = cursor.fetchone()
        self._connection.commit()
        return receipt

    def get_receipt(self, receipt_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    comprobante_id,
                    presupuesto_id,
                    usuario_creador_id,
                    usuario_aprobador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    monto_presupuesto,
                    tipo_comprobante,
                    estado,
                    observacion,
                    (
                        SELECT mp.saldo_nuevo
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ) AS balance,
                    created_at,
                    updated_at
                FROM comprobante
                WHERE comprobante_id = %s
                """,
                (receipt_id,),
            )
            return cursor.fetchone()

    def get_receipt_owner(self, receipt_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT comprobante_id, usuario_creador_id, usuario_aprobador_id, estado
                FROM comprobante
                WHERE comprobante_id = %s
                """,
                (receipt_id,),
            )
            return cursor.fetchone()

    def update_receipt(self, receipt_id: str, payload: dict) -> dict | None:
        if not payload:
            return self.get_receipt(receipt_id)

        allowed_fields = {
            "fecha",
            "numero_referencia",
            "numero_factura",
            "negocio",
            "cedula",
            "descripcion",
            "monto_gasto",
            "moneda",
            "tipo_cambio",
            "tipo_comprobante",
            "observacion",
        }
        fields = []
        values = []
        for key, value in payload.items():
            if key in allowed_fields:
                fields.append(f"{key} = %s")
                values.append(value)

        values.append(receipt_id)
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE comprobante
                SET {", ".join(fields)}
                WHERE comprobante_id = %s
                RETURNING
                    comprobante_id,
                    presupuesto_id,
                    usuario_creador_id,
                    usuario_aprobador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    monto_presupuesto,
                    tipo_comprobante,
                    estado,
                    observacion,
                    (
                        SELECT mp.saldo_nuevo
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ) AS balance,
                    created_at,
                    updated_at
                """,
                tuple(values),
            )
            receipt = cursor.fetchone()
        self._connection.commit()
        return receipt

    def delete_receipt(self, receipt_id: str) -> bool:
        with self._connection.cursor() as cursor:
            cursor.execute("DELETE FROM comprobante WHERE comprobante_id = %s", (receipt_id,))
            deleted = cursor.rowcount > 0
        self._connection.commit()
        return deleted

    def approve_receipt(self, receipt_id: str, approver_id: str, observacion: str | None) -> dict | None:
        try:
            with self._connection.cursor() as cursor:
                cursor.execute(
                    "SELECT aprobar_comprobante(%s, %s, %s)",
                    (receipt_id, approver_id, observacion),
                )
            self._connection.commit()
            return self.get_receipt(receipt_id)
        except Exception:
            self._connection.rollback()
            raise

    def reject_receipt(self, receipt_id: str, approver_id: str, observacion: str | None) -> dict | None:
        try:
            with self._connection.cursor() as cursor:
                cursor.execute(
                    "SELECT rechazar_comprobante(%s, %s, %s)",
                    (receipt_id, approver_id, observacion),
                )
            self._connection.commit()
            return self.get_receipt(receipt_id)
        except Exception:
            self._connection.rollback()
            raise

    def mark_receipt_pending(self, receipt_id: str, observacion: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE comprobante
                SET
                    estado = 'PENDIENTE',
                    observacion = %s
                WHERE comprobante_id = %s
                RETURNING
                    comprobante_id,
                    presupuesto_id,
                    usuario_creador_id,
                    usuario_aprobador_id,
                    fecha,
                    numero_referencia,
                    numero_factura,
                    negocio,
                    cedula,
                    descripcion,
                    monto_gasto,
                    moneda,
                    tipo_cambio,
                    monto_presupuesto,
                    tipo_comprobante,
                    estado,
                    observacion,
                    (
                        SELECT mp.saldo_nuevo
                        FROM movimiento_presupuesto mp
                        WHERE mp.comprobante_id = comprobante.comprobante_id
                        ORDER BY mp.created_at DESC
                        LIMIT 1
                    ) AS balance,
                    created_at,
                    updated_at
                """,
                (observacion, receipt_id),
            )
            receipt = cursor.fetchone()
        self._connection.commit()
        return receipt

    def list_attachments(self, receipt_id: str) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    adjunto_id,
                    comprobante_id,
                    cdn_path,
                    nombre_archivo,
                    tipo_archivo,
                    orden,
                    created_at
                FROM adjunto
                WHERE comprobante_id = %s
                ORDER BY orden ASC, created_at ASC
                """,
                (receipt_id,),
            )
            return cursor.fetchall()

    def create_attachment(self, receipt_id: str, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO adjunto (
                    comprobante_id,
                    cdn_path,
                    nombre_archivo,
                    tipo_archivo,
                    orden
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING
                    adjunto_id,
                    comprobante_id,
                    cdn_path,
                    nombre_archivo,
                    tipo_archivo,
                    orden,
                    created_at
                """,
                (
                    receipt_id,
                    payload["cdn_path"],
                    payload.get("nombre_archivo"),
                    payload.get("tipo_archivo"),
                    payload.get("orden", 1),
                ),
            )
            attachment = cursor.fetchone()
        self._connection.commit()
        return attachment

    def delete_attachment(self, receipt_id: str, attachment_id: str) -> bool:
        with self._connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM adjunto
                WHERE comprobante_id = %s AND adjunto_id = %s
                """,
                (receipt_id, attachment_id),
            )
            deleted = cursor.rowcount > 0
        self._connection.commit()
        return deleted
