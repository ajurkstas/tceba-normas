import { useEffect, type ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { registrarVoltar } from '../servicos/voltar';

export function Modal({ titulo, aberto, aoFechar, children, rodape }: { titulo: string; aberto: boolean; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const remover = registrarVoltar(aoFechar);
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => { remover(); window.removeEventListener('keydown', tecla); document.body.style.overflow = ''; };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[95vh] w-full flex-col rounded-t-lg bg-white shadow-xl sm:max-w-2xl sm:rounded-lg dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-300 px-4 py-3 dark:border-slate-700">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" aria-label="Fechar" onClick={aoFechar} className="rounded p-2 text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {rodape && <div className="border-t border-stone-300 px-4 py-3 dark:border-slate-700">{rodape}</div>}
      </div>
    </div>
  );
}
