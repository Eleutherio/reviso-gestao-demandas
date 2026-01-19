# Infraestrutura por Ambiente

## Estrutura

```
infra/
├── dev/                          # Desenvolvimento local
│   ├── docker-compose.dev.yml
│   ├── .env.dev.example
│   └── .env.dev (gitignored)
│
└── demo/                         # Demo público
    ├── docker-compose.demo.yml
    ├── nginx/
    │   ├── reviso-api.conf
    │   └── setup.sh
    ├── deploy-demo.sh
    ├── harden-ssh.sh
    ├── setup-db-security.sh
    ├── .env.demo.example
    └── .env.demo (gitignored)
```

## Dev (Localhost)

**Características:**
- PostgreSQL com porta exposta (5433)
- CORS liberado para localhost
- Logs verbosos (DEBUG)
- Actuator completo exposto
- Hot reload habilitado

**Setup:**
```bash
cd infra/dev
cp .env.dev.example .env.dev
# Editar .env.dev

docker compose -f docker-compose.dev.yml up -d --build

# Seed database
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U reviso -d reviso < ../../db/seed_data.sql
```

**Acessar:**
- Frontend: http://localhost:4200
- Backend: http://localhost:8080
- PostgreSQL: localhost:5433

## Demo (Público)

**Características:**
- PostgreSQL SEM porta exposta
- Backend bind em 127.0.0.1:8080
- CORS apenas domínio real
- Logs INFO
- Actuator limitado (health, info)
- Nginx com HTTPS (Let's Encrypt)
- Rate limiting (Nginx + App)
- Firewall (UFW)
- SSH hardening (key-only, Fail2ban)
- Backup automático (diário)
- Container hardening (non-root, no-new-privileges)

**Setup:**
```bash
cd infra/demo
cp .env.demo.example .env.demo
# Editar .env.demo com valores reais

# 1. Setup Nginx + SSL
chmod +x nginx/setup.sh
./nginx/setup.sh

# 2. Deploy aplicação
chmod +x deploy-demo.sh
./deploy-demo.sh

# 3. Hardening (SSH + Database)
chmod +x harden-ssh.sh setup-db-security.sh
./harden-ssh.sh
./setup-db-security.sh
```

**Acessar:**
- API: https://api.seudominio.com

**Segurança:**
Ver checklist completo em [../docs/SECURITY_CHECKLIST_DEMO.md](../docs/SECURITY_CHECKLIST_DEMO.md).

## Profiles Spring Boot

| Profile | Ambiente | CORS | Logs | Actuator | DB Port | Container |
|---------|----------|------|------|----------|---------|----------|
| `dev` | Local | localhost | DEBUG | Todos | 5433 | Root |
| `demo` | Público | Domínio real | INFO | health,info | Não exposto | Non-root |

## Variáveis de Ambiente

### Dev (.env.dev)
```bash
DB_PASSWORD=senha_local
JWT_SECRET=dev-secret-key
# Stripe/Resend opcionais
```

### Demo (.env.demo)
```bash
# Database
DB_PASSWORD=$(openssl rand -base64 32)

# JWT (mínimo 64 chars)
JWT_SECRET=$(openssl rand -base64 64)

# Stripe (produção)
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
RESEND_API_KEY=re_...
RESEND_FROM=noreply@seudominio.com

# Frontend
FRONTEND_BASE_URL=https://seudominio.com
```

**Validação obrigatória:** Aplicação falha se secrets não configurados.

## Comandos Úteis

### Dev
```bash
# Subir
cd infra/dev
docker compose -f docker-compose.dev.yml up -d

# Logs
docker compose -f docker-compose.dev.yml logs -f backend

# Parar
docker compose -f docker-compose.dev.yml down
```

### Demo
```bash
# Deploy
cd infra/demo
./deploy-demo.sh

# Logs
docker compose -f docker-compose.demo.yml logs -f backend

# Restart
docker compose -f docker-compose.demo.yml restart backend
```
