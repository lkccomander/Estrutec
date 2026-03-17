Dos observaciones importantes:

En este diseño todavía se podría cambiar estado manualmente con un UPDATE directo.
Mejor práctica: que la app use solo aprobar_comprobante() y rechazar_comprobante() y no actualice estado directamente.

Hay un detalle de moneda: hoy permites presupuestos en general y comprobantes con CRC o USD, pero presupuesto no tiene moneda.
Eso está flojo. Lo correcto sería agregar moneda a presupuesto o manejar tipo de cambio.

La mejora más importante siguiente sería esa: agregar moneda al presupuesto y validar que el comprobante use la misma moneda.

Decision actualizada:

El presupuesto tambien debe tener moneda.
Si el comprobante usa una moneda distinta, el sistema debe pedir tipo de cambio.

Regla adoptada:

- tipo_cambio se interpreta como la referencia habitual local: CRC por 1 USD
- monto_presupuesto guarda el monto convertido para trazabilidad
- si la moneda es igual, tipo_cambio no es requerido

Ejemplo:

- Presupuesto en USD y comprobante en CRC -> monto_presupuesto = monto_gasto / tipo_cambio
- Presupuesto en CRC y comprobante en USD -> monto_presupuesto = monto_gasto * tipo_cambio
