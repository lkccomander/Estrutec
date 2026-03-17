ERROR:    Traceback (most recent call last):
  File "C:\Projects\Elatilo\backend\main.py", line 38, in _run_startup_migrations
    cursor.execute(baseline_sql.read_text(encoding="utf-8"))
    ~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\psycopg\cursor.py", line 117, in execute
    raise ex.with_traceback(None)
psycopg.errors.UniqueViolation: could not create unique index "uq_t_proyectos_nombre_proyecto"
DETAIL:  Key (nombre_proyecto)=(Proyecto migrado) is duplicated.
CONTEXT:  SQL statement "ALTER TABLE t_proyectos
        ADD CONSTRAINT uq_t_proyectos_nombre_proyecto
        UNIQUE (nombre_proyecto)"
PL/pgSQL function inline_code_block line 8 at SQL statement

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\starlette\routing.py", line 694, in lifespan
    async with self.lifespan_context(app) as maybe_state:
               ~~~~~~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Users\lkcco\AppData\Local\Python\pythoncore-3.14-64\Lib\contextlib.py", line 214, in __aenter__
    return await anext(self.gen)
           ^^^^^^^^^^^^^^^^^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 212, in merged_lifespan
    async with original_context(app) as maybe_original_state:
               ~~~~~~~~~~~~~~~~^^^^^
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 237, in __aenter__
    await self._router._startup()
  File "C:\Projects\Elatilo\backend\.venv\Lib\site-packages\fastapi\routing.py", line 4882, in _startup
    handler()
    ~~~~~~~^^
  File "C:\Projects\Elatilo\backend\main.py", line 63, in _run_startup_migrations
    raise RuntimeError(
    ...<2 lines>...
    ) from exc
RuntimeError: No se pudieron ejecutar las migraciones de arranque. Revisa permisos de la base de datos y el contenido de DATABASE/.

ERROR:    Application startup failed. Exiting.