/**
 * PASSO 1 — EXPORTAR DADOS DO SUPABASE ATUAL (Lovable)
 *
 * Pré-requisitos:
 *   1. Node.js instalado (https://nodejs.org)
 *   2. Service Role Key do projeto atual:
 *      Supabase Dashboard → Settings → API → service_role key
 *
 * Como executar:
 *   node migration/01-export-data.js
 *
 * Resultado: migration/exported-data.json (NÃO commite este arquivo!)
 */

const fs = require('fs');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const OLD_URL = 'https://uuirvevhvjvnubihnstz.supabase.co';
const OLD_SERVICE_ROLE_KEY = 'COLE_AQUI_O_SERVICE_ROLE_KEY_DO_PROJETO_ATUAL';
// ─────────────────────────────────────────────────────────────────────────────

// Ordem respeitando dependências de FK
const TABLES = [
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

async function exportTable(table) {
  const allRows = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${OLD_URL}/rest/v1/${table}?select=*&offset=${offset}&limit=${pageSize}`;
    const res = await fetch(url, {
      headers: {
        'apikey': OLD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_ROLE_KEY}`,
        'Prefer': 'count=exact',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ Erro ao exportar ${table}: ${res.status} - ${err}`);
      return allRows;
    }

    const rows = await res.json();
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }

  return allRows;
}

async function main() {
  console.log('🚀 Iniciando exportação...\n');
  const result = {};
  let totalRows = 0;

  for (const table of TABLES) {
    process.stdout.write(`  Exportando ${table}... `);
    const rows = await exportTable(table);
    result[table] = rows;
    totalRows += rows.length;
    console.log(`${rows.length} linhas`);
  }

  fs.writeFileSync(
    'migration/exported-data.json',
    JSON.stringify(result, null, 2),
    'utf8'
  );

  console.log(`\n✅ Exportação concluída! ${totalRows} linhas totais`);
  console.log('   Arquivo salvo em: migration/exported-data.json');
  console.log('\n⚠️  ATENÇÃO: Não commite exported-data.json (contém dados sensíveis)');
}

main().catch(console.error);
