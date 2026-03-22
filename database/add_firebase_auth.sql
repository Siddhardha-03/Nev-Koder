USE nev_coder;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE NULL AFTER password_hash,
  ADD COLUMN IF NOT EXISTS auth_provider ENUM('legacy', 'firebase') NOT NULL DEFAULT 'legacy' AFTER firebase_uid;

CREATE INDEX IF NOT EXISTS idx_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_auth_provider ON users(auth_provider);
