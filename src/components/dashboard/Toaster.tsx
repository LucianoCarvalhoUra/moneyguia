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
            'group flex items-start gap-4 p-4 rounded-xl border border-slate-200/50 bg-white/80 backdrop-blur-md shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1),_0_10px_20px_-5px_rgb(0_0_0_/_0.05)] text-slate-900 max-w-[350px] transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none overflow-hidden relative',
          title: 'font-bold text-sm text-slate-900',
          description: 'text-xs text-slate-600 leading-snug',
          actionButton: 'bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg',
          cancelButton: 'bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-lg',
          icon: 'flex-shrink-0 mt-0.5',
          closeButton:
            'absolute top-3 right-3 p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition-all cursor-pointer',
        },
      }}
      // Progress bar styling
      // Sonner automatically applies a progress bar. We can style it here.
      icons={{
        success: (
          <div className="rounded-full bg-emerald-50 p-2 border border-emerald-100">
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
        ),
        error: (
          <div className="rounded-full bg-red-50 p-2 border border-red-100">
            <X className="h-4 w-4 text-red-600" />
          </div>
        ),
        info: (
          <div className="rounded-full bg-blue-50 p-2 border border-blue-100">
            <Info className="h-4 w-4 text-blue-600" />
          </div>
        ),
        warning: (
          <div className="rounded-full bg-amber-50 p-2 border border-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
        ),
        loading: (
          <div className="rounded-full bg-slate-50 p-2 border border-slate-100">
            <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
          </div>
        ),
      }}
      position="bottom-right"
      expand={true}
      offset={24}
      {...props}
    />
  );
};

export { Toaster };