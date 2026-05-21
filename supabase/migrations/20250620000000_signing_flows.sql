-- Multi-signer signing flows: one_sided, two_sided, self_sign
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signing_type text NOT NULL DEFAULT 'one_sided'
  CHECK (signing_type IN ('one_sided', 'two_sided', 'self_sign'));

ALTER TABLE documents ADD COLUMN IF NOT EXISTS signers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signing_order text DEFAULT 'sequential'
  CHECK (signing_order IN ('sequential', 'parallel'));
ALTER TABLE documents ADD COLUMN IF NOT EXISTS current_signer_index int DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS all_signed_at timestamptz;
