import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação rigorosa para evitar o crash do SDK sem contexto
if (!supabaseUrl || !supabaseAnonKey) {
  const missingError = 'Erro crítico: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no arquivo .env.';
  console.error(missingError);
  // Lançamos um erro amigável para interromper a execução com uma mensagem clara
  if (import.meta.env.DEV) {
    throw new Error(missingError);
  }
}

// Se as variáveis estiverem vazias, usamos strings vazias apenas para satisfazer o tipo, 
// mas o erro acima já terá alertado o desenvolvedor.
export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');