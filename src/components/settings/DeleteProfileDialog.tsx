import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteProfileDialog() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteProfile = async () => {
    if (confirmText !== 'EXCLUIR') {
      toast.error('Digite "EXCLUIR" para confirmar');
      return;
    }

    setIsDeleting(true);
    try {
      // Call the delete_user_account function
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        throw error;
      }

      // Logout and redirect
      await logout();
      toast.success('Sua conta foi excluída permanentemente');
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Erro ao excluir conta. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
          <Trash2 className="w-4 h-4" />
          Excluir Minha Conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Conta Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-foreground font-medium">
                Ao excluir o perfil, todas as informações também serão excluídas.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Serão excluídos:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Todas as despesas e receitas</li>
                  <li>Categorias e subcategorias personalizadas</li>
                  <li>Contas bancárias e cartões de crédito</li>
                  <li>Perfil e dados pessoais</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm">
                  Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="font-mono"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDeleteProfile();
            }}
            disabled={isDeleting || confirmText !== 'EXCLUIR'}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Permanentemente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
