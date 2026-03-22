USE nev_coder;

ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS purpose ENUM('email_verification', 'password_reset') NOT NULL DEFAULT 'email_verification' AFTER otp_code;

CREATE INDEX IF NOT EXISTS idx_otp_purpose ON otp_codes(purpose);
