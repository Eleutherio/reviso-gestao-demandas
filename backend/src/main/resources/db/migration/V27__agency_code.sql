-- V27: Codigo da agencia
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agency_code VARCHAR(32);

UPDATE agencies
SET agency_code = COALESCE(agency_code, 'AGY-' || UPPER(SUBSTRING(id::text, 1, 8)));

ALTER TABLE agencies ALTER COLUMN agency_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_code_unique ON agencies(LOWER(agency_code));
