import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação rigorosa para evitar o crash do SDK sem contexto
if (!supabaseUrl || !supabaseAnonKey) {
  const missingError = 
    '⚠️ ERRO DE CONFIGURAÇÃO:\n' +
    'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no arquivo .env.\n\n' +
    'COMO CORRIGIR:\n' +
    '1. Crie um arquivo .env na raiz do projeto.\n' +
    '2. Adicione as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.\n' +
    '3. PARE o terminal (Ctrl+C) e rode "npm run dev" novamente.';
    
  console.error(missingError);
}

// Usamos placeholders para evitar que o SDK dispare "supabaseKey is required" antes do console.error aparecer
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);