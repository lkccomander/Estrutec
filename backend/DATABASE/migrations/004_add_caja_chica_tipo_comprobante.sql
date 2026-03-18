BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'CAJA_CHICA'
          AND enumtypid = 'tipo_comprobante'::regtype
    ) THEN
        ALTER TYPE tipo_comprobante ADD VALUE 'CAJA_CHICA';
    END IF;
END $$;

COMMIT;
