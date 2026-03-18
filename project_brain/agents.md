# Agents Context

## Resumen

Elatilo es una app para registrar gastos y comprobantes contra presupuestos, con aprobacion, rechazo, adjuntos, auditoria de movimientos y soporte multi-moneda con tipo de cambio explicito.

Hoy tambien quedo modelado el flujo de `CAJA_CHICA` como un tipo de comprobante especial que, al aprobarse, puede aumentar el presupuesto en lugar de consumirlo.

## Tech Stack

### Backend

- Python
- FastAPI
- psycopg
- python-dotenv
- pydantic
- python-jose
- passlib
- argon2-cffi

Dependencias actuales en [requirements.txt](/mnt/c/Projects/Elatilo/backend/requirements.txt):

- `fastapi`
- `uvicorn`
- `psycopg[binary]`
- `python-dotenv`
- `pydantic`
- `python-jose[cryptography]`
- `passlib[bcrypt]`
- `argon2-cffi`

### Frontend

- React 19
- React DOM
- TypeScript
- Vite
- ESLint
- react-icons
- xlsx

Dependencias actuales en [package.json](/mnt/c/Projects/Elatilo/frontend/package.json).

### Base de datos

- PostgreSQL
- funciones SQL
- triggers
- restricciones
- migraciones SQL versionadas

## Arquitectura

### Backend

Estructura:

- `backend/main.py`
- `backend/app/api/routes/`
- `backend/app/services/`
- `backend/app/repositories/`
- `backend/app/schemas/`
- `backend/app/db/`

Responsabilidades:

- `routes`: HTTP y validacion de entrada/salida
- `services`: orquestacion y traduccion de errores a respuestas HTTP
- `repositories`: SQL y acceso a PostgreSQL
- `schemas`: contratos Pydantic

### Frontend

Estado actual:

- `frontend/src/App.tsx` sigue siendo el orquestador principal
- `frontend/src/modules/projects/ProjectsDashboard.tsx` concentra crear, mantener y listar proyectos
- `frontend/src/modules/budgets/ProjectBudgetsDashboard.tsx` concentra la seccion de presupuestos cuando ya existe un proyecto seleccionado
- `frontend/src/modules/users/UsersDashboard.tsx` separa la gestion de usuarios
- `frontend/src/modules/users/UsersListView.tsx` encapsula el listado de usuarios
- `frontend/src/modules/icons/IconsDashboard.tsx` funciona como galeria visual para seleccionar iconografia

Reglas:

- login screen desacoplado del dashboard
- el dashboard solo aparece con sesion valida
- `App.tsx` sigue siendo orquestador, aunque aun contiene bastante logica compartida
- el frontend usa `fetch`
- el JWT se guarda en `localStorage`
- la URL base del API sale de `VITE_API_URL`
- la primera vista autenticada se enfoca en presupuestos
- la entrada de `Presupuestos` ahora arranca en un alias visual de `dashboard1`
- `dashboard1` ya no muestra el panel horizontal superior de proyectos; se enfoca en mantenimiento y listado
- el detalle de un presupuesto vive como dashboard propio dentro del flujo principal
- el detalle de presupuesto ya no muestra `Estado del entorno`; solo `Presupuesto activo`
- la navegacion lateral flotante fue removida

Trabajo visible de hoy en frontend:

- soporte visual para tema `dark/light`
- integracion de logos en `frontend/public/`
- exportacion de comprobantes aprobados a Excel con `xlsx`
- soporte UI para `CAJA_CHICA`
- galeria de iconos basada en `react-icons`
- mantenimiento completo de proyectos en `dashboard1`
- navegacion interna `Proyectos -> Presupuestos -> Detalle de presupuesto`
- alias visual `dashboard1` en la vista principal autenticada
- boton contextual `Presupuestos` por proyecto dentro del listado, con `PiPiggyBankBold`
- boton `Actualizar proyecto` con `HiOutlineClipboardDocumentList`
- feedback contextual debajo del boton que ejecuta la accion
- ensanche global del dashboard ajustando `.container` a `1320px`
- correcciones repetidas de alineacion y ancho en el detalle de presupuesto, separando `Presupuesto activo` como `card-group` propio para igualar estructura con `Crear comprobante` y `Comprobantes`
- `Dashboard` ahora funciona como vista analitica con cards resumen
- historial de saldo por proyectos con series de `saldo disponible`, `gastos acumulados` y `saldo total`
- interaccion para ocultar o mostrar proyectos desde badges y cards del historial
- grafico de dona por proyectos basado en presupuesto total
- panel de mapa de Costa Rica con marcadores por coordenadas de proyecto
- mantenimiento de proyectos extendido con `latitud` y `longitud`

Pendiente visible:

- [index.html](/mnt/c/Projects/Elatilo/frontend/index.html) y [vite.config.ts](/mnt/c/Projects/Elatilo/frontend/vite.config.ts) siguen practicamente con plantilla base de Vite y aun no reflejan branding ni configuracion avanzada del proyecto
- siguiente frente de trabajo acordado: `CI/CD` para despliegue en `Railway`
- plan inicial: GitHub Actions para `CI`, Railway para `CD`, con servicios separados de `backend` y `frontend`
- el backend debe considerar migraciones en `pre-deploy`

## Autenticacion

Modelo:

- JWT bearer token
- passwords hasheadas con Argon2 para nuevos usuarios
- compatibilidad con hashes viejos via Passlib

Endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Roles:

- `ADMIN`
- `APROBADOR`
- `REGISTRADOR`

Autorizacion:

- algunos endpoints requieren token
- algunas acciones requieren `ADMIN`
- algunas acciones permiten `ADMIN` y `APROBADOR`

## Base de datos

### Tablas

- `usuario`
- `t_proyectos`
- `presupuesto`
- `comprobante`
- `adjunto`
- `movimiento_presupuesto`

### Enums

- `rol_usuario`
- `tipo_comprobante`
- `moneda`
- `estado_comprobante`
- `estado_presupuesto`
- `tipo_movimiento_presupuesto`

### Reglas clave

#### Presupuestos

- pertenecen obligatoriamente a un proyecto
- tienen `monto_total`
- tienen `saldo_disponible`
- tienen `moneda`
- el saldo no puede superar el monto

#### Proyectos

- tienen `nombre_proyecto` unico
- tienen `fecha_inicio_proyecto`
- pueden tener `fecha_fin_proyecto`
- tienen `presupuesto_proyecto`
- tienen `balance_proyecto`
- tienen `activo`
- pueden archivarse y reactivarse

#### Comprobantes

- pertenecen a un presupuesto
- tienen `monto_gasto`
- tienen `moneda`
- pueden tener `tipo_cambio`
- pueden tener `monto_presupuesto`
- pueden ser `FACTURA_FOTO`, `SINPE_MOVIL` o `CAJA_CHICA`

#### Multi-moneda

Si la moneda del comprobante es distinta a la del presupuesto:

- el sistema pide `tipo_cambio`
- el sistema calcula `monto_presupuesto`
- el saldo se consume o se aumenta usando `monto_presupuesto`

Si la moneda es la misma:

- `tipo_cambio` no es requerido
- `monto_presupuesto` puede igualar el monto del comprobante al aprobar

#### Aprobacion

La aprobacion no debe hacerse con `UPDATE` manual desde la app.

Se debe usar:

- `aprobar_comprobante()`

Esta funcion:

- valida estado actual
- valida presupuesto existente
- valida saldo suficiente para comprobantes normales
- valida tipo de cambio si hay monedas distintas
- actualiza saldo del presupuesto
- aumenta `monto_total` y `saldo_disponible` cuando el comprobante es `CAJA_CHICA`
- marca el comprobante como aprobado
- registra movimiento en `movimiento_presupuesto`

#### Rechazo

Se debe usar:

- `rechazar_comprobante()`

Esta funcion:

- valida estado actual
- marca el comprobante como rechazado
- no toca saldo del presupuesto

#### Estados protegidos

Hay triggers y funciones para:

- actualizar `updated_at`
- bloquear cambios criticos en comprobantes aprobados
- bloquear borrado de comprobantes aprobados
- bloquear cambios en adjuntos de comprobantes aprobados

## Compatibilidad de esquema

En [main.py](/mnt/c/Projects/Elatilo/backend/main.py) existe:

- `def _run_startup_migrations():`

Comportamiento:

- corre [DB.SQL](/mnt/c/Projects/Elatilo/DATABASE/DB.SQL) en cada arranque
- corre migraciones versionadas una sola vez
- hoy incluye la migracion `004_add_caja_chica_tipo_comprobante.sql`
