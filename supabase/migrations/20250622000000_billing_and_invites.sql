-- Billing profile columns + pending team invites
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS billing_eik text,
  ADD COLUMN IF NOT EXISTS billing_address text,
  ADD COLUMN IF NOT EXISTS billing_vat text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_invites_org_email_pending
  ON pending_invites (org_id, lower(email))
  WHERE accepted_at IS NULL;

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_org" ON pending_invites;
CREATE POLICY "invites_org" ON pending_invites
  FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );
