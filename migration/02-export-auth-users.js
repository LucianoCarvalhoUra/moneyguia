/**
 * PASSO 2 — EXPORTAR USUÁRIOS DE AUTH DO PROJETO ATUAL
 *
 * Usa a Supabase Management API para exportar os usuários.
 * Os UUIDs dos usuários são necessários para manter integridade
 * dos dados (user_id em todas as tabelas).
 *
 * Pré-requisitos:
 *   1. Access Token da sua conta Supabase:
 *      supabase.com → Avatar → Account → Access Tokens → Generate
 *
 * Como executar:
 *   node migration/02-export-auth-users.js
 *
 * Resultado: migration/exported-auth-users.json
 */

const fs = require('fs');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const SUPABASE_ACCESS_TOKEN = 'COLE_AQUI_O_ACCESS_TOKEN_DA_SUA_CONTA';
const PROJECT_REF = 'uuirvevhvjvnubihnstz'; // projeto atual (Lovable)
// ─────────────────────────────────────────────────────────────────────────────

async function exportAuthUsers() {
  console.log('🚀 Exportando usuários de auth...\n');
  const allUsers = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/auth/users?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Erro: ${res.status} - ${err}`);
      console.log('\n💡 Verifique se o Access Token está correto.');
      console.log('   Gere um em: supabase.com → Avatar → Account → Access Tokens');
      process.exit(1);
    }

    const data = await res.json();
    const users = data.users || [];
    allUsers.push(...users);
    console.log(`  Página ${page}: ${users.length} usuários`);
    if (users.length < perPage) break;
    page++;
  }

  fs.writeFileSync(
    'migration/exported-auth-users.json',
    JSON.stringify(allUsers, null, 2),
    'utf8'
  );

  console.log(`\n✅ ${allUsers.length} usuários exportados`);
  console.log('   Arquivo: migration/exported-auth-users.json');

  // Resumo dos campos disponíveis
  if (allUsers.length > 0) {
    const u = allUsers[0];
    console.log('\n📋 Campos disponíveis por usuário:');
    console.log('  ', Object.keys(u).join(', '));
  }
}

exportAuthUsers().catch(console.error);
