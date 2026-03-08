import { useState, useCallback, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalculatorPopoverProps {
  currentValue: string;
  onConfirm: (value: string) => void;
}

const formatDisplay = (num: number): string => {
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseDisplay = (str: string): number => {
  return parseFloat(str.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
};

export function CalculatorPopover({ currentValue, onConfirm }: CalculatorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const val = parseDisplay(currentValue);
      setDisplay(formatDisplay(val));
      setPreviousValue(null);
      setOperation(null);
      setResetNext(false);
    }
    setOpen(isOpen);
  };

  const handleNumber = useCallback((num: string) => {
    setDisplay(prev => {
      if (resetNext) {
        setResetNext(false);
        return num === ',' ? '0,' : num;
      }
      if (num === ',') {
        return prev.includes(',') ? prev : prev + ',';
      }
      if (prev === '0') return num;
      return prev + num;
    });
  }, [resetNext]);

  const calculate = useCallback((a: number, op: string, b: number): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  }, []);

  const handleOperation = useCallback((op: string) => {
    const current = parseDisplay(display);
    if (previousValue !== null && operation && !resetNext) {
      const result = calculate(previousValue, operation, current);
      setPreviousValue(result);
      setDisplay(formatDisplay(result));
    } else {
      setPreviousValue(current);
    }
    setOperation(op);
    setResetNext(true);
  }, [display, previousValue, operation, resetNext, calculate]);

  const handleEquals = useCallback(() => {
    if (previousValue !== null && operation) {
      const current = parseDisplay(display);
      const result = calculate(previousValue, operation, current);
      setDisplay(formatDisplay(result));
      setPreviousValue(null);
      setOperation(null);
      setResetNext(true);
    }
  }, [display, previousValue, operation, calculate]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setResetNext(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[0-9]$/.test(key)) { e.preventDefault(); handleNumber(key); }
      else if (key === ',' || key === '.') { e.preventDefault(); handleNumber(','); }
      else if (key === '+') { e.preventDefault(); handleOperation('+'); }
      else if (key === '-') { e.preventDefault(); handleOperation('-'); }
      else if (key === '*') { e.preventDefault(); handleOperation('×'); }
      else if (key === '/') { e.preventDefault(); handleOperation('÷'); }
      else if (key === 'Enter') { e.preventDefault(); handleConfirm(); }
      else if (key === 'Escape') { e.preventDefault(); setOpen(false); }
      else if (key === 'Backspace' || key === 'Delete') { e.preventDefault(); handleClear(); }
      else if (key === '=') { e.preventDefault(); handleEquals(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleNumber, handleOperation, handleEquals, handleClear, handleConfirm]);

  const handleConfirm = useCallback(() => {
    // Execute pending operation first
    let finalValue = parseDisplay(display);
    if (previousValue !== null && operation) {
      finalValue = calculate(previousValue, operation, finalValue);
    }
    const formatted = finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    onConfirm(formatted);
    setOpen(false);
  }, [display, previousValue, operation, calculate, onConfirm]);

  const buttons = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', ',', 'C', '+'],
  ];

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
        >
          <Calculator className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        {/* Display */}
        <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-right">
          {operation && previousValue !== null && (
            <div className="text-xs text-muted-foreground">
              {formatDisplay(previousValue)} {operation}
            </div>
          )}
          <div className="text-lg font-bold text-foreground truncate">{display}</div>
        </div>

        {/* Buttons grid */}
        <div className="grid grid-cols-4 gap-1.5">
          {buttons.map((row, ri) =>
            row.map((btn) => {
              const isOp = ['+', '-', '×', '÷'].includes(btn);
              const isClear = btn === 'C';
              return (
                <Button
                  key={`${ri}-${btn}`}
                  type="button"
                  variant={isOp ? 'secondary' : isClear ? 'outline' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-9 text-sm font-semibold",
                    isOp && "text-primary font-bold",
                    isClear && "text-destructive",
                    operation === btn && !resetNext && "ring-2 ring-primary"
                  )}
                  onClick={() => {
                    if (isClear) handleClear();
                    else if (isOp) handleOperation(btn);
                    else handleNumber(btn);
                  }}
                >
                  {btn}
                </Button>
              );
            })
          )}
        </div>

        {/* Confirm button */}
        <Button
          type="button"
          className="mt-2 w-full h-9 font-bold"
          onClick={handleConfirm}
        >
          Confirmar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
