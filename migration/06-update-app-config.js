/**
 * PASSO 6 — ATUALIZAR CONFIGURAÇÃO DO APP
 *
 * Atualiza os arquivos de configuração do app para apontar
 * para o novo projeto Supabase.
 *
 * Como executar:
 *   node migration/06-update-app-config.js
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURAR AQUI ──────────────────────────────────────────────────────────
const NEW_SUPABASE_URL      = 'https://SEU_NOVO_PROJETO.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'COLE_AQUI_O_ANON_KEY_DO_NOVO_PROJETO';
const NEW_PROJECT_REF       = 'SEU_NOVO_PROJECT_REF'; // ex: abcdefghijklm
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.join(__dirname, '..');

function updateFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭️  ${filePath} não encontrado`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${path.relative(ROOT, filePath)}`);
}

const OLD_URL = 'https://uuirvevhvjvnubihnstz.supabase.co';
const OLD_REF = 'uuirvevhvjvnubihnstz';

// .env
updateFile(path.join(ROOT, '.env'), [
  [OLD_URL, NEW_SUPABASE_URL],
  [OLD_REF, NEW_PROJECT_REF],
]);

// src/integrations/supabase/client.ts
updateFile(path.join(ROOT, 'src/integrations/supabase/client.ts'), [
  [OLD_URL, NEW_SUPABASE_URL],
]);

// supabase/config.toml
updateFile(path.join(ROOT, 'supabase/config.toml'), [
  [OLD_REF, NEW_PROJECT_REF],
]);

// src/integrations/supabase/types.ts (se tiver referência ao projeto)
updateFile(path.join(ROOT, 'src/integrations/supabase/types.ts'), [
  [OLD_URL, NEW_SUPABASE_URL],
  [OLD_REF, NEW_PROJECT_REF],
]);

console.log('\n✅ Configuração atualizada!');
console.log('\nPróximos passos:');
console.log('  1. Verifique os arquivos alterados');
console.log('  2. Atualize o ANON KEY no .env e no client.ts manualmente');
console.log('     (o script não altera a chave por segurança)');
console.log('  3. Faça commit e push para o GitHub (Lovable fará redeploy)');
console.log('  4. Execute: npx supabase functions deploy --project-ref', NEW_PROJECT_REF);
