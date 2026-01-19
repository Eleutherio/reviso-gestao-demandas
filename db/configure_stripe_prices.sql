-- Script para configurar Stripe Price IDs nos planos
-- Execute após criar os produtos/preços no Stripe Dashboard

-- Atualizar plano Starter
UPDATE subscription_plans 
SET stripe_price_id = 'price_1ABC123...',
    stripe_product_id = 'prod_ABC123...'  -- opcional
WHERE code = 'STARTER';

-- Atualizar plano Professional
UPDATE subscription_plans 
SET stripe_price_id = 'price_1DEF456...',
    stripe_product_id = 'prod_DEF456...'  -- opcional
WHERE code = 'PROFESSIONAL';

-- Atualizar plano Enterprise
UPDATE subscription_plans 
SET stripe_price_id = 'price_1GHI789...',
    stripe_product_id = 'prod_GHI789...'  -- opcional
WHERE code = 'ENTERPRISE';

-- Verificar configuração
SELECT code, name, stripe_price_id, stripe_product_id, active 
FROM subscription_plans 
ORDER BY code;
