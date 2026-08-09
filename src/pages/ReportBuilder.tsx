import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import ElementPalette from '@/components/report-builder/ElementPalette';
import ElementRenderer from '@/components/report-builder/ElementRenderer';
import PropertiesPanel from '@/components/report-builder/PropertiesPanel';
import {
  DEFAULT_STYLE,
  ElementType,
  PAGE_SIZES,
  PALETTE,
  PageSize,
  ReportElement,
  ReportTemplate,
  parseLayout,
} from '@/types/reportBuilder';

import { BindingContext, formatBRL } from '@/lib/reportBinding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, Pencil, Printer, Save, Trash2, FilePlus2 } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ReportBuilder() {
  const { user } = useAuth();
  const { expenses, categories, subcategories, accounts, cards } = useFinance();

  const [elements, setElements] = useState<ReportElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>('receipt');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('Novo comprovante');
  const [expenseId, setExpenseId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; el: ReportElement } | null>(
    null
  );

  const page = PAGE_SIZES[pageSize];
  const selected = elements.find((e) => e.id === selectedId) ?? null;

  const sortedExpenses = useMemo(
    () =>
      [...expenses]
        .filter((e) => (categoryId ? e.categoryId === categoryId : true))
        .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()),
    [expenses, categoryId]
  );

  useEffect(() => {
    if (!sortedExpenses.length) {
      if (expenseId) setExpenseId('');
      return;
    }
    if (!expenseId || !sortedExpenses.some((e) => e.id === expenseId)) {
      setExpenseId(sortedExpenses[0].id);
    }
  }, [sortedExpenses, expenseId]);

  const selectedExpense = expenses.find((e) => e.id === expenseId);
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
  const categorySubNames = useMemo(
    () =>
      categoryId
        ? subcategories.filter((s) => s.categoryId === categoryId).map((s) => s.name)
        : [],
    [subcategories, categoryId]
  );

  const ctx: BindingContext = useMemo(() => {
    const related = selectedExpense?.groupId
      ? expenses.filter((e) => e.groupId === selectedExpense.groupId)
      : selectedExpense
      ? [selectedExpense]
      : [];
    return {
      expense: selectedExpense,
      related,
      categories,
      subcategories,
      accounts,
      cards,
      categoryId,
      profileName: user?.user_metadata?.name || user?.email?.split('@')[0],
      profileEmail: user?.email,
    };
  }, [selectedExpense, expenses, categories, subcategories, accounts, cards, user, categoryId]);


  const loadTemplates = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setTemplates(
      (data ?? []).map((t: any) => {
        const parsed = parseLayout(t.layout_json);
        return {
          id: t.id,
          name: t.name,
          page_size: t.page_size as PageSize,
          layout_json: parsed.elements,
          category_id: parsed.categoryId,
          created_at: t.created_at,
        };
      })
    );

  }, [user?.id]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const addElement = (type: ElementType, x = 40, y = 40) => {
    const preset = PALETTE.find((p) => p.type === type)!;
    const el: ReportElement = {
      id: uid(),
      type,
      x,
      y,
      w: preset.defaults.w ?? 200,
      h: preset.defaults.h ?? 40,
      content: preset.defaults.content ?? '',
      rows: preset.defaults.rows,
      src: preset.defaults.src,
      style: { ...DEFAULT_STYLE, ...(preset.defaults.style ?? {}) },
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const addFieldElement = (token: string, x = 40, y = 40) => {
    const el: ReportElement = {
      id: uid(),
      type: 'text',
      x,
      y,
      w: 240,
      h: 32,
      content: token,
      style: { ...DEFAULT_STYLE },
    };
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  };

  const patchElement = (id: string, patch: Partial<ReportElement>) =>
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const patchStyle = (id: string, patch: Partial<ReportElement['style']>) =>
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, style: { ...e.style, ...patch } } : e)));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.round(e.clientX - rect.left));
    const y = Math.max(0, Math.round(e.clientY - rect.top));
    const type = e.dataTransfer.getData('application/x-element');
    const token = e.dataTransfer.getData('application/x-field');
    if (type) addElement(type as ElementType, x, y);
    else if (token) addFieldElement(token, x, y);
  };

  const startDrag = (e: React.MouseEvent, el: ReportElement, mode: 'move' | 'resize') => {
    if (preview) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(el.id);
    dragRef.current = { id: el.id, mode, startX: e.clientX, startY: e.clientY, el };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.mode === 'move') {
        patchElement(d.id, {
          x: Math.max(0, Math.min(page.width - 10, Math.round((d.el.x + dx) / 4) * 4)),
          y: Math.max(0, Math.min(page.height - 10, Math.round((d.el.y + dy) / 4) * 4)),
        });
      } else {
        patchElement(d.id, {
          w: Math.max(24, Math.round((d.el.w + dx) / 4) * 4),
          h: Math.max(16, Math.round((d.el.h + dy) / 4) * 4),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [page.width, page.height]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!templateName.trim()) {
      toast.error('Dê um nome ao modelo.');
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: templateName.trim(),
      page_size: pageSize,
      layout_json: { elements, categoryId } as any,
    };
    const { data, error } = templateId
      ? await supabase.from('report_templates').update(payload).eq('id', templateId).select().single()
      : await supabase.from('report_templates').insert(payload).select().single();
    setSaving(false);
    if (error) {
      toast.error('Não foi possível salvar o modelo.');
      console.error(error);
      return;
    }
    setTemplateId((data as any).id);
    toast.success('Modelo salvo com sucesso.');
    loadTemplates();
  };

  const handleLoad = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(t.id);
    setTemplateName(t.name);
    setPageSize(t.page_size ?? 'a4');
    setElements(Array.isArray(t.layout_json) ? t.layout_json : []);
    setCategoryId(t.category_id ?? null);
    setSelectedId(null);

  };

  const handleDeleteTemplate = async () => {
    if (!templateId) return;
    const { error } = await supabase.from('report_templates').delete().eq('id', templateId);
    if (error) {
      toast.error('Não foi possível excluir o modelo.');
      return;
    }
    toast.success('Modelo excluído.');
    setTemplateId(null);
    loadTemplates();
  };

  const handleNew = () => {
    setTemplateId(null);
    setTemplateName('Novo comprovante');
    setElements([]);
    setSelectedId(null);
  };

  const handlePrint = () => {
    setPreview(true);
    setSelectedId(null);
    setTimeout(() => window.print(), 250);
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-canvas, #report-canvas * { visibility: visible !important; }
          #report-canvas { position: fixed; inset: 0; margin: 0; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div className="min-w-[180px] flex-1">
          <Label className="text-xs">Nome do modelo</Label>
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="min-w-[180px]">
          <Label className="text-xs">Carregar modelo</Label>
          <Select value={templateId ?? undefined} onValueChange={handleLoad}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 && (
                <SelectItem value="__none" disabled>
                  Nenhum modelo salvo
                </SelectItem>
              )}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[150px]">
          <Label className="text-xs">Formato</Label>
          <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAGE_SIZES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleNew}>
            <FilePlus2 className="mr-1 h-4 w-4" /> Novo
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" /> Salvar modelo
          </Button>
          {templateId && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDeleteTemplate}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="no-print flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
        <div className="min-w-[240px] flex-1">
          <Label className="text-xs">Despesa vinculada (preenche os campos dinâmicos)</Label>
          <Select value={expenseId} onValueChange={setExpenseId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione uma despesa" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {sortedExpenses.slice(0, 100).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {new Date(e.expenseDate).toLocaleDateString('pt-BR')} — {e.description} ({formatBRL(Number(e.amount))})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={preview ? 'outline' : 'default'} onClick={() => setPreview(false)}>
            <Pencil className="mr-1 h-4 w-4" /> Edição
          </Button>
          <Button size="sm" variant={preview ? 'default' : 'outline'} onClick={() => setPreview(true)}>
            <Eye className="mr-1 h-4 w-4" /> Preview
          </Button>
          <Button size="sm" variant="secondary" onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" /> Exportar PDF / Imprimir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <div className="no-print h-[70vh] lg:sticky lg:top-16">
          <ElementPalette onAddElement={(t) => addElement(t)} onAddField={(f) => addFieldElement(f)} />
        </div>

        <div className="overflow-auto">
          <div
            id="report-canvas"
            ref={canvasRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onMouseDown={() => setSelectedId(null)}
            className="relative mx-auto bg-white shadow-md"
            style={{
              width: page.width,
              height: page.height,
              backgroundImage: preview
                ? undefined
                : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              border: '1px solid #e2e8f0',
            }}
          >
            {elements.map((el) => (
              <div
                key={el.id}
                onMouseDown={(e) => startDrag(e, el, 'move')}
                className="absolute"
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.w,
                  height: el.h,
                  cursor: preview ? 'default' : 'move',
                  outline: !preview && selectedId === el.id ? '2px solid #2563eb' : undefined,
                  outlineOffset: 2,
                }}
              >
                <ElementRenderer element={el} preview={preview} ctx={ctx} />
                {!preview && selectedId === el.id && (
                  <div
                    onMouseDown={(e) => startDrag(e, el, 'resize')}
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full bg-primary"
                  />
                )}
              </div>
            ))}
            {elements.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Arraste elementos da paleta para começar
              </div>
            )}
          </div>
        </div>

        <div className="no-print h-[70vh] lg:sticky lg:top-16">
          <PropertiesPanel
            element={selected}
            onChange={(patch) => selected && patchElement(selected.id, patch)}
            onStyleChange={(patch) => selected && patchStyle(selected.id, patch)}
            onDelete={() => {
              if (!selected) return;
              setElements((prev) => prev.filter((e) => e.id !== selected.id));
              setSelectedId(null);
            }}
            onDuplicate={() => {
              if (!selected) return;
              const copy = { ...selected, id: uid(), x: selected.x + 16, y: selected.y + 16 };
              setElements((prev) => [...prev, copy]);
              setSelectedId(copy.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
