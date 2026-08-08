import { ReportElement, DATA_FIELDS } from '@/types/reportBuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Italic, Plus, Trash2 } from 'lucide-react';

interface Props {
  element: ReportElement | null;
  onChange: (patch: Partial<ReportElement>) => void;
  onStyleChange: (patch: Partial<ReportElement['style']>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function PropertiesPanel({ element, onChange, onStyleChange, onDelete, onDuplicate }: Props) {
  if (!element) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Selecione um elemento no canvas para editar suas propriedades.
      </div>
    );
  }

  const s = element.style;
  const isText = ['heading', 'text', 'label', 'watermark', 'box', 'card', 'table'].includes(element.type);
  const rows = element.rows ?? [];

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Propriedades</p>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDuplicate} title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3">
          {isText && (
            <div className="space-y-2">
              <Label className="text-xs">Conteúdo (estático ou dinâmico)</Label>
              <Textarea
                value={element.content}
                onChange={(e) => onChange({ content: e.target.value })}
                rows={3}
                className="text-xs"
                placeholder="Ex: Locadora: Zenailda Soares de Carvalho ou TOTAL: {expense.amount}"
              />
              <Select onValueChange={(v) => onChange({ content: `${element.content}${v}` })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Inserir campo dinâmico..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {DATA_FIELDS.map((f) => (
                    <SelectItem key={f.token} value={f.token} className="text-xs">
                      {f.label} — <span className="font-mono">{f.token}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {element.type === 'image' && (
            <div className="space-y-2">
              <Label className="text-xs">URL da imagem / logo</Label>
              <Input
                value={element.src ?? ''}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
          )}

          {element.type === 'table' && (
            <div className="space-y-2">
              <Label className="text-xs">Linhas da tabela</Label>
              {rows.map((r, i) => (
                <div key={i} className="flex gap-1">
                  <Input
                    value={r.label}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], label: e.target.value };
                      onChange({ rows: next });
                    }}
                    className="h-8 text-xs"
                    placeholder="Rótulo"
                  />
                  <Input
                    value={r.value}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], value: e.target.value };
                      onChange({ rows: next });
                    }}
                    className="h-8 font-mono text-xs"
                    placeholder="{sub.aluguel}"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-destructive"
                    onClick={() => onChange({ rows: rows.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => onChange({ rows: [...rows, { label: 'Item', value: '{sub.item}' }] })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar linha
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => onChange({ x: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => onChange({ y: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Largura</Label>
              <Input
                type="number"
                value={Math.round(element.w)}
                onChange={(e) => onChange({ w: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Altura</Label>
              <Input
                type="number"
                value={Math.round(element.h)}
                onChange={(e) => onChange({ h: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Fonte: {s.fontSize}px</Label>
            <Slider
              value={[s.fontSize]}
              min={8}
              max={72}
              step={1}
              onValueChange={([v]) => onStyleChange({ fontSize: v })}
            />
            <div className="flex gap-1">
              <Button
                size="icon"
                variant={s.fontWeight === 'bold' ? 'default' : 'outline'}
                className="h-8 w-8"
                onClick={() => onStyleChange({ fontWeight: s.fontWeight === 'bold' ? 'normal' : 'bold' })}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={s.italic ? 'default' : 'outline'}
                className="h-8 w-8"
                onClick={() => onStyleChange({ italic: !s.italic })}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <div className="mx-1 w-px bg-border" />
              {([
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
              ] as const).map(([a, Icon]) => (
                <Button
                  key={a}
                  size="icon"
                  variant={s.align === a ? 'default' : 'outline'}
                  className="h-8 w-8"
                  onClick={() => onStyleChange({ align: a })}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Cor do texto</Label>
              <Input
                type="color"
                value={s.color}
                onChange={(e) => onStyleChange({ color: e.target.value })}
                className="h-8 p-1"
              />
            </div>
            <div>
              <Label className="text-xs">Fundo</Label>
              <Input
                type="color"
                value={s.background === 'transparent' ? '#ffffff' : s.background}
                onChange={(e) => onStyleChange({ background: e.target.value })}
                className="h-8 p-1"
              />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-6 w-full text-[10px]"
                onClick={() => onStyleChange({ background: 'transparent' })}
              >
                Sem fundo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Borda ({s.borderWidth}px)</Label>
              <Slider
                value={[s.borderWidth]}
                min={0}
                max={8}
                step={1}
                onValueChange={([v]) => onStyleChange({ borderWidth: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Cor da borda</Label>
              <Input
                type="color"
                value={s.borderColor}
                onChange={(e) => onStyleChange({ borderColor: e.target.value })}
                className="h-8 p-1"
              />
            </div>
            <div>
              <Label className="text-xs">Arredondar ({s.radius}px)</Label>
              <Slider
                value={[s.radius]}
                min={0}
                max={32}
                step={1}
                onValueChange={([v]) => onStyleChange({ radius: v })}
              />
            </div>
            <div>
              <Label className="text-xs">Espaçamento ({s.padding}px)</Label>
              <Slider
                value={[s.padding]}
                min={0}
                max={40}
                step={2}
                onValueChange={([v]) => onStyleChange({ padding: v })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Opacidade ({Math.round((s.opacity ?? 1) * 100)}%)</Label>
            <Slider
              value={[(s.opacity ?? 1) * 100]}
              min={5}
              max={100}
              step={5}
              onValueChange={([v]) => onStyleChange({ opacity: v / 100 })}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
