-- V25 - Convites de usuario
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL,
    email VARCHAR(160) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    role user_role NOT NULL,
    agency_id UUID NOT NULL REFERENCES agencies(id),
    company_id UUID REFERENCES companies(id),
    access_profile_id UUID REFERENCES access_profiles(id),
    status invite_status NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_user_invites_token_hash
    ON user_invites (token_hash);

CREATE INDEX IF NOT EXISTS idx_user_invites_agency_id
    ON user_invites (agency_id);

CREATE INDEX IF NOT EXISTS idx_user_invites_email_status
    ON user_invites (email, status);

CREATE INDEX IF NOT EXISTS idx_user_invites_status_expires
    ON user_invites (status, expires_at);
