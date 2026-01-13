/**
 * Error mapping utility to prevent database error exposure to users
 * Maps internal database errors to user-friendly messages
 */

export function getUserFriendlyError(error: unknown): string {
  // Log full details for debugging (only visible in console)
  console.error('Database error:', error);
  
  // Type guard for error with code property
  const errorWithCode = error as { code?: string; message?: string };
  
  // Map common Postgres error codes to user-friendly messages
  if (errorWithCode?.code) {
    switch (errorWithCode.code) {
      case '23505': // unique_violation
        return 'Este registro já existe';
      case '23503': // foreign_key_violation
        return 'Não é possível excluir - há dados relacionados';
      case '23502': // not_null_violation
        return 'Campos obrigatórios não preenchidos';
      case '23514': // check_violation
        return 'Os dados informados não são válidos';
      case '42501': // insufficient_privilege
        return 'Você não tem permissão para realizar esta ação';
      case 'PGRST116': // No rows returned
        return 'Registro não encontrado';
      case '22P02': // invalid_text_representation
        return 'Formato de dados inválido';
      case '23P01': // exclusion_violation
        return 'Conflito de dados detectado';
      case '42P01': // undefined_table
      case '42703': // undefined_column
        return 'Erro de configuração. Contate o suporte.';
      default:
        break;
    }
  }
  
  // Default generic message for any unhandled error
  return 'Erro ao processar sua solicitação. Tente novamente.';
}
