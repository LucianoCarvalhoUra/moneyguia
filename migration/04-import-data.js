/**
 * PASSO 4 — IMPORTAR DADOS PARA O NOVO SUPABASE
 *
 * Importa todos os dados exportados para o novo projeto.
 * Execute SOMENTE após o schema estar criado (Passo 5 do guia)
 * e os usuários importados (Passo 3).
 *
 * Pré-requisitos:
 *   1. migration/exported-data.json (gerado no Passo 1)
 *   2. Schema criado no novo projeto (migration SQL executado)
 *   3. Usuários de auth criados (Passo 3)
 *
 * Como executar:
 *   node migration/04-import-data.js
 */

const fs = require('fs');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const NEW_URL              = 'https://SEU_NOVO_PROJETO.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'COLE_AQUI_O_SERVICE_ROLE_KEY_DO_NOVO_PROJETO';
// ─────────────────────────────────────────────────────────────────────────────

const exported = JSON.parse(fs.readFileSync('migration/exported-data.json', 'utf8'));

// Ordem de importação respeita FKs
const IMPORT_ORDER = [
  'subscription_plans',
  'profiles',
  'notification_settings',
  'bank_accounts',
  'credit_cards',
  'categories',
  'subcategories',
  'income_categories',
  'income_subcategories',
  'expenses',
  'incomes',
  'goals',
  'goal_contributions',
  'user_subscriptions',
  'payments',
  'transaction_groups',
  'recurrences',
  'csat_campaigns',
  'csat_responses',
  'password_reset_codes',
  'coupons',
];

async function importBatch(table, rows) {
  const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': NEW_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${NEW_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
}

async function importTable(table) {
  const rows = exported[table];
  if (!rows || rows.length === 0) {
    console.log(`  ⏭️  ${table}: sem dados`);
    return;
  }

  const batchSize = 200;
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await importBatch(table, batch);
      imported += batch.length;
    } catch (err) {
      console.error(`  ❌ ${table} [lote ${i}-${i + batchSize}]: ${err.message}`);
    }
  }

  console.log(`  ✅ ${table}: ${imported}/${rows.length} linhas`);
}

async function main() {
  console.log('🚀 Iniciando importação de dados...\n');

  for (const table of IMPORT_ORDER) {
    await importTable(table);
  }

  console.log('\n✅ Importação concluída!');
  console.log('\nPróximo passo: Executar 05-validate.js para verificar integridade');
}

main().catch(console.error);
