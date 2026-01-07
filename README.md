# Reviso Gestão de Demandas

Reviso é um sistema B2B para agência de publicidade gerenciar demandas de clientes do briefing à entrega, com histórico (audit trail) e métricas por relatórios.

O que ele resolve:

Centraliza pedidos (peças, campanhas, landing pages etc.), controla status, prazos e revisões e permite enxergar gargalos e atrasos.

## Fluxo principal

- NEW → IN_PROGRESS → IN_REVIEW → (CHANGES_REQUESTED ↔ IN_PROGRESS) → APPROVED → DELIVERED → CLOSED

## Tecnologias

- Java 21, Spring Boot 4.0.1 (Web MVC, Data JPA, Validation, Actuator)
- PostgreSQL 16 + Flyway para migrations
- Maven para build
- Angular em `frontend/` (frontend oficial)

## Estrutura do repositório

- Backend (Spring Boot): `backend/`
- Frontend (Angular): `frontend/`
- Documentação: `docs/`
- Arquivos auxiliares de banco: `db/`

## Requisitos

- JDK 21+
- Maven Wrapper (`./mvnw`) incluído
- Docker + Docker Compose (recomendado para rodar a stack completa)

Para rodar o backend fora do Docker, você vai precisar de PostgreSQL acessível localmente e ajustar as configs em `backend/src/main/resources/application.properties` (ou variáveis de ambiente).

## Endpoints principais

- Auth
  - `POST /auth/login` – login e retorno do JWT
- Briefings (cliente)
  - `POST /briefings` – cria briefing (payload: `title`, `description`)
  - `GET /briefings/mine` – lista briefings do cliente logado
- Demandas
  - `POST /requests` – cria demanda
  - `GET /requests` – lista demandas (agência)
  - `GET /requests/mine` – lista demandas do cliente logado
  - `GET /requests/{id}/events?onlyVisibleToClient=true` – eventos visíveis ao cliente

Documentação mais completa (B2B/RBAC/exemplos): veja `docs/API_B2B.md`.

## Banco de dados

- Migrations Flyway: `backend/src/main/resources/db/migration`
- Para seed local: `db/seed_data.sql`

## Interface web

- Frontend (Angular via Nginx): `http://localhost:4200`
- Backend (API): `http://localhost:8080`
  - Observação: `GET /` no backend redireciona para o frontend.

## Docker Compose (backend + frontend desacoplado)

Subir tudo (Postgres + API + Angular via Nginx):

```bash
docker compose up -d --build
```

- Backend (API): `http://localhost:8080`
- Frontend Angular (Nginx): `http://localhost:4200`

Para ajustar o redirect do backend `/`, defina `FRONTEND_BASE_URL` no compose/env (padrão: `http://localhost:4200`).

## Frontend Angular (Core)

O projeto Angular fica em [frontend](frontend) e consome o backend via proxy em `/api/*`.

Rodar no dev:

- Backend (Spring) no ar em `http://localhost:8080`
- Frontend (Angular):
  - `cd frontend`
  - `npm install`
  - `npm start`

O `npm start` usa `frontend/proxy.conf.json` para:

- Chamar o backend como `/api/*` no Angular
- Proxy para `http://localhost:8080` com rewrite removendo o prefixo `/api`

Exemplo: `POST /api/auth/login` (Angular) → `POST /auth/login` (backend)

Observação: no Portal do Cliente, os campos extras (Tipo, Prioridade e Vencimento) são anexados ao texto da descrição do briefing para manter compatibilidade com a API atual do backend.

## Monitoramento

- Actuator habilitado: `http://localhost:8080/actuator/health`
- Health via proxy do frontend: `http://localhost:4200/api/actuator/health`

## Licença

Projeto privado/experimental (licença não definida).
