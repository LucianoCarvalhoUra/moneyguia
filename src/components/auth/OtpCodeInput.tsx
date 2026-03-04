import { useRef } from 'react';
import { Input } from '@/components/ui/input';

interface OtpCodeInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function OtpCodeInput({ value, onChange, disabled }: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    event.preventDefault();
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, idx) => {
      next[idx] = char;
    });
    onChange(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
      {value.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="h-11 w-11 text-center text-base font-semibold"
          disabled={disabled}
          aria-label={`Digito ${index + 1} do codigo`}
        />
      ))}
    </div>
  );
}
