import React from 'react';
import { useReportStore } from './src/hooks/useReportStore';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "./src/components/ui/accordion";
import { Checkbox } from "./src/components/ui/checkbox";
import { ScrollArea } from "./src/components/ui/scroll-area";
import { 
  Database, 
  Layout, 
  Type, 
  BarChart3, 
  Table as TableIcon,
  GripVertical,
  Plus
} from 'lucide-react';
import { Badge } from "./src/components/ui/badge";
import { cn } from "./src/lib/utils";

const AVAILABLE_TABLES = [
  { id: 'expenses', name: 'Despesas', fields: ['description', 'amount', 'due_date', 'is_paid', 'payment_method'] },
  { id: 'payments', name: 'Pagamentos', fields: ['amount', 'payment_date', 'method'] },
  { id: 'categories', name: 'Categorias', fields: ['name', 'icon', 'color'] },
  { id: 'bank_accounts', name: 'Contas Bancárias', fields: ['name', 'type', 'balance'] },
];

const VISUAL_ELEMENTS = [
  { group: 'Layout', items: [
    { type: 'box', label: 'Contêiner', icon: <Layout className="h-4 w-4" /> },
    { type: 'group-card', label: 'Card', icon: <Layout className="h-4 w-4" /> },
    { type: 'separator', label: 'Divisória', icon: <Layout className="h-4 w-4" /> },
  ]},
  { group: 'Texto', items: [
    { type: 'heading', label: 'Título', icon: <Type className="h-4 w-4" /> },
    { type: 'text', label: 'Parágrafo', icon: <Type className="h-4 w-4" /> },
  ]},
  { group: 'Gráficos', items: [
    { type: 'pie-chart', label: 'Donut', icon: <BarChart3 className="h-4 w-4" /> },
    { type: 'bar-chart', label: 'Barras', icon: <BarChart3 className="h-4 w-4" /> },
    { type: 'line-chart', label: 'Linhas', icon: <BarChart3 className="h-4 w-4" /> },
  ]},
  { group: 'Dados', items: [
    { type: 'table', label: 'Tabela', icon: <TableIcon className="h-4 w-4" /> },
    { type: 'kpi', label: 'KPI', icon: <TableIcon className="h-4 w-4" /> },
  ]},
];

export default function SidebarLeft() {
  const { template, addElement } = useReportStore();

  return (
    <aside className="w-64 border-r bg-white flex flex-col h-full overflow-hidden select-none">
      <Accordion type="multiple" defaultValue={["data", "elements"]} className="w-full">
        
        {/* A. DADOS (Mapeamento do Banco de Dados) */}
        <AccordionItem value="data" className="border-b">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
              <Database className="h-4 w-4 text-emerald-600" />
              Mapeamento de Dados
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pt-0">
            <ScrollArea className="h-[300px] bg-slate-50/50">
              <div className="p-4 space-y-4">
                {AVAILABLE_TABLES.map((table) => {
                  const isSelected = template.tables.includes(table.id);
                  return (
                    <div key={table.id} className="space-y-2">
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`check-${table.id}`} 
                            checked={isSelected}
                            onCheckedChange={() => {
                              // A lógica de toggleTable deve ser implementada no useReportStore futuramente
                              console.log(`Toggle table ${table.id}`);
                            }}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <label 
                            htmlFor={`check-${table.id}`} 
                            className={cn(
                              "text-sm font-medium cursor-pointer transition-colors",
                              isSelected ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
                            )}
                          >
                            {table.name}
                          </label>
                        </div>
                        {isSelected && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="ml-6 space-y-1.5 border-l-2 border-slate-200 pl-3">
                          {table.fields.map(field => (
                            <div 
                              key={field} 
                              className="group flex items-center justify-between bg-white border border-slate-200 px-2 py-1.5 rounded-md text-[11px] text-slate-600 cursor-grab hover:border-emerald-400 hover:shadow-sm transition-all active:scale-95"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/report-field', JSON.stringify({
                                  table: table.id,
                                  field: field
                                }));
                              }}
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <GripVertical className="h-3 w-3 text-slate-300 shrink-0" />
                                <span className="truncate">{field}</span>
                              </div>
                              <Plus className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>

        {/* B. ELEMENTOS VISUAIS (Componentes de Tela) */}
        <AccordionItem value="elements" className="border-b">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-[11px] uppercase tracking-wider">
              <Layout className="h-4 w-4 text-emerald-600" />
              Elementos Visuais
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pt-0">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="p-4 space-y-6">
                {VISUAL_ELEMENTS.map((group) => (
                  <div key={group.group}>
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">{group.group}</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item) => (
                        <button
                          key={item.type}
                          onClick={() => addElement(item.type)}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md hover:bg-emerald-50/30 transition-all gap-2 group relative overflow-hidden active:scale-95"
                        >
                          <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white text-slate-400 group-hover:text-emerald-600 transition-colors">
                            {item.icon}
                          </div>
                          <span className="text-[10px] font-semibold text-slate-600 group-hover:text-emerald-700">
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-auto p-4 border-t bg-slate-50">
        <p className="text-[10px] text-slate-400 text-center italic leading-relaxed">
          Arraste campos para alimentar gráficos ou clique nos componentes para adicioná-los ao canvas.
        </p>
      </div>
    </aside>
  );
}