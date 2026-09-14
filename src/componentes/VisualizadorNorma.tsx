import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowTopRightOnSquareIcon, ChevronDownIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Norma } from '../dominio/tipos';
import { codigoNorma, rotuloSituacao } from '../dominio/hierarquia';
import { estruturarTexto, extrairIdentificadorDispositivo, localizarDispositivo, type Bloco, type BlocoDivisao } from '../dominio/estruturaNorma';
import { registrarVoltar } from '../servicos/voltar';
import { Botao } from './basicos';

// Leitura no padrão dos textos legais do Planalto: fonte serifada, texto corrido,
// artigos em parágrafos comuns, incisos recuados com barra lateral, ementa recuada
// à direita e divisões (título, capítulo, seção) como listas retráteis, abertas.
const PARAGRAFO = 'my-3 indent-8 leading-relaxed hyphens-auto sm:text-justify';
const DESTAQUE = 'rounded bg-amber-100 ring-2 ring-amber-700 dark:bg-amber-900/40 dark:ring-amber-400 transition-colors duration-1000';

// Contador compartilhado durante uma passagem de renderização, para achar,
// entre os blocos de texto (folhas), aquele cujo índice bate com o dispositivo
// citado pela IA (`localizarDispositivo`), e destacá-lo.
interface ContextoFoco { alvo: number | null; contador: { valor: number }; refAlvo: RefObject<HTMLParagraphElement | null>; destacado: boolean }

function Divisao({ bloco, foco }: { bloco: BlocoDivisao; foco: ContextoFoco }) {
  return (
    <details open className="group my-4">
      <summary className="flex cursor-pointer list-none flex-col items-center rounded py-2 text-center font-sans hover:bg-stone-200/60 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide">
          <ChevronDownIcon className="h-4 w-4 text-slate-500 transition group-open:rotate-0 -rotate-90" />
          {bloco.titulo}
        </span>
        {bloco.subtitulo && <span className="text-sm font-semibold uppercase tracking-wide">{bloco.subtitulo}</span>}
      </summary>
      <Blocos blocos={bloco.filhos} foco={foco} />
    </details>
  );
}

function Blocos({ blocos, foco }: { blocos: Bloco[]; foco: ContextoFoco }) {
  return (
    <>
      {blocos.map((b, i) => {
        if (b.tipo === 'divisao') return <Divisao key={i} bloco={b} foco={foco} />;
        const minhaOrdem = foco.contador.valor++;
        const ehAlvo = foco.alvo !== null && minhaOrdem === foco.alvo;
        const props: { id?: string; ref?: RefObject<HTMLParagraphElement | null>; className?: string } = ehAlvo
          ? { id: 'dispositivo-alvo', ref: foco.refAlvo, className: foco.destacado ? DESTAQUE : '' }
          : {};
        switch (b.tipo) {
          case 'cabecalho':
            return <p key={i} {...props} className={`my-1 text-center font-sans text-sm font-medium ${props.className ?? ''}`}>{b.texto}</p>;
          case 'ementa':
            return <p key={i} {...props} className={`my-6 ml-[30%] leading-relaxed sm:ml-[40%] ${props.className ?? ''}`}>{b.texto}</p>;
          case 'considerando':
            return <p key={i} {...props} className={`${PARAGRAFO} mb-5 ${props.className ?? ''}`}>{b.texto}</p>;
          case 'rotulo':
            return <p key={i} {...props} className={`my-5 text-center font-sans text-sm font-semibold uppercase tracking-wide ${props.className ?? ''}`}>{b.texto}</p>;
          case 'inciso':
            return <p key={i} {...props} className={`my-1.5 ml-8 border-l-2 border-amber-700/60 pl-3 leading-relaxed hyphens-auto sm:text-justify dark:border-amber-400/60 ${props.className ?? ''}`}>{b.texto}</p>;
          default:
            return <p key={i} {...props} className={`${PARAGRAFO} ${props.className ?? ''}`}>{b.texto}</p>;
        }
      })}
    </>
  );
}

export function VisualizadorNorma({ norma, foco, aoFechar, aoEditar }: { norma: Norma; foco?: string; aoFechar: () => void; aoEditar?: () => void }) {
  const blocos = useMemo(() => estruturarTexto(norma.texto, norma.ementa), [norma]);
  const identificador = useMemo(() => (foco ? extrairIdentificadorDispositivo(foco) : null), [foco]);
  const alvo = useMemo(() => (identificador ? localizarDispositivo(blocos, identificador) : null), [blocos, identificador]);
  const refAlvo = useRef<HTMLParagraphElement | null>(null);
  const [destacado, setDestacado] = useState(true);

  useEffect(() => {
    const remover = registrarVoltar(aoFechar);
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    window.addEventListener('keydown', tecla);
    document.body.style.overflow = 'hidden';
    return () => { remover(); window.removeEventListener('keydown', tecla); document.body.style.overflow = ''; };
  }, [aoFechar]);

  useEffect(() => {
    if (alvo === null) return;
    setDestacado(true);
    const rolar = setTimeout(() => refAlvo.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    const apagar = setTimeout(() => setDestacado(false), 3000);
    return () => { clearTimeout(rolar); clearTimeout(apagar); };
  }, [alvo]);

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
          <Blocos blocos={blocos} foco={{ alvo, contador: { valor: 0 }, refAlvo, destacado }} />
        </article>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
