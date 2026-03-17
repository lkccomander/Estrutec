# Decision Log

## 1. Startup migrations desde FastAPI

Se decidio que el backend ejecute la compatibilidad de esquema al arrancar, en lugar de depender de comandos manuales con `psql`.

Implementacion:

- en [main.py](/mnt/c/Projects/Elatilo/backend/main.py) existe `def _run_startup_migrations():`
- esta funcion corre en el evento `startup` de FastAPI
- ejecuta siempre [DB.SQL](/mnt/c/Projects/Elatilo/DATABASE/DB.SQL)
- ejecuta una sola vez los archivos versionados de [DATABASE/migrations](/mnt/c/Projects/Elatilo/DATABASE/migrations)
- usa la tabla `app_migration_log` para registrar migraciones aplicadas

Motivo:

- evitar pasos manuales al levantar el backend
- mantener funciones, triggers y cambios compatibles de forma automatica
- reducir errores por olvido de aplicar scripts SQL

Condicion:

- el usuario configurado en `DATABASE_URL` debe tener permisos suficientes sobre la base

## 2. Moneda de presupuesto y comprobante

Se decidio que `presupuesto` tenga moneda propia y que `comprobante` tambien guarde su moneda.

Motivo:

- el saldo del presupuesto solo es confiable si existe una regla clara de conversion o coincidencia de moneda

## 3. Soporte de tipo de cambio

La regla original de solo permitir comprobantes en la misma moneda del presupuesto fue reemplazada.

Nueva decision:

- si el comprobante tiene una moneda distinta a la del presupuesto, el sistema debe pedir `tipo_cambio`
- `tipo_cambio` convierte el monto del comprobante a la moneda del presupuesto
- `monto_presupuesto` guarda el monto convertido para trazabilidad
- si la moneda es la misma, `tipo_cambio` no es requerido

Ejemplo:

- presupuesto en `USD`
- comprobante en `CRC`
- el usuario ingresa un `tipo_cambio` para convertir `CRC` a `USD`
- el descuento del saldo se hace con `monto_presupuesto`

## 4. Aprobacion de comprobantes

La aprobacion debe pasar por la funcion SQL `aprobar_comprobante()`.

Motivo:

- centralizar reglas criticas en base de datos
- asegurar consistencia entre estado del comprobante, saldo del presupuesto y movimiento de auditoria

Reglas actuales:

- si hay saldo suficiente, el comprobante pasa a `APROBADO`
- si falta saldo, no se aprueba
- si falta tipo de cambio en monedas distintas, no se aprueba
- si hay error de conversion o moneda, el comprobante queda `PENDIENTE` con observacion clara

## 5. Rechazo y estados

La app no deberia cambiar estados criticos con `UPDATE` directo como regla de negocio.

Regla:

- aprobar usando `aprobar_comprobante()`
- rechazar usando `rechazar_comprobante()`

Esto mantiene consistencia con triggers, restricciones y movimientos presupuestarios.

## 6. Modularizacion del frontend por dashboards

Se decidio que el frontend no debe crecer con multiples `App.tsx` ni con un solo archivo monolitico.

Decision:

- mantener un unico [App.tsx](/mnt/c/Projects/Elatilo/frontend/src/App.tsx) como orquestador principal
- separar pantallas y paneles en modulos reutilizables
- crear dashboards especificos por dominio funcional

Estado actual aterrizado:

- `frontend/src/modules/projects/ProjectsDashboard.tsx`
- `frontend/src/modules/budgets/ProjectBudgetsDashboard.tsx`
- `frontend/src/modules/users/UsersDashboard.tsx`
- `frontend/src/modules/users/UsersListView.tsx`
- `frontend/src/modules/icons/IconsDashboard.tsx`

Regla de navegacion actual:

- la primera vista autenticada sigue entrando por `Presupuestos`, pero la UI la nombra visualmente como `dashboard1`
- `dashboard1` muestra primero mantenimiento y listado de proyectos
- desde el listado de proyectos se entra a la seccion de presupuestos por proyecto
- al hacer click en un presupuesto, se entra a un dashboard dedicado de ese presupuesto
- ese dashboard secundario contiene comprobantes, movimientos y adjuntos asociados a ese presupuesto

Motivo:

- mejorar mantenimiento
- evitar que `App.tsx` siga creciendo como archivo unico
- permitir evolucionar cada dominio sin mezclar responsabilidades

## 7. Caja chica como comprobante que fondea presupuesto

Hoy se consolido la decision de soportar `CAJA_CHICA` como valor de `tipo_comprobante`.

Decision:

- `CAJA_CHICA` entra por el mismo flujo de comprobantes
- al aprobarse, no consume saldo; aumenta el presupuesto
- el movimiento presupuestario asociado debe registrarse como `AUMENTO`
- si aplica conversion, el monto que impacta el presupuesto sigue siendo `monto_presupuesto`

Implementacion asociada:

- [DATABASE/migrations/004_add_caja_chica_tipo_comprobante.sql](/mnt/c/Projects/Elatilo/DATABASE/migrations/004_add_caja_chica_tipo_comprobante.sql)
- logica actualizada en [DB.SQL](/mnt/c/Projects/Elatilo/DATABASE/DB.SQL)
- soporte visual en [App.tsx](/mnt/c/Projects/Elatilo/frontend/src/App.tsx)

## 8. Cast explicito al enum de movimiento en PostgreSQL

Se detecto un error al insertar movimientos desde `aprobar_comprobante()` cuando la expresion `CASE` devolvia texto y la columna esperaba `tipo_movimiento_presupuesto`.

Decision:

- el `CASE` debe castear explicitamente a `tipo_movimiento_presupuesto`

Motivo:

- evitar fallos en tiempo de ejecucion al aprobar comprobantes
- hacer estable el flujo de `CAJA_CHICA` y `CONSUMO` dentro de la misma funcion SQL

Referencia:

- error observado en [error.md](/mnt/c/Projects/Elatilo/error.md)

## 9. Frontend con utilidades operativas antes de refactor total

Se priorizo agregar valor funcional al frontend actual antes de una separacion mas profunda.

Hoy quedaron asentadas estas utilidades:

- cambio de tema `dark/light`
- exportacion de comprobantes aprobados a Excel con `xlsx`
- galeria visual de iconos con `react-icons`
- uso de logos locales del proyecto

Tradeoff:

- `App.tsx` sigue grande
- pero la app ya gana operaciones utiles mientras se migra por modulos

## 10. Proyecto como agregado raiz de presupuestos

Se decidio que `proyecto` sea el contenedor funcional principal de `presupuesto`.

Decision:

- un proyecto puede tener muchos presupuestos
- cada presupuesto debe pertenecer a un proyecto
- la navegacion principal del frontend debe partir de proyectos antes de bajar a presupuestos
- los proyectos pueden archivarse sin perder trazabilidad historica

Motivo:

- ordenar mejor el flujo del usuario
- evitar listas globales de presupuestos sin contexto
- simplificar filtros, mantenimiento y lectura del estado financiero

## 11. Archivado de proyectos y filtro por activos por defecto

Se decidio agregar `activo` a `t_proyectos` y operar archivado/reactivacion.

Decision:

- `nombre_proyecto` debe ser unico
- el filtro por defecto del dashboard principal debe ser proyectos activos
- no se deben crear presupuestos sobre proyectos archivados

Motivo:

- mantener higiene operativa en la UI
- evitar que proyectos viejos contaminen la operacion diaria
- impedir asociaciones nuevas sobre proyectos cerrados

## 12. Dashboard1 como alias operativo de la entrada principal

Durante las correcciones de navegabilidad se decidio usar un alias explicito para la primera vista autenticada.

Decision:

- la entrada principal del dominio de presupuestos se etiqueta visualmente como `dashboard1`
- `dashboard1` concentra proyectos y la entrada a presupuestos
- el detalle de presupuesto queda como dashboard secundario y no debe competir visualmente con la vista principal

Motivo:

- reducir perdida de contexto durante iteraciones de UI
- facilitar referencia conversacional entre usuario y agente

## 13. El detalle de presupuesto debe ser mas simple que la vista principal

Se hicieron varias correcciones visuales en el flujo de detalle del presupuesto.

Decision final:

- remover `Estado del entorno` de la cabecera del detalle
- mostrar `Presupuesto activo` como `card-group` propio
- alinear estructuralmente ese panel con `Crear comprobante` y `Comprobantes`
- eliminar la navegacion flotante izquierda que estaba agregando complejidad visual

Motivo:

- el detalle necesita foco en operacion, no en telemetria
- la estructura visual debe ser consistente entre paneles equivalentes

## 14. Acciones de presupuestos desde cada proyecto listado

Se decidio que la entrada a presupuestos no viva en el segundo panel de mantenimiento, sino en cada item del listado de proyectos.

Decision:

- cada tarjeta de proyecto lista su propio boton azul `Presupuestos`
- ese boton se ubica arriba a la derecha junto al badge de estado
- el boton usa `PiPiggyBankBold`
- el boton `Actualizar proyecto` usa `HiOutlineClipboardDocumentList`

Motivo:

- acercar la accion al dato
- reducir pasos para navegar por proyecto
- mejorar claridad visual de que los presupuestos pertenecen a un proyecto concreto
