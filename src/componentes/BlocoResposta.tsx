import type { Resposta } from '../dominio/tipos';
import { tomVigencia } from '../dominio/parserResposta';
import { Selo } from './Selo';

function Rotulo({ children }: { children: string }) {
  return <div className="mb-1 font-mono text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">{children}</div>;
}

export function BlocoResposta({ resposta }: { resposta: Resposta }) {
  if (resposta.formato === 'invalido') {
    return (
      <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        A resposta veio em formato inesperado. Tente novamente.
        {resposta.bruto && (
          <details className="mt-2">
            <summary className="cursor-pointer">Ver texto recebido</summary>
            <pre className="mt-2 whitespace-pre-wrap font-serif text-slate-800 dark:text-stone-200">{resposta.bruto}</pre>
          </details>
        )}
      </div>
    );
  }

  if (resposta.formato === 'sem_norma') {
    return (
      <div className="rounded border border-stone-300 bg-stone-50 p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-200">
        {resposta.frase}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resposta.sintese && (
        <div className="rounded border-l-4 border-amber-700 bg-white p-4 dark:bg-slate-900">
          <Rotulo>Síntese</Rotulo>
          <p className="whitespace-pre-wrap leading-relaxed">{resposta.sintese}</p>
        </div>
      )}
      {resposta.normas.map((n, i) => (
        <div key={i} className="rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="font-mono text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">{n.fonte || 'Fonte não identificada'}</div>
            {n.vigencia && <Selo tom={tomVigencia(n.vigencia)}>{n.vigencia}</Selo>}
          </div>
          <pre className="whitespace-pre-wrap font-serif text-base leading-relaxed text-slate-900 dark:text-stone-100">{n.texto}</pre>
        </div>
      ))}
      {resposta.observacao && (
        <div className="rounded border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <Rotulo>Observação interpretativa (não normativa)</Rotulo>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{resposta.observacao}</p>
        </div>
      )}
      {resposta.opiniao && (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <Rotulo>Opinião (posição pessoal, não normativa)</Rotulo>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{resposta.opiniao}</p>
        </div>
      )}
    </div>
  );
}
