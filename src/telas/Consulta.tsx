import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon, ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, ClockIcon, ExclamationCircleIcon,
  KeyIcon, MagnifyingGlassIcon, ShareIcon, SparklesIcon, StopIcon,
} from '@heroicons/react/24/outline';
import { Share } from '@capacitor/share';
import type { ItemHistorico, ModeloId, Norma, Resposta, TurnoConversa, UsoTokens } from '../dominio/tipos';
import { parseResposta } from '../dominio/parserResposta';
import { buscarNoAcervo, type ResultadoBusca } from '../dominio/buscaLocal';
import { formatarRespostaTexto } from '../dominio/formatarResposta';
import { consultar, ErroConsulta, ERRO_SEM_CHAVE } from '../servicos/anthropic';
import { NATIVO } from '../servicos/plataforma';
import { AreaTexto, Aviso, Botao, Rotulo } from '../componentes/basicos';
import { BlocoResposta } from '../componentes/BlocoResposta';
import { ResultadoBuscaLocal } from '../componentes/ResultadoBuscaLocal';

interface Props {
  normas: Norma[];
  modelo: ModeloId;
  temChave: boolean;
  historico: ItemHistorico[];
  aoRegistrar: (item: ItemHistorico) => void;
  aoRegistrarUso: (uso: UsoTokens) => void;
  irParaAjustes: () => void;
  aoVisualizar: (n: Norma, foco?: string) => void;
}

const LINKS = [
  { rotulo: 'Lei Orgânica e Regimento Interno', url: 'https://www.tce.ba.gov.br/legislacao/legislacao-e-regimento-interno-do-tce-ba' },
  { rotulo: 'Resoluções Normativas', url: 'https://www.tce.ba.gov.br/legislacao/resolucoes-normativas' },
];

// Atalhos de perguntas frequentes, para reduzir digitação nos temas mais consultados.
const ATALHOS = [
  { rotulo: 'Diárias', pergunta: 'Qual o valor e as condições para pagamento de diárias em viagem a serviço do TCE/BA?' },
  { rotulo: 'Licitação', pergunta: 'Quais as hipóteses de dispensa e inexigibilidade de licitação aplicáveis ao TCE/BA?' },
  { rotulo: 'Prazo recursal', pergunta: 'Qual o prazo para interposição de recurso contra decisão do TCE/BA?' },
  { rotulo: 'Afastamento', pergunta: 'Quais as regras para afastamento de servidor do TCE/BA de suas funções?' },
];

const MAX_TURNOS_SESSAO = 12;

interface ErroExibido { mensagem: string; detalhes?: string }

export function Consulta({ normas, modelo, temChave, historico, aoRegistrar, aoRegistrarUso, irParaAjustes, aoVisualizar }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [busca, setBusca] = useState<ResultadoBusca | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<ErroExibido | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [sessao, setSessao] = useState<TurnoConversa[]>([]);
  const [perguntaResposta, setPerguntaResposta] = useState('');
  const [copiado, setCopiado] = useState(false);
  const abortar = useRef<AbortController | null>(null);
  const topo = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortar.current?.abort(), []);

  const limpar = useCallback(() => {
    setErro(null);
    setAvisos([]);
    setResposta(null);
    setParcial('');
    setBusca(null);
  }, []);

  const novaConsulta = useCallback(() => {
    limpar();
    setSessao([]);
    setPergunta('');
    setCopiado(false);
  }, [limpar]);

  const buscarLocal = useCallback((texto: string): boolean => {
    const p = texto.trim();
    if (!p) return false;
    limpar();
    if (normas.length === 0) {
      setErro({ mensagem: 'O acervo está vazio. Cadastre ao menos uma norma na aba Acervo antes de consultar.' });
      return false;
    }
    setBusca(buscarNoAcervo(normas, p));
    return true;
  }, [normas, limpar]);

  // Toda busca entra no histórico, mesmo sem IA; a resposta da IA complementa depois.
  const buscarERegistrar = useCallback((texto: string) => {
    if (!buscarLocal(texto)) return;
    aoRegistrar({ pergunta: texto.trim(), resposta: '', modelo: '', quando: new Date().toISOString() });
  }, [buscarLocal, aoRegistrar]);

  const consultarIA = useCallback(async (texto: string) => {
    const p = texto.trim();
    if (!p || carregando) return;
    if (!buscarLocal(p)) return;
    setCarregando(true);
    abortar.current = new AbortController();
    try {
      const r = await consultar(normas, p, modelo, setParcial, abortar.current.signal, sessao);
      const novos: string[] = [];
      if (r.preSelecionado) novos.push(`Por volume, foram enviadas à IA ${r.enviadas} de ${r.total} normas, as mais relacionadas à pergunta. Se a resposta parecer incompleta, refine a pergunta.`);
      if (r.interrompida) novos.push('A resposta foi interrompida por tamanho; refine a pergunta.');
      setAvisos(novos);
      if (r.recusada && !r.texto) {
        setErro({ mensagem: 'O modelo recusou processar esta consulta.' });
      } else {
        setResposta(parseResposta(r.texto));
        setPerguntaResposta(p);
        aoRegistrar({ pergunta: p, resposta: r.texto, modelo, quando: new Date().toISOString() });
        setSessao((s) => [...s, { pergunta: p, resposta: r.texto }].slice(-MAX_TURNOS_SESSAO));
      }
      aoRegistrarUso({ quando: new Date().toISOString(), modelo, entrada: r.entrada, saida: r.saida, cacheLeitura: r.cacheLeitura, cacheEscrita: r.cacheEscrita });
    } catch (e) {
      if (e instanceof ErroConsulta) setErro({ mensagem: e.codigo === ERRO_SEM_CHAVE ? ERRO_SEM_CHAVE : e.message, detalhes: e.detalhes });
      else setErro({ mensagem: 'Não foi possível concluir a consulta agora.', detalhes: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    } finally {
      setCarregando(false);
      setParcial('');
      abortar.current = null;
    }
  }, [normas, modelo, carregando, aoRegistrar, aoRegistrarUso, buscarLocal, sessao]);

  function cancelar() {
    abortar.current?.abort();
  }

  function reabrir(item: ItemHistorico) {
    setPergunta(item.pergunta);
    buscarLocal(item.pergunta);
    setSessao([]);
    if (item.resposta) { setResposta(parseResposta(item.resposta)); setPerguntaResposta(item.pergunta); }
    topo.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function usarAtalho(p: string) {
    setPergunta(p);
    buscarERegistrar(p);
  }

  async function copiarResposta() {
    if (!resposta) return;
    try {
      await navigator.clipboard.writeText(formatarRespostaTexto(perguntaResposta, resposta));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro({ mensagem: 'Não foi possível copiar a resposta neste navegador.' });
    }
  }

  async function compartilharResposta() {
    if (!resposta) return;
    const texto = formatarRespostaTexto(perguntaResposta, resposta);
    if (NATIVO) {
      try { await Share.share({ title: 'Consulta às Normas do TCE/BA', text: texto }); } catch { /* usuário cancelou o compartilhamento */ }
      return;
    }
    if (navigator.share) {
      try { await navigator.share({ title: 'Consulta às Normas do TCE/BA', text: texto }); } catch { /* usuário cancelou o compartilhamento */ }
      return;
    }
    await copiarResposta();
  }

  const podePerguntar = pergunta.trim().length > 0 && !carregando;

  return (
    <div ref={topo} className="space-y-5">
      <header className="text-center">
        <img src="./logo-titulo.png" alt="Consulta às Normas do TCE/BA" className="mx-auto max-h-24 w-auto" />
        <p className="mx-auto mt-3 max-w-prose text-sm text-slate-600 dark:text-slate-400">
          A busca localiza no acervo os dispositivos relacionados à pergunta. A consulta por IA acrescenta uma resposta objetiva, fundamentada exclusivamente nesses textos, com transcrição literal ou declaração de ausência de regulamentação.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono uppercase tracking-wide text-slate-500">Atalhos:</span>
        {ATALHOS.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            onClick={() => usarAtalho(a.pergunta)}
            className="rounded-full border border-stone-300 px-3 py-1 text-slate-700 hover:border-amber-700 hover:text-amber-700 dark:border-slate-700 dark:text-stone-300 dark:hover:border-amber-400 dark:hover:text-amber-400"
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="rounded border border-stone-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <Rotulo htmlFor="pergunta">Pergunta</Rotulo>
        <AreaTexto
          id="pergunta"
          rows={4}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex.: qual o prazo para interposição de recurso ao TCE/BA?"
        />
        {sessao.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            Contexto ativo: {sessao.length} pergunta{sessao.length === 1 ? '' : 's'} anterior{sessao.length === 1 ? '' : 'es'} nesta sessão.
            <button type="button" onClick={novaConsulta} className="inline-flex items-center gap-1 font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
              <ArrowPathIcon className="h-3.5 w-3.5" /> Nova consulta (limpar contexto)
            </button>
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">{normas.length} norma{normas.length === 1 ? '' : 's'} no acervo</span>
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundario" onClick={() => buscarERegistrar(pergunta)} disabled={!podePerguntar}>
              <MagnifyingGlassIcon className="h-5 w-5" /> Buscar no acervo
            </Botao>
            {carregando ? (
              <Botao variante="perigo" onClick={cancelar}><StopIcon className="h-5 w-5" /> Cancelar</Botao>
            ) : (
              <Botao onClick={() => consultarIA(pergunta)} disabled={!podePerguntar || !temChave} title={temChave ? undefined : 'Configure a chave da API em Ajustes'}>
                <SparklesIcon className="h-5 w-5" /> Buscar e consultar IA
              </Botao>
            )}
          </div>
        </div>
        {!temChave && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <KeyIcon className="h-4 w-4" /> Sem chave da API, só a busca no acervo está disponível.
            <button type="button" onClick={irParaAjustes} className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">Configurar em Ajustes</button>
          </p>
        )}
      </div>

      {busca && <ResultadoBuscaLocal resultado={busca} aoVisualizar={aoVisualizar} />}

      {(carregando || resposta || erro || avisos.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            <h2 className="font-mono text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Resposta objetiva (gerada por IA a partir do acervo)</h2>
            {resposta && !carregando && (
              <div className="ml-auto flex gap-1">
                <Botao pequeno variante="fantasma" onClick={copiarResposta} aria-label="Copiar resposta" title="Copiar resposta">
                  <ClipboardDocumentIcon className="h-5 w-5" /> {copiado ? 'Copiado' : 'Copiar'}
                </Botao>
                <Botao pequeno variante="fantasma" onClick={compartilharResposta} aria-label="Compartilhar resposta" title="Compartilhar resposta">
                  <ShareIcon className="h-5 w-5" /> Compartilhar
                </Botao>
              </div>
            )}
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

          {erro?.mensagem === ERRO_SEM_CHAVE ? (
            <Aviso tom="atencao" icone={<KeyIcon className="h-5 w-5" />}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Configure sua chave da API em Ajustes para consultar a IA.</span>
                <Botao pequeno variante="secundario" onClick={irParaAjustes}>Abrir Ajustes</Botao>
              </div>
            </Aviso>
          ) : erro ? (
            <Aviso tom="erro" icone={<ExclamationCircleIcon className="h-5 w-5" />}>
              <div>{erro.mensagem}</div>
              {erro.detalhes && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs">Detalhes técnicos</summary>
                  <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs">{erro.detalhes}</pre>
                </details>
              )}
            </Aviso>
          ) : null}

          {avisos.map((a) => <Aviso key={a} tom="atencao">{a}</Aviso>)}

          {resposta && !carregando && <BlocoResposta resposta={resposta} normas={normas} aoAbrirNorma={aoVisualizar} />}
        </section>
      )}

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
                <p className="mt-0.5 font-mono text-xs text-slate-500">{new Date(h.quando).toLocaleString('pt-BR')}{h.resposta ? ' · com resposta da IA' : ' · busca no acervo'}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Botao pequeno variante="fantasma" onClick={() => reabrir(h)}>Ver</Botao>
                <Botao pequeno variante="fantasma" onClick={() => { setPergunta(h.pergunta); consultarIA(h.pergunta); }} disabled={carregando || !temChave}>Refazer</Botao>
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
