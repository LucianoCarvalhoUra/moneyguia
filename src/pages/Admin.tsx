import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Mail, Loader2, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  smtp_user: string;
  smtp_host: string;
  smtp_port: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminCheck();
  const [settings, setSettings] = useState<SystemSettings>({
    smtp_user: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
  });
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error('Acesso não autorizado');
      navigate('/');
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((item) => {
          settingsMap[item.setting_key] = item.setting_value || '';
        });

        setSettings({
          smtp_user: settingsMap['smtp_user'] || '',
          smtp_host: settingsMap['smtp_host'] || 'smtp.gmail.com',
          smtp_port: settingsMap['smtp_port'] || '465',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Upsert each setting
      const settingsToSave = [
        { setting_key: 'smtp_user', setting_value: settings.smtp_user },
        { setting_key: 'smtp_host', setting_value: settings.smtp_host },
        { setting_key: 'smtp_port', setting_value: settings.smtp_port },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast.success('Configurações SMTP salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    console.log('Chamando Edge Function...');
    try {
      const { data, error } = await supabase.functions.invoke('check-due-expenses', {
        body: { test: true },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Teste concluído! ${data.totalEmailsSent} e-mail(s) enviado(s).`);
      } else {
        toast.info(data?.message || 'Nenhum e-mail enviado');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      toast.error('Erro ao testar envio de e-mail');
    } finally {
      setIsTesting(false);
    }
  };

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

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Configuração SMTP Global
          </CardTitle>
          <CardDescription>
            Configure o servidor SMTP para envio de e-mails de alerta para todos os usuários.
            Use uma Senha de Aplicativo do Gmail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Importante sobre Gmail:</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
                      <li>Ative a verificação em duas etapas na sua conta Google</li>
                      <li>Gere uma "Senha de Aplicativo" em: Conta Google → Segurança → Senhas de app</li>
                      <li>Use essa senha de 16 caracteres no campo abaixo</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">E-mail do Remetente (SMTP_USER)</Label>
                  <Input
                    id="smtp_user"
                    type="email"
                    placeholder="seu-email@gmail.com"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Host SMTP</Label>
                  <Input
                    id="smtp_host"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Porta SMTP</Label>
                  <Input
                    id="smtp_port"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha de Aplicativo</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para manter a senha atual (armazenada em Secrets)
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Credenciais SMTP configuradas via Secrets</p>
                    <p className="text-muted-foreground">
                      SMTP_USER, SMTP_PASS, SMTP_HOST e SMTP_PORT estão armazenados de forma segura.
                      Use o botão "Testar Envio" para verificar a configuração.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
                <Button variant="outline" onClick={handleTestEmail} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Testar Envio
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Como funciona:</strong> Os e-mails de alerta são enviados usando as credenciais 
              SMTP configuradas acima. Cada usuário recebe alertas no e-mail cadastrado nas suas 
              configurações de notificação.
            </p>
            <p>
              <strong>Segurança:</strong> A senha SMTP é armazenada de forma segura nas variáveis 
              de ambiente (Secrets) e nunca é exposta no código ou banco de dados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
