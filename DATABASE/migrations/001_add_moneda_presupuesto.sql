BEGIN;

ALTER TABLE presupuesto
ADD COLUMN IF NOT EXISTS moneda moneda;

UPDATE presupuesto
SET moneda = 'CRC'
WHERE moneda IS NULL;

ALTER TABLE presupuesto
ALTER COLUMN moneda SET NOT NULL;

COMMIT;
