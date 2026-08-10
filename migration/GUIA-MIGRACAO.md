# Guia Completo de Migração — MoneyGuia

Migração do Supabase interno (Lovable) para o Supabase externo (conta própria).

---

## Visão Geral

```
Projeto ATUAL (Lovable)              →    Projeto NOVO (sua conta)
uuirvevhvjvnubihnstz                      SEU_NOVO_REF
  ├── 21 tabelas                           ├── 21 tabelas (via migrations)
  ├── Auth users                           ├── Auth users (importados)
  ├── Dados (266 despesas, etc.)           ├── Dados (copiados)
  └── 14 Edge Functions                    └── 14 Edge Functions (via CLI)
```

**Tempo estimado:** 2–4 horas  
**Risco:** Baixo se seguir a ordem exata  
**Janela recomendada:** Pouco uso do app (ex: madrugada)

---

## Pré-requisitos

- [ ] Node.js instalado ([nodejs.org](https://nodejs.org))
- [ ] Supabase CLI instalado: `npm install -g supabase`
- [ ] Conta Supabase criada com novo projeto
- [ ] Access Token Supabase: `supabase.com → Avatar → Account → Access Tokens`
- [ ] Service Role Key do projeto ATUAL (Supabase Dashboard → Settings → API)
- [ ] Service Role Key + Anon Key do projeto NOVO

---

## FASE 1 — Preparação do Novo Projeto

### 1.1 Aplicar o Schema (SQL Migrations)

No **SQL Editor do novo projeto** (supabase.com → novo projeto → SQL Editor),
execute os arquivos de `supabase/migrations/` na ordem abaixo.

Cole e execute **um por vez**, na sequência:

```
1.  20251208223455_67a05c4a...sql  → profiles, notification_settings
2.  20260105165012_0620cf92...sql  → bank_accounts, credit_cards, categories, expenses
3.  20260110172041_a6c4c55f...sql  → income_categories, incomes
4.  20260111162337_ab06ce90...sql  → income_subcategories
5.  20260115222040_58d1b5cd...sql  → is_paid, email notifications
6.  20260116170955_aee8faec...sql  → is_received
7.  20260117154514_92bd8a4a...sql  → pg_cron (pular se der erro)
8.  20260117155140_3cce89cc...sql  → sender_email, sender_name
9.  20260126172000_add_rls...sql   → system_settings RLS
10. 20260119165019_7bae8c91...sql  → user_roles, delete_user_account()
11. 20260130000000_create_goals... → goals
12. 20260202023407_08f9cd9f...sql  → recurrence_id
13. 20260202024829_90c32a04...sql  → delete_user_account() atualizado
14. 20260203011653_739fa36d...sql  → Goals RLS, profiles index
15. 20260213093359_d28892a7...sql  → exclude_from_calculations
16. 20260215120000_add_expense...  → classification_type, recurrence_type
17. 20260215143000_add_subscript.. → subscription fields
18. 20260216013643_ba7ce7de...sql  → subscription_plans, user_subscriptions
19. 20260302183000_add_profiles... → subscription_end_date
20. 20260303120000_add_profiles... → subscription_expiry
21. 20260304120000_create_passw... → password_reset_codes
22. 20260304151306_e3cac64a...sql  → password_reset_codes (índices)
23. 20260308170641_6005698c...sql  → installments em incomes
24. 20260308173116_6592c4a9...sql  → goals, goal_contributions
25. 20260308180319_6b62f7b8...sql  → subscription_plans data
26. 20260308202318_ae8484d1...sql  → payments
27. 20260308202335_e100ac20...sql  → payments RLS
28. 20260308212334_ab1f0845...sql  → user_subscriptions unique
29. 20260325103000_add_lgpd...sql  → accepted_terms
30. 20260325140000_security_fix... → password_reset RLS
31. 20260325160000_security_lock.. → security lockdown
32. 20260325170000_subscription... → calculate_subscription_expiry()
33. 20260330213000_create_csat...  → csat_campaigns, csat_responses
34. 20260402112523_2ca6ed02...sql  → check_is_admin()
35. 20260402112538_04cd7913...sql  → admin view policy
36. 20260402112727_8e82153f...sql  → profiles/user_subscriptions RLS admin
37. 20260402120000_admin_view...   → admin profile access
38. 20260405162810_create_recur... → recurrences
39. 20260406103749_d3ac07b6...sql  → admin policies by email
40. 20260326000000_admin_subscr... → admin subscription access
41. 20260408173300_create_coupon.. → coupons
42. 20260503221938_d7753aa7...sql  → payments modifications
43. 20260509123715_d34f713a...sql  → transaction_groups
```

> ⚠️ Se algum SQL falhar com "already exists", ignore e continue.
> Se falhar com erro de FK ou dependency, verifique a ordem.

---

## FASE 2 — Exportar Dados do Projeto Atual

### 2.1 Configurar scripts

Edite os arquivos de script preenchendo as credenciais:

| Script | Variável | Onde obter |
|--------|----------|------------|
| 01-export-data.js | `OLD_SERVICE_ROLE_KEY` | Supabase Dashboard atual → Settings → API |
| 02-export-auth-users.js | `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| 03-import-auth-users.js | `NEW_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` | Novo projeto ref |
| 04-import-data.js | `NEW_URL` + `NEW_SERVICE_ROLE_KEY` | Novo projeto → Settings → API |
| 05-validate.js | Todos os 4 acima | — |

### 2.2 Executar exportação

```bash
# Na pasta raiz do projeto:
node migration/01-export-data.js
node migration/02-export-auth-users.js
```

Resultado: dois arquivos JSON em `migration/`

---

## FASE 3 — Importar no Novo Projeto

```bash
# Criar usuários de auth (com os mesmos UUIDs)
node migration/03-import-auth-users.js

# Importar dados de todas as tabelas
node migration/04-import-data.js

# Validar contagens
node migration/05-validate.js
```

---

## FASE 4 — Deploy das Edge Functions

Com acesso completo ao CLI no novo projeto:

```bash
# Login com seu Access Token
export SUPABASE_ACCESS_TOKEN=seu_token_aqui

# Deploy de todas as 14 funções de uma vez
npx supabase functions deploy --project-ref SEU_NOVO_PROJECT_REF

# Configurar secrets SMTP
npx supabase secrets set \
  SMTP_HOST=smtp.hostinger.com \
  SMTP_PORT=465 \
  SMTP_USER=seu@email.com.br \
  SMTP_PASSWORD=sua_senha \
  SMTP_FROM=seu@email.com.br \
  --project-ref SEU_NOVO_PROJECT_REF

# Verificar
npx supabase secrets list --project-ref SEU_NOVO_PROJECT_REF
```

---

## FASE 5 — Atualizar App para Usar Novo Projeto

### 5.1 Executar script de atualização

```bash
# Preencha as variáveis no script antes!
node migration/06-update-app-config.js
```

### 5.2 Atualizar manualmente o Anon Key

No arquivo `.env`, atualize:
```env
VITE_SUPABASE_URL=https://SEU_NOVO_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=NOVO_ANON_KEY
```

No arquivo `src/integrations/supabase/client.ts`, verifique as URLs.

### 5.3 Atualizar Lovable

No Lovable → Settings → Supabase → reconectar apontando para o novo projeto.

### 5.4 Commit e redeploy

```bash
git add .
git commit -m "chore: migrar para Supabase externo"
git push
```

---

## FASE 6 — Validação Final

- [ ] Login funciona
- [ ] Despesas e receitas carregam
- [ ] Criar nova despesa funciona
- [ ] Email de teste funciona (Configurações → Alertas por Email)
- [ ] Planos e assinaturas aparecem corretamente
- [ ] Edge Functions respondem (verificar logs no novo Supabase)

---

## Rollback

Se algo der errado:
1. Reverta os arquivos de config para o projeto antigo
2. Faça `git revert` do commit de migração
3. O projeto Lovable continua funcionando normalmente

---

## Arquivos Sensíveis — NÃO commitar

Adicione ao `.gitignore`:
```
migration/exported-data.json
migration/exported-auth-users.json
```

---

## Suporte

Projeto ref atual: `uuirvevhvjvnubihnstz`  
Tabelas: 21 | Funções: 14 | Migrations: 43
