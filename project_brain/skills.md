# Skills del Proyecto

## Objetivo

Este archivo documenta los "skills" o capacidades especializadas que cualquier agente o colaborador debe aplicar dentro de Elatilo.

## Skills activos del proyecto

### 1. Arquitectura Python simple y mantenible

Aplicar:

- KISS
- Separation of Concerns
- Single Responsibility
- composicion sobre herencia

Regla practica:

- rutas HTTP en `backend/app/api/routes/`
- logica de negocio en `backend/app/services/`
- acceso a datos en `backend/app/repositories/`
- esquemas de entrada y salida en `backend/app/schemas/`

### 2. React/Vite pragmático

Aplicar:

- componentes simples
- fetch directo cuando no haga falta una libreria extra
- evitar sobreingenieria temprana
- priorizar UI funcional antes que complejidad de estado

Regla practica:

- el frontend vive en `frontend/src/`
- el login screen esta desacoplado del dashboard
- el dashboard solo se muestra si existe sesion valida
- `App.tsx` actua como orquestador mientras los dashboards se siguen extrayendo a `modules/`
- la entrada principal autenticada puede usar alias conversacionales como `dashboard1`
- cuando una entidad de negocio pasa a ser eje de navegacion, crear modulo propio antes que seguir cargando `App.tsx`

### 3. Base de datos como fuente fuerte de reglas criticas

Aplicar:

- reglas de aprobacion/rechazo importantes en PostgreSQL
- triggers y funciones para mantener consistencia
- no mover logica critica al frontend

Regla practica:

- `aprobar_comprobante()` y `rechazar_comprobante()` son el camino principal
- no usar `UPDATE` directo de estados como regla de negocio
- los `CASE` que alimentan enums en PostgreSQL deben castear explicitamente cuando haga falta

### 4. Compatibilidad automática de esquema

Aplicar:

- el backend ejecuta compatibilidad SQL en startup
- `DB.SQL` se corre en cada arranque
- migraciones versionadas se ejecutan una sola vez

Regla practica:

- usar `backend/main.py -> _run_startup_migrations()`
- registrar migraciones en `app_migration_log`

### 5. Multi-moneda con tipo de cambio explícito

Aplicar:

- `presupuesto` tiene moneda
- `comprobante` tiene moneda
- si son distintas, pedir `tipo_cambio`
- guardar `monto_presupuesto` convertido

Regla practica:

- el saldo del presupuesto siempre se ajusta en la moneda del presupuesto
- el tipo de cambio es ingresado por el usuario, no calculado por el sistema

### 6. Caja chica como fondeo controlado

Aplicar:

- `CAJA_CHICA` se registra como `tipo_comprobante`
- su aprobacion aumenta presupuesto en vez de consumirlo
- el movimiento asociado debe quedar como `AUMENTO`

Regla practica:

- el frontend debe distinguir visualmente `CAJA_CHICA` de un gasto normal
- el backend debe dejar toda la logica de impacto presupuestario en SQL

### 7. Frontend operativo y reutilizable

Aplicar:

- modulos pequeños cuando un area ya merece separacion
- utilidades reales antes de sobre-refactorizar
- branding y activos del proyecto en `frontend/public/`

Regla practica:

- `ProjectsDashboard` concentra la entrada principal autenticada de proyectos
- `ProjectBudgetsDashboard` concentra presupuestos por proyecto
- `UsersDashboard` concentra altas y mantenimiento de usuarios
- `IconsDashboard` sirve como galeria de seleccion de iconos
- exportaciones puntuales pueden resolverse con `xlsx` sin introducir una capa extra

### 8. Navegacion guiada por contexto

Aplicar:

- entrar a presupuestos desde un proyecto concreto
- acercar acciones a la tarjeta o registro que representan
- usar alias visibles cuando el flujo ya tuvo varias correcciones

Regla practica:

- si una accion pertenece a un proyecto listado, poner el boton en esa tarjeta
- en detalle de presupuesto, reducir paneles auxiliares y priorizar foco operativo
- evitar navegaciones flotantes si introducen ruido o duplican tabs ya existentes

### 9. Feedback y consistencia visual

Aplicar:

- mensajes de retroalimentacion debajo del boton que dispara la accion
- iconografia clara y consistente
- alinear paneles equivalentes por estructura, no solo por padding cosmetico

Regla practica:

- exito con `FiBell` y `✅`
- error con `HiOutlineExclamationTriangle`
- si dos paneles deben verse iguales, preferir la misma estructura `card-group` antes que hacks de margen

## Skills deseados a futuro

- terminar de dividir `App.tsx` por dominio
- branding completo en `index.html` y configuracion de Vite
- cambio de password desde mantenimiento de usuarios
- manejo real de archivos para adjuntos
- pruebas automaticas backend/frontend
- auditoria completa de cambios
- seguir extrayendo logica de `App.tsx` que aun mezcla navegacion y datos

## Regla de contexto

Antes de modificar el proyecto, revisar:

- [decision.md](/mnt/c/Projects/Elatilo/project_brain/decision.md)
- [umldiagrams.md](/mnt/c/Projects/Elatilo/project_brain/umldiagrams.md)
- [DB.SQL](/mnt/c/Projects/Elatilo/DATABASE/DB.SQL)
