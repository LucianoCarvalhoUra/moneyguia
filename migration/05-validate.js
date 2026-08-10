/**
 * PASSO 5 — VALIDAR MIGRAÇÃO
 *
 * Compara contagem de linhas entre projeto antigo e novo.
 * Execute após a importação para confirmar integridade.
 *
 * Como executar:
 *   node migration/05-validate.js
 */

const fs = require('fs');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const OLD_URL              = 'https://uuirvevhvjvnubihnstz.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'COLE_AQUI_O_SERVICE_ROLE_KEY_DO_PROJETO_ATUAL';

const NEW_URL              = 'https://SEU_NOVO_PROJETO.supabase.co';
const NEW_SERVICE_ROLE_KEY = 'COLE_AQUI_O_SERVICE_ROLE_KEY_DO_NOVO_PROJETO';
// ─────────────────────────────────────────────────────────────────────────────

const TABLES = [
  'subscription_plans', 'profiles', 'notification_settings', 'bank_accounts',
  'credit_cards', 'categories', 'subcategories', 'income_categories',
  'income_subcategories', 'expenses', 'incomes', 'goals', 'goal_contributions',
  'user_subscriptions', 'payments', 'transaction_groups', 'recurrences',
  'csat_campaigns', 'csat_responses', 'password_reset_codes', 'coupons',
];

async function getCount(baseUrl, key, table) {
  const res = await fetch(`${baseUrl}/rest/v1/${table}?select=id`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });

  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  return 0;
}

async function main() {
  console.log('🔍 Validando migração...\n');
  console.log('Tabela'.padEnd(35), 'Antigo'.padStart(8), 'Novo'.padStart(8), 'Status'.padStart(8));
  console.log('─'.repeat(65));

  let totalOld = 0, totalNew = 0, mismatches = 0;

  for (const table of TABLES) {
    const [oldCount, newCount] = await Promise.all([
      getCount(OLD_URL, OLD_SERVICE_ROLE_KEY, table),
      getCount(NEW_URL, NEW_SERVICE_ROLE_KEY, table),
    ]);

    totalOld += oldCount;
    totalNew += newCount;

    const status = oldCount === newCount ? '✅' : '❌ DIVERGE';
    if (oldCount !== newCount) mismatches++;

    console.log(
      table.padEnd(35),
      String(oldCount).padStart(8),
      String(newCount).padStart(8),
      status.padStart(10)
    );
  }

  console.log('─'.repeat(65));
  console.log(
    'TOTAL'.padEnd(35),
    String(totalOld).padStart(8),
    String(totalNew).padStart(8),
    (mismatches === 0 ? '✅ OK' : `❌ ${mismatches} erros`).padStart(10)
  );

  if (mismatches === 0) {
    console.log('\n🎉 Migração validada com sucesso! Pode prosseguir para o Passo 6.');
  } else {
    console.log('\n⚠️  Existem divergências. Verifique as tabelas marcadas com ❌.');
    console.log('   Tente executar novamente o 04-import-data.js para as tabelas com erro.');
  }
}

main().catch(console.error);
