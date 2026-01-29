import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      // A função updateUser atualiza a senha do usuário autenticado de forma segura
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
      
      // Limpeza do formulário
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Erro ao atualizar senha');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-start border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" 
        onClick={() => setIsOpen(true)}
      >
        <Lock className="w-4 h-4 mr-2" />
        Alterar Senha
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 animate-in fade-in slide-in-from-top-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Senha Atual (Opcional)</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova Senha</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Atualizar Senha
          </Button>
        </div>
      </form>
    </div>
  );
}