import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LayoutDashboard, PieChart, TrendingUp, BarChart3, Wallet, ArrowUpDown } from 'lucide-react';

export interface DashboardSettings {
  showEssential: boolean;
  showSuperfluous: boolean;
  showFixed: boolean;
  showVariable: boolean;
  showLongTerm: boolean;
  show503020: boolean;
  showDailyFlow: boolean;
  showProjection: boolean;
  showComparison: boolean;
}

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  showEssential: true,
  showSuperfluous: true,
  showFixed: true,
  showVariable: true,
  showLongTerm: true,
  show503020: true,
  showDailyFlow: true,
  showProjection: true,
  showComparison: true,
};

export default function DashboardCustomization() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('dashboard_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const toggleSetting = (key: keyof DashboardSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    localStorage.setItem('dashboard_settings', JSON.stringify(newSettings));
  };

  const items = [
    { key: 'show503020', label: 'Regra 50/30/20', desc: 'Análise de distribuição ideal de renda', icon: PieChart },
    { key: 'showProjection', label: 'Projeção de Saldo', desc: 'Tendência para os próximos 3 meses', icon: TrendingUp },
    { key: 'showDailyFlow', label: 'Fluxo Diário', desc: 'Entradas e saídas por dia', icon: BarChart3 },
    { key: 'showComparison', label: 'Comparativo Mensal', desc: 'Gastos por categoria vs mês anterior', icon: ArrowUpDown },
    { key: 'showEssential', label: 'Despesas Essenciais', desc: 'Habitação, Saúde, Alimentação', icon: Wallet },
    { key: 'showSuperfluous', label: 'Despesas Supérfluas', desc: 'Lazer, Streaming, Compras', icon: Wallet },
    { key: 'showFixed', label: 'Despesas Fixas', desc: 'Contas recorrentes', icon: Wallet },
    { key: 'showVariable', label: 'Despesas Variáveis', desc: 'Consumo flutuante', icon: Wallet },
    { key: 'showLongTerm', label: 'Longo Prazo', desc: 'Parcelamentos e Financiamentos', icon: Wallet },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          Personalização do Dashboard
        </CardTitle>
        <CardDescription>Escolha quais métricas e gráficos você quer ver</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-full border">
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
                  {item.label}
                </Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <Switch
              id={item.key}
              checked={settings[item.key as keyof DashboardSettings]}
              onCheckedChange={() => toggleSetting(item.key as keyof DashboardSettings)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}