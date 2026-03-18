from psycopg.rows import dict_row


class LogEntryRepository:
    def __init__(self, connection):
        self._connection = connection

    def list_entries(self) -> list[dict]:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                SELECT
                    l.log_id,
                    l.mensaje,
                    l.usuario_id,
                    u.nombre AS autor_nombre,
                    u.email AS autor_email,
                    l.created_at
                FROM log_entry l
                JOIN usuario u ON u.usuario_id = l.usuario_id
                ORDER BY l.created_at DESC
                """
            )
            return cursor.fetchall()

    def create_entry(self, payload: dict) -> dict:
        with self._connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO log_entry (
                    mensaje,
                    usuario_id
                )
                VALUES (
                    %(mensaje)s,
                    %(usuario_id)s
                )
                RETURNING log_id
                """,
                payload,
            )
            log_id = cursor.fetchone()["log_id"]
            cursor.execute(
                """
                SELECT
                    l.log_id,
                    l.mensaje,
                    l.usuario_id,
                    u.nombre AS autor_nombre,
                    u.email AS autor_email,
                    l.created_at
                FROM log_entry l
                JOIN usuario u ON u.usuario_id = l.usuario_id
                WHERE l.log_id = %s
                """,
                (log_id,),
            )
            entry = cursor.fetchone()
        self._connection.commit()
        return entry
