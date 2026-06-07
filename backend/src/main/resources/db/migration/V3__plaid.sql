-- V3__plaid.sql
-- Plaid access-token store (one row per app user, upserted on every connection).

CREATE TABLE IF NOT EXISTS plaid_tokens (
    user_id          varchar(255) NOT NULL,
    access_token     text         NOT NULL,
    item_id          varchar(255),
    institution_name varchar(255),
    updated_at       timestamp(6),
    CONSTRAINT pk_plaid_tokens PRIMARY KEY (user_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_plaid_tokens_user_id') THEN
    ALTER TABLE plaid_tokens
      ADD CONSTRAINT fk_plaid_tokens_user_id
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END $$;
