import { Toaster as Sonner } from 'sonner';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-start gap-x-3 w-full p-4 rounded-xl shadow-lg bg-background text-foreground border-l-4 data-[type=success]:border-emerald-500 data-[type=error]:border-red-500 data-[type=info]:border-blue-500 data-[type=warning]:border-yellow-500',
          title: 'font-semibold text-sm',
          description: 'text-sm text-muted-foreground',
          icon: 'flex-shrink-0 mt-0.5',
          closeButton:
            'absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-transparent hover:bg-muted transition-colors',
        },
      }}
      icons={{
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
      }}
      // Posicionamento: Canto superior direito (Desktop) e topo centralizado (Mobile).
      // A posição 'top-right' oferece uma boa experiência em ambas as plataformas.
      position="top-right"
      // A animação "Spring" e a barra de progresso são comportamentos padrão do Sonner.
      {...props}
    />
  );
};

export { Toaster };