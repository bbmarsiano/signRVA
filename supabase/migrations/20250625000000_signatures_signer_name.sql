-- Store display name on each signature row for combined .p7s export
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS signer_name text;
