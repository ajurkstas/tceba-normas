import { useState, type ReactNode } from 'react';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { Norma } from '../dominio/tipos';
import type { ResultadoBusca, Trecho } from '../dominio/buscaLocal';
import { codigoNorma } from '../dominio/hierarquia';
import { SeloSituacao } from './Selo';
import { Botao } from './basicos';

const LIMITE_RESUMO = 700;

// Realça os radicais encontrados no texto, sem interpretar HTML.
function realcar(texto: string, termos: string[]): ReactNode {
  if (termos.length === 0) return texto;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${termos.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(\\p{L}*)`, 'giu');
  const partes: ReactNode[] = [];
  let ultimo = 0;
  const normalizado = texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Trabalha sobre o texto sem acentos para casar os radicais, mas exibe o original.
  // Como a remoção de acentos preserva o tamanho (só remove diacríticos combinantes), os índices podem divergir;
  // por isso reconstruímos o mapa de posições.
  const mapa: number[] = [];
  for (let i = 0, j = 0; i < texto.length; i++) {
    const c = texto[i].normalize('NFD');
    for (let k = 0; k < c.length; k++) { if (!/[̀-ͯ]/.test(c[k])) mapa[j++] = i; }
  }
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(normalizado)) !== null) {
    const ini = mapa[m.index + m[1].length] ?? 0;
    const fim = (mapa[m.index + m[0].length - 1] ?? texto.length - 1) + 1;
    if (ini > ultimo) partes.push(texto.slice(ultimo, ini));
    partes.push(<mark key={n++} className="rounded bg-amber-100 px-0.5 text-inherit dark:bg-amber-900/60">{texto.slice(ini, fim)}</mark>);
    ultimo = fim;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

function TrechoItem({ trecho, termos }: { trecho: Trecho; termos: string[] }) {
  const [expandido, setExpandido] = useState(false);
  const longo = trecho.texto.length > LIMITE_RESUMO;
  const texto = expandido || !longo ? trecho.texto : trecho.texto.slice(0, LIMITE_RESUMO) + '...';
  return (
    <div className="border-t border-stone-200 py-3 first:border-t-0 dark:border-slate-800">
      <pre className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-slate-900 dark:text-stone-100">{realcar(texto, termos)}</pre>
      {longo && (
        <button type="button" onClick={() => setExpandido((v) => !v)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          {expandido ? <><ChevronUpIcon className="h-4 w-4" /> Ver menos</> : <><ChevronDownIcon className="h-4 w-4" /> Ver o dispositivo completo</>}
        </button>
      )}
    </div>
  );
}

export function ResultadoBuscaLocal({ resultado, aoVisualizar }: { resultado: ResultadoBusca; aoVisualizar: (n: Norma) => void }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpenIcon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
        <h2 className="font-mono text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Normas relacionadas no acervo (busca sem IA)</h2>
      </div>
      {resultado.termos.length > 0 && (
        <p className="text-xs text-slate-500">
          Termos buscados: {resultado.termos.map((t) => <code key={t} className="mr-1 rounded bg-stone-200 px-1 dark:bg-slate-800">{t}</code>)}
          {resultado.totalTrechos > 0 && <> · {resultado.grupos.reduce((s, g) => s + g.trechos.length, 0)} de {resultado.totalTrechos} dispositivo(s) encontrado(s)</>}
        </p>
      )}
      {resultado.grupos.length === 0 && (
        <p className="rounded border border-stone-300 bg-stone-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-stone-300">
          {resultado.termos.length === 0
            ? 'A pergunta não contém termos suficientes para a busca. Use palavras específicas do tema.'
            : 'Nenhum dispositivo do acervo contém os termos da pergunta.'}
        </p>
      )}
      {resultado.grupos.map(({ norma, trechos }) => (
        <div key={norma.id} className="rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">{codigoNorma(norma)} · {norma.data || 'sem data'}</div>
              <div className="text-sm font-medium leading-snug">{norma.tipo}{norma.numero ? ` nº ${norma.numero}` : ''}</div>
              {norma.ementa && <div className="text-xs text-slate-600 dark:text-slate-400">{norma.ementa}</div>}
              {norma.obs && <div className="text-xs text-slate-500">{norma.obs}</div>}
            </div>
            <SeloSituacao status={norma.status} />
          </div>
          <div>
            {trechos.map((t, i) => <TrechoItem key={i} trecho={t} termos={resultado.termos} />)}
          </div>
          <div className="mt-2 flex justify-end">
            <Botao pequeno variante="fantasma" onClick={() => aoVisualizar(norma)}><DocumentTextIcon className="h-5 w-5" /> Ler a norma na íntegra</Botao>
          </div>
        </div>
      ))}
    </section>
  );
}
