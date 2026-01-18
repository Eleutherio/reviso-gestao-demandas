-- V15 - Add database_name to agencies for multi-tenant database isolation
ALTER TABLE agencies
    ADD COLUMN IF NOT EXISTS database_name VARCHAR(63) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_agencies_database_name ON agencies (database_name);
