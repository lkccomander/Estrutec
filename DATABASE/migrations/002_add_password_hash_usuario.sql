BEGIN;

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE usuario
SET password_hash = crypt('Admin123!', gen_salt('bf'))
WHERE email = 'andres.admin@example.com'
  AND (password_hash IS NULL OR length(trim(password_hash)) = 0);

UPDATE usuario
SET password_hash = crypt('Aprobador123!', gen_salt('bf'))
WHERE email = 'maria.aprobadora@example.com'
  AND (password_hash IS NULL OR length(trim(password_hash)) = 0);

UPDATE usuario
SET password_hash = crypt('Registrador123!', gen_salt('bf'))
WHERE email = 'luis.registrador@example.com'
  AND (password_hash IS NULL OR length(trim(password_hash)) = 0);

ALTER TABLE usuario
ALTER COLUMN password_hash SET NOT NULL;

COMMIT;
