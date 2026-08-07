import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Date input using the Brazilian format (dd/mm/aaaa) for display,
 * while keeping the ISO value (yyyy-mm-dd) in the form state.
 * Supports partial editing (day, month or year separately).
 */
export interface DateInputBRProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** ISO value: yyyy-mm-dd */
  value?: string;
  onChange?: (isoValue: string) => void;
}

function isoToBr(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("T")[0].split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function brToIso(br: string) {
  const digits = br.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return "";
  }
  return `${y}-${m}-${d}`;
}

function maskBr(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Index in the masked string right after `n` digits. */
function caretForDigits(masked: string, n: number) {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < masked.length; i++) {
    if (/\d/.test(masked[i])) {
      count++;
      if (count === n) return i + 1;
    }
  }
  return masked.length;
}

export const DateInputBR = React.forwardRef<HTMLInputElement, DateInputBRProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const caretRef = React.useRef<number | null>(null);
    const [text, setText] = React.useState(() => isoToBr(value));

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    };

    React.useEffect(() => {
      // Sync from outside only when the ISO value really differs
      if (brToIso(text) !== (value || "")) {
        setText(isoToBr(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    React.useLayoutEffect(() => {
      if (caretRef.current !== null && innerRef.current) {
        const pos = caretRef.current;
        caretRef.current = null;
        innerRef.current.setSelectionRange(pos, pos);
      }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const selection = e.target.selectionStart ?? raw.length;
      const digitsBeforeCaret = raw.slice(0, selection).replace(/\D/g, "").length;

      const masked = maskBr(raw);
      caretRef.current = caretForDigits(masked, digitsBeforeCaret);

      setText(masked);
      const iso = brToIso(masked);
      if (iso || masked === "") onChange?.(iso);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const iso = brToIso(text);
      if (!iso && text !== "") setText(isoToBr(value));
      props.onBlur?.(e);
    };

    return (
      <Input
        ref={setRefs}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        {...props}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
      />
    );
  }
);
DateInputBR.displayName = "DateInputBR";
