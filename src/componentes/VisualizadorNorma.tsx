import { useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { ArrowTopRightOnSquareIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Norma } from '../dominio/tipos';
import { codigoNorma } from '../dominio/hierarquia';
import { normaParaMarkdown } from '../dominio/normaParaMarkdown';
import { registrarVoltar } from '../servicos/voltar';
import { SeloSituacao } from './Selo';
import { Botao } from './basicos';

export function VisualizadorNorma({ norma, aoFechar, aoEditar }: { norma: Norma; aoFechar: () => void; aoEditar?: () => void }) {
  const md = useMemo(() => normaParaMarkdown(norma), [norma]);

  useEffect(() => {
    const remover = registrarVoltar(aoFechar);
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => { remover(); window.removeEventListener('keydown', tecla); document.body.style.overflow = ''; };
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-slate-950" role="dialog" aria-modal="true" aria-label={`${norma.tipo} ${norma.numero}`}>
      <header className="flex items-center gap-2 border-b border-stone-300 bg-white px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-slate-700 dark:bg-slate-900">
        <button type="button" aria-label="Fechar" onClick={aoFechar} className="rounded p-2 text-slate-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">{codigoNorma(norma)}</div>
          <div className="truncate text-sm font-medium">{norma.ementa || norma.tipo}</div>
        </div>
        <SeloSituacao status={norma.status} />
        {aoEditar && (
          <Botao pequeno variante="fantasma" onClick={aoEditar} aria-label="Editar norma"><PencilSquareIcon className="h-5 w-5" /></Botao>
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        <article className="prose prose-slate mx-auto max-w-3xl px-5 py-6 font-serif dark:prose-invert prose-headings:font-sans prose-h1:text-2xl prose-h2:mt-8 prose-h2:text-lg prose-h2:uppercase prose-h2:tracking-wide prose-h3:mt-6 prose-h3:text-base prose-h3:font-semibold prose-h3:text-amber-800 dark:prose-h3:text-amber-400 prose-blockquote:border-l-amber-700 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-slate-800 dark:prose-blockquote:text-stone-200 prose-a:text-amber-700 dark:prose-a:text-amber-400 prose-p:leading-relaxed prose-li:my-0">
          <Markdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 break-all">
                  {children} <ArrowTopRightOnSquareIcon className="inline h-3.5 w-3.5" />
                </a>
              ),
            }}
          >
            {md}
          </Markdown>
        </article>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
