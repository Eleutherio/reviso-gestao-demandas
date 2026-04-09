# Nginx Reverse Proxy Setup

Configuração Nginx para produção com HTTPS, rate limiting e segurança.

## Pré-requisitos

- Ubuntu/Debian server
- DNS A record: `api.seudominio.com` → IP do servidor
- Backend rodando em `http://127.0.0.1:8080`
- PostgreSQL sem porta exposta (apenas rede Docker interna)

## Firewall (UFW)

Apenas portas 80 e 443 expostas:

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
sudo ufw status
```

**IMPORTANTE**: PostgreSQL (5432/5433) NÃO deve ser exposto.

## Instalação

```bash
# 1. Editar configuração
nano nginx/reviso-api.conf
# Substituir: api.seudominio.com pelo seu domínio
# Substituir: seu-email@exemplo.com no setup.sh

# 2. Executar setup
chmod +x nginx/setup.sh
./nginx/setup.sh
```

## Configuração

### Rate Limiting

- `/auth/*`: 10 req/min por IP (burst 5)
- `/recover-*`: 5 req/min por IP (burst 5)

### Segurança

- `/actuator`: Apenas localhost (127.0.0.1)
- HTTPS forçado (redirect 301)
- HSTS habilitado
- Security headers (X-Frame-Options, X-Content-Type-Options, etc)

### SSL

- Let's Encrypt (renovação automática via certbot.timer)
- TLS 1.2 e 1.3
- Ciphers seguros

## Portas Expostas

- **80**: HTTP (redirect para HTTPS)
- **443**: HTTPS (API)
- **5432**: PostgreSQL (NÃO exposta - apenas rede Docker)

## Verificação

```bash
# Testar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/reviso-api-access.log
sudo tail -f /var/log/nginx/reviso-api-error.log

# Status SSL
sudo certbot certificates

# Testar endpoints
curl https://api.seudominio.com/actuator/health
curl -X POST https://api.seudominio.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@reviso.com","password":"admin123"}'
```

## Renovação SSL

Automática via `certbot.timer`. Verificar status:

```bash
sudo systemctl status certbot.timer
```

Renovar manualmente (se necessário):

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Troubleshooting

### Erro 502 Bad Gateway

Backend não está rodando:
```bash
docker compose ps
docker compose logs backend
```

### Erro 429 Too Many Requests

Rate limit atingido. Aguardar 1 minuto ou ajustar em `reviso-api.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=20r/m;
```

### SSL não funciona

Verificar DNS:
```bash
dig api.seudominio.com
```

Verificar certificado:
```bash
sudo certbot certificates
```

## Estrutura

```
nginx/
├── reviso-api.conf    # Configuração Nginx
├── setup.sh           # Script de instalação
└── README.md          # Este arquivo
```
