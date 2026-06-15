import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import type { ReportElement, ElementConfig } from './types';
import { DATA_FIELDS, AGGR_LABELS } from './schema';
import { FIELD_LABELS } from './useReportData';
import { useState, useEffect } from 'react';

interface Props {
  element: ReportElement | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, config: Partial<ElementConfig>) => void;
}

export function FieldModal({ element, open, onClose, onSave }: Props) {
  const [cfg, setCfg] = useState<Partial<ElementConfig>>({});

  useEffect(() => {
    if (element) setCfg({ ...element.config });
  }, [element]);

  if (!element) return null;

  const { type } = element;
  const fields = cfg.dataSource ? DATA_FIELDS[cfg.dataSource] : [];
  const groupableFields = fields.filter(f => f.groupable);

  const set = <K extends keyof ElementConfig>(k: K, v: ElementConfig[K]) =>
    setCfg(c => ({ ...c, [k]: v }));

  const handleSave = () => {
    onSave(element.id, cfg);
    onClose();
  };

  const isChart = ['pie-chart', 'bar-chart', 'line-chart'].includes(type);
  const isTable = type === 'data-table';
  const isKpi   = type === 'kpi';

  const allFields = cfg.dataSource ? DATA_FIELDS[cfg.dataSource] : [];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Dados — {cfg.chartTitle || type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Data source */}
          <div className="space-y-1.5">
            <Label>Fonte de Dados</Label>
            <Select value={cfg.dataSource ?? ''} onValueChange={v => set('dataSource', v as 'expenses' | 'incomes')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fonte…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expenses">Despesas</SelectItem>
                <SelectItem value="incomes">Receitas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chart title */}
          {(isChart || isTable) && (
            <div className="space-y-1.5">
              <Label>Título do bloco</Label>
              <Input
                value={cfg.chartTitle ?? ''}
                onChange={e => set('chartTitle', e.target.value)}
                placeholder="Ex: Despesas por categoria"
              />
            </div>
          )}

          {/* KPI: field + label */}
          {isKpi && (
            <>
              <div className="space-y-1.5">
                <Label>Rótulo</Label>
                <Input
                  value={cfg.label ?? ''}
                  onChange={e => set('label', e.target.value)}
                  placeholder="Ex: Total Despesas"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Campo (valor numérico)</Label>
                <Select value={cfg.field ?? ''} onValueChange={v => set('field', v)}>
                  <SelectTrigger><SelectValue placeholder="Campo…" /></SelectTrigger>
                  <SelectContent>
                    {allFields.filter(f => f.type === 'number').map(f => (
                      <SelectItem key={f.key} value={f.key}>{FIELD_LABELS[f.key] ?? f.label}</SelectItem>
                    ))}
                    <SelectItem value="amount">Valor (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Charts: group by + aggregation */}
          {isChart && (
            <>
              <div className="space-y-1.5">
                <Label>Agrupar por (Eixo X)</Label>
                <Select value={cfg.groupBy ?? ''} onValueChange={v => set('groupBy', v)}>
                  <SelectTrigger><SelectValue placeholder="Campo de grupo…" /></SelectTrigger>
                  <SelectContent>
                    {groupableFields.map(f => (
                      <SelectItem key={f.key} value={f.key}>{FIELD_LABELS[f.key] ?? f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Campo de valor (Eixo Y)</Label>
                <Select value={cfg.yField ?? 'amount'} onValueChange={v => set('yField', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allFields.filter(f => f.type === 'number').map(f => (
                      <SelectItem key={f.key} value={f.key}>{FIELD_LABELS[f.key] ?? f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Aggregation (charts + kpi) */}
          {(isChart || isKpi) && (
            <div className="space-y-1.5">
              <Label>Agregação</Label>
              <Select value={cfg.aggregation ?? 'sum'} onValueChange={v => set('aggregation', v as 'sum')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGGR_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Table: columns */}
          {isTable && cfg.dataSource && (
            <div className="space-y-1.5">
              <Label>Colunas visíveis</Label>
              <div className="grid grid-cols-2 gap-2">
                {allFields.map(f => {
                  const checked = (cfg.columns ?? []).includes(f.key);
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={checked}
                        onChange={e => {
                          const cols = cfg.columns ?? [];
                          set('columns', e.target.checked
                            ? [...cols, f.key]
                            : cols.filter(c => c !== f.key));
                        }}
                      />
                      {FIELD_LABELS[f.key] ?? f.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Limit */}
          {(isTable || isChart) && (
            <div className="space-y-1.5">
              <Label>Limite de registros</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={cfg.limit ?? (isTable ? 20 : 10)}
                onChange={e => set('limit', Number(e.target.value))}
              />
            </div>
          )}

          {/* Legend toggle for charts */}
          {isChart && (
            <div className="flex items-center justify-between">
              <Label>Exibir legenda</Label>
              <Switch
                checked={cfg.showLegend ?? true}
                onCheckedChange={v => set('showLegend', v)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="gradient-primary" onClick={handleSave}>Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
