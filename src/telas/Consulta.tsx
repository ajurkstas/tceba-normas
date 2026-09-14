import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowTopRightOnSquareIcon, ClockIcon, ExclamationCircleIcon, KeyIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import type { ItemHistorico, ModeloId, Norma, Resposta } from '../dominio/tipos';
import { parseResposta } from '../dominio/parserResposta';
import { consultar, ErroConsulta, ERRO_SEM_CHAVE } from '../servicos/anthropic';
import { AreaTexto, Aviso, Botao, Rotulo } from '../componentes/basicos';
import { BlocoResposta } from '../componentes/BlocoResposta';

interface Props {
  normas: Norma[];
  modelo: ModeloId;
  temChave: boolean;
  historico: ItemHistorico[];
  aoRegistrar: (item: ItemHistorico) => void;
  irParaAjustes: () => void;
}

const LINKS = [
  { rotulo: 'Lei Orgânica e Regimento Interno', url: 'https://www.tce.ba.gov.br/legislacao/legislacao-e-regimento-interno-do-tce-ba' },
  { rotulo: 'Resoluções Normativas', url: 'https://www.tce.ba.gov.br/legislacao/resolucoes-normativas' },
];

export function Consulta({ normas, modelo, temChave, historico, aoRegistrar, irParaAjustes }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const abortar = useRef<AbortController | null>(null);
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortar.current?.abort(), []);

  const executar = useCallback(async (texto: string) => {
    const p = texto.trim();
    if (!p || carregando) return;
    setErro(null);
    setAvisos([]);
    setResposta(null);
    setParcial('');
    if (normas.length === 0) {
      setErro('O acervo está vazio. Cadastre ao menos uma norma na aba Acervo antes de consultar.');
      return;
    }
    setCarregando(true);
    abortar.current = new AbortController();
    try {
      const r = await consultar(normas, p, modelo, setParcial, abortar.current.signal);
      const novos: string[] = [];
      if (r.preSelecionado) novos.push(`Por volume, foram enviadas ${r.enviadas} de ${r.total} normas, as mais relacionadas à pergunta. Se a resposta parecer incompleta, refine a pergunta.`);
      if (r.interrompida) novos.push('A resposta foi interrompida por tamanho; refine a pergunta.');
      setAvisos(novos);
      if (r.recusada && !r.texto) {
        setErro('O modelo recusou processar esta consulta.');
      } else {
        setResposta(parseResposta(r.texto));
        aoRegistrar({ pergunta: p, resposta: r.texto, modelo, quando: new Date().toISOString() });
      }
    } catch (e) {
      if (e instanceof ErroConsulta && e.codigo === ERRO_SEM_CHAVE) setErro(ERRO_SEM_CHAVE);
      else setErro(e instanceof Error ? e.message : 'Não foi possível concluir a consulta agora.');
    } finally {
      setCarregando(false);
      setParcial('');
    }
  }, [normas, modelo, carregando, aoRegistrar]);

  function reabrir(item: ItemHistorico) {
    setPergunta(item.pergunta);
    setErro(null);
    setAvisos([]);
    setResposta(parseResposta(item.resposta));
    topo.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div ref={topo} className="space-y-5">
      <header className="text-center">
        <img src="./logo-titulo.png" alt="Consulta às Normas do TCE/BA" className="mx-auto max-h-24 w-auto" />
        <p className="mx-auto mt-3 max-w-prose text-sm text-slate-600 dark:text-slate-400">
          As respostas são fundamentadas exclusivamente nas normas do acervo carregado neste aplicativo, com transcrição literal do dispositivo aplicável ou declaração expressa de ausência de regulamentação.
        </p>
      </header>

      {!temChave && (
        <Aviso tom="atencao" icone={<KeyIcon className="h-5 w-5" />}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Configure sua chave da API em Ajustes para consultar.</span>
            <Botao pequeno variante="secundario" onClick={irParaAjustes}>Abrir Ajustes</Botao>
          </div>
        </Aviso>
      )}

      <div className="rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <Rotulo htmlFor="pergunta">Pergunta</Rotulo>
        <AreaTexto
          id="pergunta"
          rows={4}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex.: qual o prazo para interposição de recurso ao TCE/BA?"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{normas.length} norma{normas.length === 1 ? '' : 's'} no acervo</span>
          <Botao onClick={() => executar(pergunta)} disabled={carregando || !pergunta.trim()}>
            <PaperAirplaneIcon className="h-5 w-5" />
            {carregando ? 'Consultando' : 'Consultar'}
          </Botao>
        </div>
      </div>

      {carregando && (
        <div className="rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-700" />
            Percorrendo o acervo carregado
          </div>
          {parcial && <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700 dark:text-stone-300">{parcial}</pre>}
        </div>
      )}

      {erro === ERRO_SEM_CHAVE ? (
        <Aviso tom="atencao" icone={<KeyIcon className="h-5 w-5" />}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Configure sua chave da API em Ajustes para consultar.</span>
            <Botao pequeno variante="secundario" onClick={irParaAjustes}>Abrir Ajustes</Botao>
          </div>
        </Aviso>
      ) : erro ? (
        <Aviso tom="erro" icone={<ExclamationCircleIcon className="h-5 w-5" />}>{erro}</Aviso>
      ) : null}

      {avisos.map((a) => <Aviso key={a} tom="atencao">{a}</Aviso>)}

      {resposta && !carregando && <BlocoResposta resposta={resposta} />}

      <details className="rounded border border-stone-300 bg-white dark:border-slate-700 dark:bg-slate-900">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
          <ClockIcon className="h-5 w-5 text-slate-500" /> Consultas recentes
        </summary>
        <div className="divide-y divide-stone-200 border-t border-stone-300 dark:divide-slate-800 dark:border-slate-700">
          {historico.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Nenhuma consulta ainda.</p>}
          {historico.slice(0, 15).map((h, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{h.pergunta}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{new Date(h.quando).toLocaleString('pt-BR')}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Botao pequeno variante="fantasma" onClick={() => reabrir(h)}>Ver</Botao>
                <Botao pequeno variante="fantasma" onClick={() => { setPergunta(h.pergunta); executar(h.pergunta); }} disabled={carregando}>Refazer</Botao>
              </div>
            </div>
          ))}
        </div>
      </details>

      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        {LINKS.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
            {l.rotulo} <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        ))}
      </nav>

      <footer className="text-center text-xs text-slate-500">
        Esta ferramenta não é um sistema oficial do TCE/BA. Sistema desenvolvido por André Barreto Jurkstas, Assessor Técnico-Jurídico do Gabinete Conselheira Carolina Matos.
      </footer>
    </div>
  );
}
