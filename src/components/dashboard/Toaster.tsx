import { Toaster as Sonner } from 'sonner';
import { Check, X, Info, AlertTriangle, Loader2 } from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group flex items-center gap-4 p-3 pr-8 rounded-2xl shadow-2xl ring-1 ring-black/5 bg-white/90 backdrop-blur-xl text-slate-900 transition-all duration-500 ease-out data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0 overflow-hidden relative',
          title: 'font-bold text-sm text-slate-900',
          description: 'text-xs text-slate-600 leading-snug',
          actionButton: 'bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg',
          cancelButton: 'bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-lg',
          icon: 'flex-shrink-0',
          closeButton:
            'absolute top-3 right-3 p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all cursor-pointer',
        },
      }}
      // Progress bar styling
      // Sonner automatically applies a progress bar. We can style it here.
      icons={{
        success: (
          <div className="rounded-full bg-emerald-500/20 p-2">
            <Check className="h-4 w-4 text-emerald-500" />
          </div>
        ),
        error: (
          <div className="rounded-full bg-red-500/20 p-2">
            <X className="h-4 w-4 text-red-500" />
          </div>
        ),
        info: (
          <div className="rounded-full bg-blue-500/20 p-2">
            <Info className="h-4 w-4 text-blue-500" />
          </div>
        ),
        warning: (
          <div className="rounded-full bg-amber-500/20 p-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
        ),
        loading: (
          <div className="rounded-full bg-slate-500/20 p-2">
            <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
          </div>
        ),
      }}
      position="bottom-right"
      expand={true}
      offset={32}
      closeButton={true}
      {...props}
    />
  );
};

export { Toaster };