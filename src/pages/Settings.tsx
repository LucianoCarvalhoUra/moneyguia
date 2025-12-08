import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Shield, Loader2 } from 'lucide-react';
import CategoryManager from '@/components/settings/CategoryManager';
import WhatsAppSettings from '@/components/settings/WhatsAppSettings';

interface Profile {
  name: string;
  email: string;
}

export default function Settings() {
  const { user } = useAuth();
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

      {/* Categories Manager */}
      <CategoryManager />

      {/* WhatsApp Notifications */}
      <WhatsAppSettings />

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
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              Para alterar sua senha ou outras configurações de segurança,
              entre em contato com o suporte.
            </p>
            <Button variant="outline" disabled>
              Alterar Senha (em breve)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
