import { create } from 'zustand';

interface ReportElement {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props: any;
}

interface ReportTemplate {
  name: string;
  tables: string[];
  relationships: any[];
  layout: ReportElement[];
}

interface ReportState {
  template: ReportTemplate;
  selectedElementId: string | null;
  isPreviewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  setSelectedElement: (id: string | null) => void;
  addElement: (type: string) => void;
  updateElementProps: (id: string, props: any) => void;
  updateLayout: (layout: any) => void;
}

export const useReportStore = create<ReportState>((set) => ({
  template: {
    name: 'Novo Relatório',
    tables: [],
    relationships: [],
    layout: [],
  },
  selectedElementId: null,
  isPreviewMode: false,

  setPreviewMode: (isPreviewMode) => set({ isPreviewMode }),
  setSelectedElement: (selectedElementId) => set({ selectedElementId }),
  
  addElement: (type) => set((state) => ({
    template: {
      ...state.template,
      layout: [
        ...state.template.layout,
        {
          id: crypto.randomUUID(),
          type: type as any,
          x: 0, y: Infinity, w: 4, h: 4,
          props: { title: `Novo ${type}` }
        }
      ]
    }
  })),

  updateElementProps: (id, props) => set((state) => ({
    template: {
      ...state.template,
      layout: state.template.layout.map(el => 
        el.id === id ? { ...el, props: { ...el.props, ...props } } : el
      )
    }
  })),

  updateLayout: (newLayout) => set((state) => ({
    template: {
      ...state.template,
      layout: state.template.layout.map(el => {
        const gridItem = newLayout.find((li: any) => li.i === el.id);
        return gridItem ? { ...el, x: gridItem.x, y: gridItem.y, w: gridItem.w, h: gridItem.h } : el;
      })
    }
  }))
}));