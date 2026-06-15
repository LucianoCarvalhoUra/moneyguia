import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Table as TableIcon, 
  Layout, 
  Type, 
  Hash, 
  Settings2,
  Trash2,
  GripVertical,
  Database,
  Move
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

// --- Tipos e Interfaces ---
type ElementType = 'pie-chart' | 'line-chart' | 'table' | 'kpi' | 'divider' | 'text';

interface LayoutElement {
  id: string;
  type: ElementType;
  title: string;
  config: {
    value?: string;
    filter?: string;
    color?: string;
  };
}

// --- Mocks de Dados ---
const MOCK_PIE_DATA = [
  { name: 'Alimentação', value: 400 },
  { name: 'Lazer', value: 300 },
  { name: 'Saúde', value: 300 },
  { name: 'Transporte', value: 200 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const PALETTE_ITEMS = [
  { type: 'kpi', label: 'Card de KPI', icon: <Hash className="w-4 h-4" /> },
  { type: 'pie-chart', label: 'Gráfico de Pizza', icon: <PieChartIcon className="w-4 h-4" /> },
  { type: 'line-chart', label: 'Gráfico de Linha', icon: <LineChartIcon className="w-4 h-4" /> },
  { type: 'table', label: 'Tabela de Dados', icon: <TableIcon className="w-4 h-4" /> },
  { type: 'text', label: 'Caixa de Texto', icon: <Type className="w-4 h-4" /> },
  { type: 'divider', label: 'Linha Divisória', icon: <Layout className="w-4 h-4" /> },
];

const DATA_FIELDS = ["Valor", "Data", "Categoria", "Conta", "Status", "Descrição"];

export default function ReportsIA() {
  const [canvasElements, setCanvasElements] = useState<LayoutElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Lógica para adicionar novo elemento da paleta ao canvas
    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const newElement: LayoutElement = {
        id: `el-${Date.now()}`,
        type: draggableId as ElementType,
        title: `Novo ${draggableId}`,
        config: { color: '#10b981' }
      };
      setCanvasElements([...canvasElements, newElement]);
      return;
    }

    // Lógica para reordenar elementos no canvas
    if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      const items = Array.from(canvasElements);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setCanvasElements(items);
    }
  };

  const removeElement = (id: string) => {
    setCanvasElements(canvasElements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateSelectedElement = (updates: Partial<LayoutElement>) => {
    setCanvasElements(canvasElements.map(el => 
      el.id === selectedId ? { ...el, ...updates } : el
    ));
  };

  const selectedElement = canvasElements.find(el => el.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      <DragDropContext onDragEnd={onDragEnd}>
        
        {/* Coluna Esquerda: Paleta de Elementos */}
        <aside className="w-[260px] border-r bg-slate-50/50 flex flex-col p-4">
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" /> Dados
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {DATA_FIELDS.map(field => (
                <div key={field} className="px-3 py-2 bg-white border border-slate-200 rounded-md text-xs text-slate-600 flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-sm hover:border-emerald-500 transition-colors">
                  <Move className="w-3 h-3 text-slate-300" /> {field}
                </div>
              ))}
            </div>
          </div>

          <Separator className="mb-6" />

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layout className="w-4 h-4" /> Componentes Visuais
          </h3>
          <Droppable droppableId="palette" isDropDisabled={true}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {PALETTE_ITEMS.map((item, index) => (
                  <Draggable key={item.type} draggableId={item.type} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:shadow-md hover:border-emerald-500 transition-all group"
                      >
                        <div className="p-1.5 rounded bg-slate-100 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 transition-colors">
                          {item.icon}
                        </div>
                        {item.label}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </aside>

        {/* Área Central: Canvas */}
        <main className="flex-1 bg-slate-50 relative p-8 overflow-y-auto custom-scrollbar">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px]"></div>
          
          <div className="max-w-4xl mx-auto min-h-full">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Construtor de Relatórios</h1>
                <p className="text-slate-500 text-sm">Monte sua visão financeira personalizada arrastando os blocos.</p>
              </div>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => console.log('Commiting to Git...')}>
                Salvar e Commitar
              </Button>
            </header>

            <Droppable droppableId="canvas">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`min-h-[600px] rounded-xl border-2 border-dashed p-6 transition-colors flex flex-col gap-4 ${
                    snapshot.isDraggingOver ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'
                  }`}
                >
                  {canvasElements.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Move className="w-8 h-8 opacity-20" />
                      <p>Arraste e solte os elementos aqui para construir seu relatório</p>
                    </div>
                  )}

                  {canvasElements.map((el, index) => (
                    <Draggable key={el.id} draggableId={el.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => setSelectedId(el.id)}
                          className={`group relative bg-white rounded-xl shadow-sm border p-5 transition-all cursor-default ${
                            selectedId === el.id ? 'ring-2 ring-emerald-500 border-transparent' : 'hover:border-slate-300'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="absolute left-1/2 -top-3 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white p-1 rounded-full cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3 h-3" />
                          </div>

                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-semibold text-slate-800">{el.title}</h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-400 hover:text-red-500"
                              onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="min-h-[100px] flex items-center justify-center bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden">
                            {el.type === 'pie-chart' && (
                              <div className="w-full h-48 py-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={MOCK_PIE_DATA} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                      {MOCK_PIE_DATA.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {el.type === 'kpi' && (
                              <div className="text-center py-6">
                                <p className="text-3xl font-bold text-slate-900">R$ 12.450,00</p>
                                <p className="text-xs text-emerald-600 font-medium">+15.4% vs mês anterior</p>
                              </div>
                            )}
                            {el.type === 'divider' && <Separator className="w-full" />}
                            {el.type === 'text' && (
                              <p className="p-4 text-slate-600 text-sm italic">Clique para configurar o texto de observações aqui...</p>
                            )}
                            {el.type === 'line-chart' && (
                               <div className="w-full h-48 p-2">
                                 <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={MOCK_PIE_DATA}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                      <XAxis dataKey="name" fontSize={10} />
                                      <YAxis fontSize={10} />
                                      <Tooltip />
                                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{r: 4}} />
                                    </LineChart>
                                 </ResponsiveContainer>
                               </div>
                            )}
                            {el.type === 'table' && (
                              <div className="w-full p-4 space-y-2 opacity-60">
                                <div className="h-4 bg-slate-200 rounded w-full"></div>
                                <div className="h-4 bg-slate-100 rounded w-full"></div>
                                <div className="h-4 bg-slate-200 rounded w-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </main>

        {/* Coluna Direita: Propriedades */}
        <aside className="w-[280px] border-l bg-white flex flex-col p-6 shadow-2xl z-10">
          <div className="flex items-center gap-2 mb-6">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Propriedades</h2>
          </div>

          {selectedElement ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Título do Bloco</Label>
                <Input 
                  value={selectedElement.title} 
                  onChange={(e) => updateSelectedElement({ title: e.target.value })}
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              {selectedElement.type !== 'divider' && (
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Filtro de Dados</Label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm text-slate-700">
                    <option>Sem Filtro</option>
                    <option>Apenas Despesas</option>
                    <option>Apenas Receitas</option>
                    <option>Por Categoria</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Tamanho da Exibição</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['P', 'M', 'G'].map(size => (
                    <Button key={size} variant="outline" size="sm" className="h-8">{size}</Button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  variant="destructive" 
                  className="w-full gap-2" 
                  onClick={() => removeElement(selectedElement.id)}
                >
                  <Trash2 className="w-4 h-4" /> Remover Bloco
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Move className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-slate-400 text-sm">
                Selecione um elemento no canvas para editar suas propriedades.
              </p>
            </div>
          )}
        </aside>

      </DragDropContext>
    </div>
  );
}