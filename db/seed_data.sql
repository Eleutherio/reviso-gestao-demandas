-- Script para popular dados de teste no sistema B2B
-- Execute apos as migrations

-- 1. Criar agencia default
INSERT INTO agencies (id, name, active, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111110', 'Reviso Agency', true, now())
ON CONFLICT (id) DO NOTHING;

-- 2. Criar empresa da agencia
INSERT INTO companies (id, agency_id, company_code, name, company_type, segment, contact_email, active, created_at)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111110',
    'REVI-AG-ADM',
    'Reviso Agency',
    'AGENCY',
    'ADMIN',
    'contato@reviso.com',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Criar empresa cliente de exemplo
INSERT INTO companies (id, agency_id, company_code, name, company_type, segment, contact_email, active, created_at)
VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111110',
    'CLIE-CL-ABC',
    'Cliente ABC Ltda',
    'CLIENT',
    'ABC',
    'contato@clienteabc.com',
    true,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Criar usuario AGENCY_ADMIN
-- Senha: admin123 (hash bcrypt)
INSERT INTO users (id, full_name, email, password_hash, role, agency_id, company_id, active, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Admin Reviso',
  'admin@reviso.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMye.Jx3/kfRYPZCjQ3vZGZY.2K1zVvQmIy',
  'AGENCY_ADMIN',
  '11111111-1111-1111-1111-111111111110',
  '11111111-1111-1111-1111-111111111111',
  true,
  now()
) ON CONFLICT (email) DO NOTHING;

-- 5. Criar usuario AGENCY_USER
-- Senha: designer123
INSERT INTO users (id, full_name, email, password_hash, role, agency_id, company_id, active, created_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Joao Designer',
  'joao@reviso.com',
  '$2a$10$8B7kXvZ.nQxP8Cz3Nj8W7eK9Qz5L.gKmJvRtYwXdNhPqEfGhIjKlM',
  'AGENCY_USER',
  '11111111-1111-1111-1111-111111111110',
  '11111111-1111-1111-1111-111111111111',
  true,
  now()
) ON CONFLICT (email) DO NOTHING;

-- 6. Criar usuario CLIENT_USER
-- Senha: cliente123
INSERT INTO users (id, full_name, email, password_hash, role, agency_id, company_id, active, created_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Maria Silva',
  'maria@clienteabc.com',
  '$2a$10$7A6jWuY.mPwO7By2Mi7V6dJ8Py4K.fJlIuQsXwVcMgOnDeDfGhIjK',
  'CLIENT_USER',
  '11111111-1111-1111-1111-111111111110',
  '22222222-2222-2222-2222-222222222222',
  true,
  now()
) ON CONFLICT (email) DO NOTHING;

-- 7. Criar briefings de exemplo
INSERT INTO briefings (id, agency_id, company_id, created_by_user_id, title, description, status, created_at)
VALUES
  (
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111110',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'Campanha Black Friday 2026',
    'Precisamos de 15 artes para Instagram Stories, 5 posts para feed e 3 videos curtos para Reels promovendo ofertas de ate 70% off.',
    'PENDING',
    now() - interval '2 hours'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111110',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'Landing Page Novo Produto',
    'Criar landing page responsiva para lancamento do novo produto linha premium. Precisa ter formulario de captacao de leads e integracao com CRM.',
    'PENDING',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Criar demanda de exemplo (ja convertida)
INSERT INTO briefings (id, agency_id, company_id, created_by_user_id, title, description, status, created_at)
VALUES
  (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111110',
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'Email Marketing Semanal',
    'Template de email para newsletter semanal com novidades e promocoes.',
    'CONVERTED',
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO requests (
  id,
  agency_id,
  company_id,
  briefing_id,
  title,
  description,
  type,
  priority,
  department,
  status,
  assignee_id,
  due_date,
  revision_count,
  created_at,
  updated_at
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111110',
  '22222222-2222-2222-2222-222222222222',
  '88888888-8888-8888-8888-888888888888',
  'Email Marketing Semanal',
  'Template de email para newsletter semanal com novidades e promocoes.',
  'EMAIL',
  'MEDIUM',
  'DESIGN',
  'IN_PROGRESS',
  '44444444-4444-4444-4444-444444444444',
  now() + interval '5 days',
  0,
  now() - interval '3 days',
  now() - interval '2 days'
) ON CONFLICT (id) DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Dados de teste criados com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE 'Usuarios disponiveis:';
  RAISE NOTICE '1. admin@reviso.com / admin123 (AGENCY_ADMIN)';
  RAISE NOTICE '2. joao@reviso.com / designer123 (AGENCY_USER)';
  RAISE NOTICE '3. maria@clienteabc.com / cliente123 (CLIENT_USER)';
  RAISE NOTICE '';
  RAISE NOTICE 'Faca login em: POST http://localhost:8080/auth/login';
END $$;
