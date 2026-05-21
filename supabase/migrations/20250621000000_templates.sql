-- Templates system: templates, template_fields, document_field_values
CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('system', 'custom')),
  category text NOT NULL CHECK (
    category IN (
      'rental',
      'vehicle',
      'services',
      'power_of_attorney',
      'membership',
      'other'
    )
  ),
  html_content text,
  pdf_path text,
  uses_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (
    field_type IN (
      'text',
      'number',
      'date',
      'email',
      'phone',
      'textarea',
      'checkbox',
      'select'
    )
  ),
  assigned_to text NOT NULL CHECK (assigned_to IN ('sender', 'recipient')),
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  options jsonb,
  order_index int NOT NULL DEFAULT 0,
  section text,
  UNIQUE (template_id, key)
);

CREATE TABLE IF NOT EXISTS document_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  field_key text NOT NULL,
  field_label text,
  value text NOT NULL DEFAULT '',
  filled_by text NOT NULL CHECK (filled_by IN ('sender', 'recipient')),
  filled_at timestamptz NOT NULL DEFAULT now(),
  signer_index int NOT NULL DEFAULT 0
);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES templates(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_fields_filled boolean NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS recipient_fields_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_templates_org ON templates(org_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_document_field_values_document ON document_field_values(document_id);
