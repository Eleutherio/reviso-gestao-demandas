# Fase 2: multi-db (experimental)

Este pacote guarda infraestrutura experimental de multi-db e roteamento de tenants.
Nao esta habilitado por padrao e deve ficar atras de flags.

O isolamento atual e por agency_id do JWT.
Evite acoplar novas dependencias ao TenantContext durante a fase 1.
