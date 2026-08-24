import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

export default function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div><strong>Prototype data:</strong> {children}</div>
    </div>
  );
}
