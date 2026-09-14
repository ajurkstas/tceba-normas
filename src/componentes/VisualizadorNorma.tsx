import { useEffect, useMemo } from 'react';
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Norma } from '../dominio/tipos';
import { codigoNorma, rotuloSituacao } from '../dominio/hierarquia';
import { estruturarTexto, type Bloco, type BlocoDivisao } from '../dominio/estruturaNorma';
import { registrarVoltar } from '../servicos/voltar';
import { Botao } from './basicos';

// Leitura no padrão dos textos legais do Planalto: fonte serifada, texto corrido,
// artigos em parágrafos comuns, incisos recuados com barra lateral, ementa recuada
// à direita e divisões (título, capítulo, seção) como listas retráteis, abertas.
const PARAGRAFO = 'my-3 indent-8 leading-relaxed hyphens-auto sm:text-justify';

function Divisao({ bloco }: { bloco: BlocoDivisao }) {
  return (
    <details open className="group my-4">
      <summary className="flex cursor-pointer list-none flex-col items-center rounded py-2 text-center font-sans hover:bg-stone-200/60 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
          <ChevronDownIcon className="h-4 w-4 text-slate-500 transition group-open:rotate-0 -rotate-90" />
          {bloco.titulo}
        </span>
        {bloco.subtitulo && <span className="text-sm font-semibold uppercase tracking-wide">{bloco.subtitulo}</span>}
      </summary>
      <Blocos blocos={bloco.filhos} />
    </details>
  );
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <>
      {blocos.map((b, i) => {
        if (b.tipo === 'divisao') return <Divisao key={i} bloco={b} />;
        switch (b.tipo) {
          case 'cabecalho':
            return <p key={i} className="my-1 text-center font-sans text-sm font-medium">{b.texto}</p>;
          case 'ementa':
            return <p key={i} className="my-6 ml-[30%] leading-relaxed sm:ml-[40%]">{b.texto}</p>;
          case 'considerando':
            return <p key={i} className={`${PARAGRAFO} mb-5`}>{b.texto}</p>;
          case 'rotulo':
            return <p key={i} className="my-5 text-center font-sans text-sm font-semibold uppercase tracking-wide">{b.texto}</p>;
          case 'inciso':
            return <p key={i} className="my-1.5 ml-8 border-l-2 border-amber-700/60 pl-3 leading-relaxed hyphens-auto sm:text-justify dark:border-amber-400/60">{b.texto}</p>;
          default:
            return <p key={i} className={PARAGRAFO}>{b.texto}</p>;
        }
      })}
    </>
  );
}

export function VisualizadorNorma({ norma, aoFechar, aoEditar }: { norma: Norma; aoFechar: () => void; aoEditar?: () => void }) {
  const blocos = useMemo(() => estruturarTexto(norma.texto, norma.ementa), [norma]);

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
        <div className="min-w-0 flex-1 truncate font-mono text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{codigoNorma(norma)}</div>
        {aoEditar && (
          <Botao pequeno variante="fantasma" onClick={aoEditar} aria-label="Editar norma" title="Editar norma"><PencilSquareIcon className="h-5 w-5" /></Botao>
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto max-w-3xl px-5 py-6 font-serif text-base text-slate-900 dark:text-stone-100">
          <h1 className="text-center font-sans text-lg font-semibold uppercase tracking-wide">{norma.tipo}{norma.numero ? ` nº ${norma.numero}` : ''}</h1>
          <p className="mb-6 mt-1 text-center font-sans text-xs text-slate-500 dark:text-slate-400">
            {norma.data && <>Aprovada em {norma.data}. </>}
            Situação: {rotuloSituacao(norma.status)}.
            {norma.obs && <> {norma.obs}</>}
            {norma.link && (
              <> <a href={norma.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">Fonte oficial <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /></a></>
            )}
          </p>
          <Blocos blocos={blocos} />
        </article>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
