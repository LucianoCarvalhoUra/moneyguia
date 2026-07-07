import { ScanLine } from 'lucide-react';
import { ReceiptUploader } from '@/components/receipts/ReceiptUploader';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

export default function Receipts() {
  useIdleTimeout();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" />
          Leitura de Comprovantes
        </h1>
        <p className="text-muted-foreground">
          Envie um comprovante de pagamento e a IA extrai e estrutura os dados automaticamente.
        </p>
      </div>

      <ReceiptUploader />
    </div>
  );
}
