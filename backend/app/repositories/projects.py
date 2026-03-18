from psycopg.rows import dict_row


class ProjectRepository:
    def __init__(self, connection):
        self._connection = connection

    def list_projects(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                FROM t_proyectos
                ORDER BY created_at DESC
                """
            )
            return cursor.fetchall()

    def create_project(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO t_proyectos (
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud
                )
                VALUES (
                    %(nombre_proyecto)s,
                    %(fecha_inicio_proyecto)s,
                    %(fecha_fin_proyecto)s,
                    %(latitud)s,
                    %(longitud)s
                )
                RETURNING
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                """,
                payload,
            )
            project = cursor.fetchone()
        self._connection.commit()
        return project

    def set_project_active(self, project_id: str, active: bool) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                UPDATE t_proyectos
                SET activo = %s
                WHERE proyecto_id = %s
                RETURNING
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                """,
                (active, project_id),
            )
            project = cursor.fetchone()
        self._connection.commit()
        return project

    def get_project(self, project_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                FROM t_proyectos
                WHERE proyecto_id = %s
                """,
                (project_id,),
            )
            return cursor.fetchone()

    def update_project(self, project_id: str, payload: dict) -> dict | None:
        if not payload:
            return self.get_project(project_id)

        allowed_fields = {"nombre_proyecto", "fecha_inicio_proyecto", "fecha_fin_proyecto", "latitud", "longitud"}
        fields = []
        values = []
        for key, value in payload.items():
            if key in allowed_fields:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return self.get_project(project_id)

        values.append(project_id)
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                f"""
                UPDATE t_proyectos
                SET {", ".join(fields)}
                WHERE proyecto_id = %s
                RETURNING
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                """,
                tuple(values),
            )
            project = cursor.fetchone()
        self._connection.commit()
        return project

    def delete_project(self, project_id: str) -> bool:
        with self._connection.cursor() as cursor:
            cursor.execute("DELETE FROM t_proyectos WHERE proyecto_id = %s", (project_id,))
            deleted = cursor.rowcount > 0
        self._connection.commit()
        return deleted

    def archive_project(self, project_id: str) -> dict | None:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute("SELECT archivar_proyecto(%s)", (project_id,))
            cursor.execute(
                """
                SELECT
                    proyecto_id,
                    nombre_proyecto,
                    fecha_inicio_proyecto,
                    fecha_fin_proyecto,
                    latitud,
                    longitud,
                    activo,
                    presupuesto_proyecto,
                    balance_proyecto,
                    created_at,
                    updated_at
                FROM t_proyectos
                WHERE proyecto_id = %s
                """,
                (project_id,),
            )
            project = cursor.fetchone()
        self._connection.commit()
        return project
