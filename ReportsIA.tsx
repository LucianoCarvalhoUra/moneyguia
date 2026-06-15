import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Handle,
  Position,
  NodeProps,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon, 
  Table as TableIcon, 
  Layout, 
  Type, 
  Hash, 
  Settings2,
  Trash2,
  Database,
  Move,
  ChevronRight,
  Plus,
  MousePointer2,
  CheckSquare,
  AlignLeft,
  Heading1,
  SeparatorHorizontal
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// --- Custom Node Components ---

const DataSourceNode = ({ data }: NodeProps) => (
  <Card className="min-w-[180px] border-slate-200 shadow-lg overflow-hidden bg-white">
    <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-bold text-emerald-900 uppercase tracking-tight">{data.label as string}</span>
      </div>
      <Badge variant="outline" className="text-[10px] bg-white text-emerald-700 border-emerald-200 h-4 px-1">
        {data.fieldsCount || 0} fields
      </Badge>
    </div>
    <div className="p-3 space-y-1">
      {((data.fields as string[]) || []).slice(0, 3).map(field => (
        <div key={field} className="text-[10px] text-slate-500 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          {field}
        </div>
      ))}
      {(data.fieldsCount as number) > 3 && <div className="text-[9px] text-slate-400 italic">...and more</div>}
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-emerald-500 border-white" />
  </Card>
);

const VisualNode = ({ data }: NodeProps) => (
  <Card className="min-w-[160px] border-slate-200 shadow-lg overflow-hidden bg-white">
    <Handle type="target" position={Position.Left} className="w-2 h-2 bg-blue-500 border-white" />
    <div className="bg-blue-50 px-3 py-2 border-b border-blue-100 flex items-center gap-2">
      <div className="p-1 rounded bg-white">{data.icon as React.ReactNode}</div>
      <span className="text-xs font-bold text-blue-900">{data.label as string}</span>
    </div>
    <div className="p-4 flex items-center justify-center bg-slate-50/50 min-h-[60px]">
       <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-400 w-2/3" />
       </div>
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-blue-500 border-white" />
  </Card>
);

const InputNode = ({ data }: NodeProps) => (
  <Card className="min-w-[140px] border-slate-200 shadow-sm bg-white p-3">
    <div className="flex items-center gap-2 mb-2">
      {data.icon as React.ReactNode}
      <span className="text-xs font-medium text-slate-700">{data.label as string}</span>
    </div>
    <div className="h-6 bg-slate-50 border border-slate-100 rounded flex items-center px-2 text-[10px] text-slate-400 italic">
      User input...
    </div>
    <Handle type="source" position={Position.Right} className="w-2 h-2 bg-slate-400 border-white" />
  </Card>
);

const nodeTypes = {
  dataSource: DataSourceNode,
  visual: VisualNode,
  input: InputNode,
};

// --- Configurações da Paleta ---

const PALETTE = {
  dataSources: [
    { type: 'dataSource', label: 'Expenses', id: 'expenses', fields: ['Amount', 'Date', 'Category', 'Account', 'Status', 'Description'] },
    { type: 'dataSource', label: 'Incomes', id: 'incomes', fields: ['Value', 'Date', 'Source', 'Received', 'Account'] },
    { type: 'dataSource', label: 'Categories', id: 'categories', fields: ['Name', 'Icon', 'Color', 'Target'] },
    { type: 'dataSource', label: 'Bank Accounts', id: 'accounts', fields: ['Bank', 'Balance', 'Type', 'Limit'] },
  ],
  visuals: [
    { type: 'visual', label: 'Pie Chart', id: 'pie', icon: <PieChartIcon className="w-3 h-3 text-blue-600" /> },
    { type: 'visual', label: 'Bar Chart', id: 'bar', icon: <LineChartIcon className="w-3 h-3 text-blue-600" /> },
    { type: 'visual', label: 'KPI Card', id: 'kpi', icon: <Hash className="w-3 h-3 text-blue-600" /> },
    { type: 'visual', label: 'Data Table', id: 'table', icon: <TableIcon className="w-3 h-3 text-blue-600" /> },
  ],
  inputs: [
    { type: 'input', label: 'Number Field', id: 'in-num', icon: <Hash className="w-3 h-3 text-slate-500" /> },
    { type: 'input', label: 'Text Input', id: 'in-txt', icon: <AlignLeft className="w-3 h-3 text-slate-500" /> },
    { type: 'input', label: 'Select Box', id: 'in-sel', icon: <ChevronRight className="w-3 h-3 text-slate-500" /> },
    { type: 'input', label: 'Checkbox', id: 'in-chk', icon: <CheckSquare className="w-3 h-3 text-slate-500" /> },
  ],
  textUI: [
    { type: 'input', label: 'Heading', id: 'ui-h1', icon: <Heading1 className="w-3 h-3 text-slate-500" /> },
    { type: 'input', label: 'Separator', id: 'ui-sep', icon: <SeparatorHorizontal className="w-3 h-3 text-slate-500" /> },
  ]
};

export default function ReportsIA() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#10b981' } }, eds)),
    []
  );

  const onDragStart = (event: React.DragEvent, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));

      if (typeof data === 'undefined' || !data) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${data.type}-${Date.now()}`,
        type: data.type,
        position,
        data: { 
          label: data.label, 
          fields: data.fields, 
          fieldsCount: data.fields?.length,
          icon: data.icon 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedId(node.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setNodes((nds) => nds.filter((node) => node.id !== selectedId));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden select-none">
      
      {/* 1. BARRA LATERAL ESQUERDA (Paleta) */}
      <aside className="w-[260px] border-r bg-white flex flex-col z-20">
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Construtor Visual
          </h2>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">Arraste para o canvas</p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* DATA SOURCES */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Data Sources</h3>
              <div className="grid grid-cols-1 gap-2">
                {PALETTE.dataSources.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-emerald-500 hover:bg-white transition-all shadow-sm"
                  >
                    <Database className="w-3 h-3 text-emerald-500" /> {item.label}
                  </div>
                ))}
              </div>
            </section>

            {/* VISUALS */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Visuals</h3>
              <div className="grid grid-cols-2 gap-2">
                {PALETTE.visuals.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-medium text-slate-600 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:bg-white transition-all shadow-sm gap-2"
                  >
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>
            </section>

            {/* INPUT FIELDS */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Input Fields</h3>
              <div className="grid grid-cols-1 gap-2">
                {PALETTE.inputs.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-slate-400 hover:bg-white transition-all"
                  >
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            </section>

            {/* TEXT & UI */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Text & UI</h3>
              <div className="grid grid-cols-1 gap-2">
                {PALETTE.textUI.map(item => (
                  <div 
                    key={item.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-slate-400 hover:bg-white transition-all"
                  >
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </aside>

      {/* 2. ÁREA CENTRAL (Canvas) */}
      <main className="flex-1 relative bg-white" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50"
        >
          <Background color="#cbd5e1" variant="dots" gap={20} size={1} />
          <Controls position="bottom-right" className="bg-white border-slate-200 shadow-xl" />
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none z-10">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MousePointer2 className="w-8 h-8 opacity-20" />
              </div>
              <h3 className="text-lg font-semibold text-slate-500">Fluxo de Dados IA</h3>
              <p className="text-sm">Arraste uma tabela da esquerda para começar o pipeline</p>
            </div>
          )}
        </ReactFlow>
      </main>

      {/* 3. BARRA LATERAL DIREITA (Propriedades) */}
      <aside className="w-[280px] border-l bg-white flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20">
        <div className="p-4 border-b bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Settings2 className="w-4 h-4 text-emerald-600" /> Propriedades do Nó
          </h2>
        </div>

        <ScrollArea className="flex-1">
          {selectedNode ? (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">ID do Sistema</Label>
                  <div className="text-xs font-mono text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100 overflow-hidden text-ellipsis italic">
                    {selectedNode.id}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-700 font-semibold">Nome de Exibição</Label>
                  <Input 
                    defaultValue={selectedNode.data.label as string}
                    className="bg-white border-slate-200 mt-1.5 h-8 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-700 font-semibold">Configurações/Filtros</Label>
                  <div className="mt-2 p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
                      <Move className="w-3 h-3" /> No configuration available for this node type yet.
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="pt-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full gap-2 h-8 text-[11px]" 
                  onClick={removeSelected}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir do Fluxo
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MousePointer2 className="w-5 h-5 text-slate-300" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">Nada Selecionado</h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                Clique em um nó no canvas para configurar seus parâmetros de dados e filtros.
              </p>
            </div>
          )}
        </aside>
      
    </div>
  );
}