import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminCheck();

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error('Acesso não autorizado');
      navigate('/');
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Painel do Administrador
        </h1>
        <p className="text-muted-foreground">Configurações globais do sistema</p>
      </div>

    </div>
  );
}
