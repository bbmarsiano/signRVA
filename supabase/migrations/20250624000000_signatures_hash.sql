-- Signature hashes for verification + public document lookup by ID prefix
ALTER TABLE signatures
  ADD COLUMN IF NOT EXISTS canvas_hash text,
  ADD COLUMN IF NOT EXISTS document_hash text;

CREATE OR REPLACE FUNCTION find_document_for_verify(p_id text)
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  signed_at timestamptz,
  created_at timestamptz,
  expires_at timestamptz,
  org_id uuid,
  org_name text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.title,
    d.status,
    d.signed_at,
    d.created_at,
    d.expires_at,
    d.org_id,
    o.name AS org_name
  FROM documents d
  LEFT JOIN organizations o ON o.id = d.org_id
  WHERE d.id::text = p_id
     OR (char_length(p_id) <= 8 AND d.id::text LIKE p_id || '%')
  LIMIT 1;
$$;
