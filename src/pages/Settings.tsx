import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Shield, Loader2, ShieldCheck } from 'lucide-react';
import CategoryManager from '@/components/settings/CategoryManager';
import IncomeCategoryManager from '@/components/settings/IncomeCategoryManager';
import DeleteProfileDialog from '@/components/settings/DeleteProfileDialog';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface Profile {
  name: string;
  email: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Fallback to auth user data
      setProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Perfil
          </CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={profile?.name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Expense Categories Manager */}
      <CategoryManager />

      {/* Income Categories Manager */}
      <IncomeCategoryManager />

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>
            Opções de segurança da conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              Para alterar sua senha ou outras configurações de segurança,
              entre em contato com o suporte.
            </p>
            <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" disabled>
              Alterar Senha (em breve)
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-destructive mb-2">Zona de Perigo</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Ações irreversíveis para sua conta.
            </p>
            <DeleteProfileDialog />
          </div>
        </CardContent>
      </Card>

      {/* Admin Link - Only visible to admins */}
      {!isAdminLoading && isAdmin && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Administração
            </CardTitle>
            <CardDescription>
              Você tem acesso ao painel administrativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin">
              <Button className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                Acessar Painel Admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
