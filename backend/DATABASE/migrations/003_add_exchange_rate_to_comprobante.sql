BEGIN;

ALTER TABLE comprobante
ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(14,6) NULL;

ALTER TABLE comprobante
ADD COLUMN IF NOT EXISTS monto_presupuesto NUMERIC(14,2) NULL;

ALTER TABLE comprobante
DROP CONSTRAINT IF EXISTS chk_comprobante_tipo_cambio_positivo;

ALTER TABLE comprobante
ADD CONSTRAINT chk_comprobante_tipo_cambio_positivo
CHECK (tipo_cambio IS NULL OR tipo_cambio > 0);

ALTER TABLE comprobante
DROP CONSTRAINT IF EXISTS chk_comprobante_monto_presupuesto_positivo;

ALTER TABLE comprobante
ADD CONSTRAINT chk_comprobante_monto_presupuesto_positivo
CHECK (monto_presupuesto IS NULL OR monto_presupuesto > 0);

COMMIT;
