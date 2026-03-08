UPDATE subscription_plans SET has_ai_classification = false WHERE plan_type = 'pro';
UPDATE subscription_plans SET name = 'Essencial' WHERE plan_type = 'free';
UPDATE subscription_plans SET name = 'Pro' WHERE plan_type = 'pro';
UPDATE subscription_plans SET name = 'Premium' WHERE plan_type = 'premium';