-- org_webhooks — outgoing ERP webhook endpoints per organization
CREATE TABLE IF NOT EXISTS org_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events text[] NOT NULL DEFAULT '{document.signed}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE org_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks_org" ON org_webhooks
  FOR ALL
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );
