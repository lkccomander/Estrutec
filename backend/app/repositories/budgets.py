from psycopg.rows import dict_row


class BudgetRepository:
    def __init__(self, connection):
        self._connection = connection

    def list_budgets(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    p.presupuesto_id,
                    p.proyecto_id,
                    tp.nombre_proyecto,
                    p.monto_total,
                    p.categoria,
                    p.moneda,
                    p.saldo_disponible,
                    p.fecha_creacion,
                    p.estado,
                    p.created_at,
                    p.updated_at
                FROM presupuesto p
                JOIN t_proyectos tp
                  ON tp.proyecto_id = p.proyecto_id
                ORDER BY p.created_at DESC
                """
            )
            return cursor.fetchall()

    def create_budget(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO presupuesto (
                    proyecto_id,
                    monto_total,
                    categoria,
                    moneda,
                    saldo_disponible
                )
                SELECT
                    %(proyecto_id)s,
                    %(monto_total)s,
                    %(categoria)s,
                    %(moneda)s,
                    %(monto_total)s
                FROM t_proyectos
                WHERE proyecto_id = %(proyecto_id)s
                  AND activo = TRUE
                RETURNING
                    presupuesto_id,
                    proyecto_id,
                    monto_total,
                    categoria,
                    moneda,
                    saldo_disponible,
                    fecha_creacion,
                    estado,
                    created_at,
                    updated_at
                """,
                payload,
            )
            budget = cursor.fetchone()
            if budget:
                cursor.execute(
                    "SELECT nombre_proyecto FROM t_proyectos WHERE proyecto_id = %s",
                    (budget["proyecto_id"],),
                )
                project = cursor.fetchone()
                budget["nombre_proyecto"] = project["nombre_proyecto"] if project else None
        self._connection.commit()
        return budget

    def get_budget(self, budget_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    p.presupuesto_id,
                    p.proyecto_id,
                    tp.nombre_proyecto,
                    p.monto_total,
                    p.categoria,
                    p.moneda,
                    p.saldo_disponible,
                    p.fecha_creacion,
                    p.estado,
                    p.created_at,
                    p.updated_at
                FROM presupuesto p
                JOIN t_proyectos tp
                  ON tp.proyecto_id = p.proyecto_id
                WHERE p.presupuesto_id = %s
                """,
                (budget_id,),
            )
            return cursor.fetchone()

    def update_budget(self, budget_id: str, payload: dict) -> dict | None:
        if not payload:
            return self.get_budget(budget_id)

        allowed_fields = {"proyecto_id", "monto_total", "categoria", "moneda", "estado"}
        fields = []
        values = []
        for key, value in payload.items():
            if key in allowed_fields:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return self.get_budget(budget_id)

        if "monto_total" in payload and "monto_total = %s" in fields:
            fields.append("saldo_disponible = LEAST(saldo_disponible, %s)")
            values.append(payload["monto_total"])

        values.append(budget_id)
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE presupuesto
                SET {", ".join(fields)}
                WHERE presupuesto_id = %s
                RETURNING
                    presupuesto_id,
                    proyecto_id,
                    monto_total,
                    categoria,
                    moneda,
                    saldo_disponible,
                    fecha_creacion,
                    estado,
                    created_at,
                    updated_at
                """,
                tuple(values),
            )
            budget = cursor.fetchone()
            if budget:
                cursor.execute(
                    "SELECT nombre_proyecto FROM t_proyectos WHERE proyecto_id = %s",
                    (budget["proyecto_id"],),
                )
                project = cursor.fetchone()
                budget["nombre_proyecto"] = project["nombre_proyecto"] if project else None
        self._connection.commit()
        return budget

    def delete_budget(self, budget_id: str) -> bool:
        with self._connection.cursor() as cursor:
            cursor.execute("DELETE FROM presupuesto WHERE presupuesto_id = %s", (budget_id,))
            deleted = cursor.rowcount > 0
        self._connection.commit()
        return deleted

    def list_movements(self, budget_id: str) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    movimiento_id,
                    presupuesto_id,
                    comprobante_id,
                    usuario_id,
                    tipo_movimiento,
                    monto,
                    saldo_anterior,
                    saldo_nuevo,
                    moneda,
                    descripcion,
                    referencia_externa,
                    created_at
                FROM movimiento_presupuesto
                WHERE presupuesto_id = %s
                ORDER BY created_at DESC
                """,
                (budget_id,),
            )
            return cursor.fetchall()
