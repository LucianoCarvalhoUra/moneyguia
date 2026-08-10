/**
 * PASSO 3 — CRIAR USUÁRIOS NO NOVO SUPABASE
 *
 * Recria os usuários no novo projeto mantendo os MESMOS UUIDs.
 * Isso é essencial para manter integridade dos dados (user_id em todas as tabelas).
 *
 * Pré-requisitos:
 *   1. Executar 02-export-auth-users.js antes
 *   2. Access Token da conta Supabase
 *   3. Ref do NOVO projeto Supabase
 *
 * Como executar:
 *   node migration/03-import-auth-users.js
 */

const fs = require('fs');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const SUPABASE_ACCESS_TOKEN = 'COLE_AQUI_O_ACCESS_TOKEN_DA_SUA_CONTA';
const NEW_PROJECT_REF      = 'COLE_AQUI_O_REF_DO_NOVO_PROJETO'; // ex: abcdefghijklm
// ─────────────────────────────────────────────────────────────────────────────

const users = JSON.parse(fs.readFileSync('migration/exported-auth-users.json', 'utf8'));

async function createUser(user) {
  const url = `https://api.supabase.com/v1/projects/${NEW_PROJECT_REF}/auth/users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: user.id,                    // mantém o mesmo UUID
      email: user.email,
      email_confirmed: true,
      phone: user.phone || null,
      user_metadata: user.user_metadata || {},
      app_metadata: user.app_metadata || {},
      // Senha: usuários precisarão redefinir via "Esqueci minha senha"
      // Definimos uma senha temporária aleatória
      password: `Temp_${Math.random().toString(36).slice(2)}!Mg1`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Ignora se usuário já existe (409 Conflict)
    if (res.status === 422 || res.status === 409) {
      return { skipped: true, email: user.email };
    }
    return { error: `${res.status} - ${err}`, email: user.email };
  }

  return { ok: true, email: user.email };
}

async function main() {
  console.log(`🚀 Importando ${users.length} usuários para o novo projeto...\n`);

  let success = 0, skipped = 0, errors = 0;

  for (const user of users) {
    const result = await createUser(user);
    if (result.ok) {
      success++;
      console.log(`  ✅ ${user.email}`);
    } else if (result.skipped) {
      skipped++;
      console.log(`  ⏭️  ${user.email} (já existe)`);
    } else {
      errors++;
      console.log(`  ❌ ${user.email}: ${result.error}`);
    }

    // Rate limit: pequena pausa entre requisições
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✅ Concluído: ${success} criados, ${skipped} ignorados, ${errors} erros`);
  console.log('\n⚠️  IMPORTANTE: Os usuários criados precisarão redefinir a senha.');
  console.log('   Configure o email de reset ou avise-os manualmente.');
}

main().catch(console.error);
