import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Shield, Loader2, Bell } from 'lucide-react';
import CategoryManager from '@/components/settings/CategoryManager';
import IncomeCategoryManager from '@/components/settings/IncomeCategoryManager';
import DeleteProfileDialog from '@/components/settings/DeleteProfileDialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Profile {
  name: string;
  email: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertDays, setAlertDays] = useState('2');
  const [alertEnabled, setAlertEnabled] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    const storedDays = localStorage.getItem('alert_days_before');
    if (storedDays) setAlertDays(storedDays);
    
    const storedEnabled = localStorage.getItem('alert_enabled');
    if (storedEnabled !== null) setAlertEnabled(storedEnabled === 'true');
  }, []);

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

  const saveAlertSettings = (enabled: boolean, days: string) => {
    setAlertEnabled(enabled);
    setAlertDays(days);
    localStorage.setItem('alert_enabled', String(enabled));
    localStorage.setItem('alert_days_before', days);
    toast.success('Preferências de alerta atualizadas');
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

      {/* Smart Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notificações Inteligentes
          </CardTitle>
          <CardDescription>Configure seus alertas de vencimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base">Alerta ao Logar</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar aviso de contas próximas do vencimento
              </p>
            </div>
            <Button 
              className={cn(alertEnabled ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80")}
              onClick={() => saveAlertSettings(!alertEnabled, alertDays)}
            >
              {alertEnabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>

          {alertEnabled && (
            <div className="space-y-2">
              <Label>Antecedência do Alerta</Label>
              <Select value={alertDays} onValueChange={(v) => saveAlertSettings(alertEnabled, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia antes</SelectItem>
                  <SelectItem value="2">2 dias antes</SelectItem>
                  <SelectItem value="7">1 semana antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

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


    </div>
  );
}
