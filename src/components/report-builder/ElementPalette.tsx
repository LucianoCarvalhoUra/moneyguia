import { PALETTE, DATA_FIELDS, ElementType } from '@/types/reportBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Shapes, GripVertical } from 'lucide-react';

interface Props {
  onAddElement: (type: ElementType) => void;
  onAddField: (token: string) => void;
  categoryName?: string | null;
  subcategoryNames?: string[];
}

const GROUPS: Array<'Molduras' | 'Texto' | 'Tabelas' | 'Mídia'> = ['Molduras', 'Texto', 'Tabelas', 'Mídia'];

export default function ElementPalette({ onAddElement, onAddField, categoryName, subcategoryNames = [] }: Props) {
  const fieldGroups = Array.from(new Set(DATA_FIELDS.map((f) => f.group)));
  const slug = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();


  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <Tabs defaultValue="elements" className="flex h-full flex-col">
        <TabsList className="m-2 grid grid-cols-2">
          <TabsTrigger value="elements" className="text-xs">
            <Shapes className="mr-1 h-3.5 w-3.5" /> Elementos
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs">
            <Database className="mr-1 h-3.5 w-3.5" /> Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="elements" className="m-0 min-h-0 flex-1">
          <ScrollArea className="h-full px-2 pb-3">
            {GROUPS.map((group) => (
              <div key={group} className="mb-3">
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-1">
                  {PALETTE.filter((p) => p.group === group).map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/x-element', p.type)}
                      onClick={() => onAddElement(p.type)}
                      className="flex w-full cursor-grab items-center gap-2 rounded-lg border border-border bg-background px-2 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent/10"
                    >
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="data" className="m-0 min-h-0 flex-1">
          <ScrollArea className="h-full px-2 pb-3">
            <p className="px-1 pb-2 text-[11px] text-muted-foreground">
              Arraste um campo para o canvas ou clique para inserir.
            </p>
            {fieldGroups.map((group) => (
              <div key={group} className="mb-3">
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-1">
                  {DATA_FIELDS.filter((f) => f.group === group).map((f) => (
                    <button
                      key={f.token}
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/x-field', f.token)}
                      onClick={() => onAddField(f.token)}
                      className="w-full cursor-grab rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5 text-left transition-colors hover:bg-primary/10"
                    >
                      <span className="block text-xs font-medium text-foreground">{f.label}</span>
                      <span className="block font-mono text-[10px] text-primary">{f.token}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
              Dica: use <span className="font-mono text-primary">{'{sub.aluguel}'}</span>,{' '}
              <span className="font-mono text-primary">{'{sub.condominio}'}</span> ou{' '}
              <span className="font-mono text-primary">{'{sub.iptu}'}</span> para somar automaticamente as despesas do
              agrupamento por nome.
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
