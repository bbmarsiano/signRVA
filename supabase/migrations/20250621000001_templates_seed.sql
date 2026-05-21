-- Seed system templates (minimal HTML + sample fields)
INSERT INTO templates (id, org_id, name, description, type, category, html_content, uses_count, is_active)
VALUES
  (
    'a0000001-0000-4000-8000-000000000001',
    NULL,
    'Наемен договор',
    'Договор за наем на жилище или имот',
    'system',
    'rental',
    '<html><body><h1>Договор за наем</h1><p>Наемодател: {{landlord_name}}</p><p>Наемател: {{tenant_name}}</p><p>Адрес: {{property_address}}</p><p>Наем: {{rent_amount}} лв.</p></body></html>',
    0,
    true
  ),
  (
    'a0000001-0000-4000-8000-000000000002',
    NULL,
    'Покупко-продажба МПС',
    'Договор за прехвърляне на собственост върху МПС',
    'system',
    'vehicle',
    '<html><body><h1>Договор МПС</h1><p>Продавач: {{seller_name}}</p><p>Купувач: {{buyer_name}}</p><p>МПС: {{vehicle_desc}}</p></body></html>',
    0,
    true
  ),
  (
    'a0000001-0000-4000-8000-000000000003',
    NULL,
    'Договор за услуги',
    'Договор за предоставяне на услуги',
    'system',
    'services',
    '<html><body><h1>Договор за услуги</h1><p>Изпълнител: {{provider_name}}</p><p>Възложител: {{client_name}}</p><p>Услуга: {{service_desc}}</p></body></html>',
    0,
    true
  ),
  (
    'a0000001-0000-4000-8000-000000000004',
    NULL,
    'Пълномощно',
    'Пълномощно за представяне',
    'system',
    'power_of_attorney',
    '<html><body><h1>Пълномощно</h1><p>Упълномощител: {{principal_name}}</p><p>Пълномощник: {{agent_name}}</p></body></html>',
    0,
    true
  ),
  (
    'a0000001-0000-4000-8000-000000000005',
    NULL,
    'Членски договор',
    'Договор за членство в организация',
    'system',
    'membership',
    '<html><body><h1>Членски договор</h1><p>Клуб: {{club_name}}</p><p>Член: {{member_name}}</p></body></html>',
    0,
    true
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO template_fields (template_id, key, label, field_type, assigned_to, required, order_index, section)
VALUES
  ('a0000001-0000-4000-8000-000000000001', 'landlord_name', 'Име на наемодател', 'text', 'sender', true, 1, 'naemodik'),
  ('a0000001-0000-4000-8000-000000000001', 'tenant_name', 'Име на наемател', 'text', 'recipient', true, 2, 'naematel'),
  ('a0000001-0000-4000-8000-000000000001', 'property_address', 'Адрес на имота', 'text', 'sender', true, 3, 'imot'),
  ('a0000001-0000-4000-8000-000000000001', 'rent_amount', 'Месечен наем (лв.)', 'number', 'sender', true, 4, 'usloviya'),
  ('a0000001-0000-4000-8000-000000000002', 'seller_name', 'Продавач', 'text', 'sender', true, 1, 'prodavach'),
  ('a0000001-0000-4000-8000-000000000002', 'buyer_name', 'Купувач', 'text', 'recipient', true, 2, 'kupuvach'),
  ('a0000001-0000-4000-8000-000000000002', 'vehicle_desc', 'Описание на МПС', 'textarea', 'sender', true, 3, 'mps'),
  ('a0000001-0000-4000-8000-000000000003', 'provider_name', 'Изпълнител', 'text', 'sender', true, 1, 'izpalnitel'),
  ('a0000001-0000-4000-8000-000000000003', 'client_name', 'Възложител', 'text', 'recipient', true, 2, 'vozlagatel'),
  ('a0000001-0000-4000-8000-000000000003', 'service_desc', 'Описание на услугата', 'textarea', 'sender', false, 3, 'usluga'),
  ('a0000001-0000-4000-8000-000000000004', 'principal_name', 'Упълномощител', 'text', 'sender', true, 1, 'upalnomoshchitel'),
  ('a0000001-0000-4000-8000-000000000004', 'agent_name', 'Пълномощник', 'text', 'recipient', true, 2, 'palnomoshnik'),
  ('a0000001-0000-4000-8000-000000000005', 'club_name', 'Име на клуб', 'text', 'sender', true, 1, 'klub'),
  ('a0000001-0000-4000-8000-000000000005', 'member_name', 'Име на член', 'text', 'recipient', true, 2, 'chlen')
ON CONFLICT (template_id, key) DO NOTHING;
