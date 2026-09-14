import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, ArrowUpTrayIcon, ClipboardDocumentListIcon,
  DocumentArrowUpIcon, DocumentTextIcon, PencilSquareIcon, PlusIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { PencilIcon } from '@heroicons/react/20/solid';
import type { Norma, Situacao, TipoAto } from '../dominio/tipos';
import { TIPOS_ATO } from '../dominio/tipos';
import { codigoNorma, gerarId, normalizarTipo, ordenarNormas } from '../dominio/hierarquia';
import { exportarJSON, importarJSON, mesclar } from '../servicos/acervo';
import { AreaTexto, Aviso, Botao, Campo, Rotulo, Selecao } from '../componentes/basicos';
import { Modal } from '../componentes/Modal';
import { SeloSituacao } from '../componentes/Selo';

interface Props {
  normas: Norma[];
  rascunhoLocal: boolean;
  aoSalvar: (normas: Norma[]) => Promise<void>;
  aoVisualizar: (norma: Norma) => void;
  editarInicial?: Norma | null;
  aoConsumirEditarInicial?: () => void;
}

const VAZIA: Norma = { id: '', tipo: 'Resolução Normativa', numero: '', data: '', status: 'vigente', ementa: '', obs: '', link: '', texto: '' };

export function Acervo({ normas, rascunhoLocal, aoSalvar, aoVisualizar, editarInicial, aoConsumirEditarInicial }: Props) {
  const [filtro, setFiltro] = useState('');
  const [editando, setEditando] = useState<Norma | null>(null);
  const [lote, setLote] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tom: 'erro' | 'sucesso' | 'atencao'; texto: string } | null>(null);
  const [lendoPdf, setLendoPdf] = useState(false);
  const inputImport = useRef<HTMLInputElement>(null);
  const inputPdf = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editarInicial) { setEditando({ ...editarInicial }); aoConsumirEditarInicial?.(); }
  }, [editarInicial, aoConsumirEditarInicial]);

  const lista = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    const base = ordenarNormas(normas);
    if (!t) return base;
    return base.filter((n) => (n.tipo + ' ' + n.numero + ' ' + n.ementa + ' ' + n.texto).toLowerCase().includes(t));
  }, [normas, filtro]);

  const grupos = useMemo(() => {
    const m = new Map<TipoAto, Norma[]>();
    for (const n of lista) m.set(n.tipo, [...(m.get(n.tipo) ?? []), n]);
    return Array.from(m.entries());
  }, [lista]);

  async function salvarNorma() {
    if (!editando) return;
    const registro: Norma = {
      ...editando,
      id: editando.id || gerarId(),
      numero: editando.numero.trim(), data: editando.data.trim(), ementa: editando.ementa.trim(),
      obs: editando.obs.trim(), link: editando.link.trim(), texto: editando.texto.trim(),
    };
    if (!registro.texto) { setMensagem({ tom: 'erro', texto: 'Informe o texto integral do dispositivo antes de salvar.' }); return; }
    const idx = normas.findIndex((n) => n.id === registro.id);
    const novas = idx >= 0 ? normas.map((n) => (n.id === registro.id ? registro : n)) : [...normas, registro];
    await aoSalvar(novas);
    setEditando(null);
    setMensagem({ tom: 'sucesso', texto: 'Norma salva no acervo local.' });
  }

  async function excluir() {
    if (!editando?.id) return;
    if (!window.confirm('Excluir esta norma do acervo?')) return;
    await aoSalvar(normas.filter((n) => n.id !== editando.id));
    setEditando(null);
  }

  async function lerPdf(ev: ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = '';
    if (!arquivo || !editando) return;
    setLendoPdf(true);
    try {
      const { extrairTextoPdf } = await import('../servicos/pdf');
      const texto = await extrairTextoPdf(arquivo);
      setEditando({ ...editando, texto });
      setMensagem({ tom: 'atencao', texto: 'Texto extraído do PDF. Revise com atenção antes de salvar: a extração pode trazer cabeçalhos, rodapés ou numeração de página misturados ao texto.' });
    } catch {
      setMensagem({ tom: 'erro', texto: 'Não foi possível extrair texto deste PDF. Pode ser um documento escaneado; nesse caso, cole o texto manualmente.' });
    } finally {
      setLendoPdf(false);
    }
  }

  async function importar(ev: ChangeEvent<HTMLInputElement>) {
    const arquivo = ev.target.files?.[0];
    ev.target.value = '';
    if (!arquivo) return;
    try {
      const novas = importarJSON(await arquivo.text());
      const substituir = window.confirm(`${novas.length} norma(s) no arquivo. OK para substituir o acervo atual; Cancelar para mesclar com o acervo atual.`);
      await aoSalvar(substituir ? ordenarNormas(novas) : mesclar(normas, novas));
      setMensagem({ tom: 'sucesso', texto: `${novas.length} norma(s) importada(s).` });
    } catch {
      setMensagem({ tom: 'erro', texto: 'Não foi possível ler o arquivo. Verifique se é um JSON exportado por este aplicativo.' });
    }
  }

  async function exportar() {
    try { await exportarJSON(normas); }
    catch { setMensagem({ tom: 'erro', texto: 'Não foi possível exportar o acervo.' }); }
  }

  async function processarLote() {
    const blocos = (lote ?? '').split(/^[ \t]*={3,}[ \t]*$/m).map((b) => b.trim()).filter(Boolean);
    if (blocos.length === 0) { setMensagem({ tom: 'erro', texto: 'Nenhum bloco encontrado.' }); return; }
    const novas: Norma[] = [];
    for (const bloco of blocos) {
      const campo = (nome: string) => bloco.match(new RegExp('^' + nome + ':\\s*(.*)$', 'im'))?.[1].trim() ?? '';
      const mTexto = bloco.match(/^Texto:\s*([\s\S]*)$/im);
      const texto = mTexto ? mTexto[1].trim() : '';
      if (!texto) continue;
      novas.push({
        id: gerarId(), tipo: normalizarTipo(campo('Tipo')), numero: campo('Número') || campo('Numero'), data: campo('Data'),
        status: 'vigente', ementa: campo('Ementa'), obs: '', link: campo('Link'), texto,
      });
    }
    if (novas.length === 0) { setMensagem({ tom: 'erro', texto: 'Nenhum bloco continha um campo "Texto:" reconhecível.' }); return; }
    await aoSalvar([...normas, ...novas]);
    setLote(null);
    setMensagem({ tom: 'sucesso', texto: `${novas.length} norma(s) adicionada(s) ao acervo.` });
  }

  const blocosLote = (lote ?? '').split(/^[ \t]*={3,}[ \t]*$/m).map((b) => b.trim()).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Botao onClick={() => setEditando({ ...VAZIA })}><PlusIcon className="h-5 w-5" /> Nova norma</Botao>
        <Botao variante="secundario" onClick={() => setLote('')}><ClipboardDocumentListIcon className="h-5 w-5" /> Colagem em lote</Botao>
        <Botao variante="secundario" onClick={() => inputImport.current?.click()}><ArrowUpTrayIcon className="h-5 w-5" /> Importar JSON</Botao>
        <Botao variante="secundario" onClick={exportar}><ArrowDownTrayIcon className="h-5 w-5" /> Exportar JSON</Botao>
        <input ref={inputImport} type="file" accept="application/json" className="hidden" onChange={importar} />
      </div>

      {rascunhoLocal && (
        <Aviso tom="atencao" icone={<PencilIcon className="h-5 w-5" />}>
          <b>Rascunho local.</b> Estas alterações estão salvas apenas neste aparelho. Exporte o JSON e peça a publicação para atualizar o acervo para todos.
        </Aviso>
      )}
      {mensagem && <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>}

      <Campo type="search" placeholder="Filtrar por tipo, número, ementa ou palavra do texto" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      <p className="font-mono text-xs uppercase tracking-wide text-slate-500">{normas.length} norma{normas.length === 1 ? '' : 's'} no acervo</p>

      {lista.length === 0 && (
        <p className="rounded border border-dashed border-stone-300 p-6 text-center text-sm text-slate-500">
          {normas.length === 0 ? 'Nenhuma norma carregada ainda. Use "Nova norma" ou "Colagem em lote" para iniciar o acervo.' : 'Nenhuma norma corresponde ao filtro.'}
        </p>
      )}

      {grupos.map(([tipo, itens]) => (
        <section key={tipo}>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-slate-500">{tipo}</h3>
          <div className="space-y-2">
            {itens.map((n) => (
              <article
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => aoVisualizar(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoVisualizar(n); } }}
                className="cursor-pointer rounded border border-stone-300 bg-white p-3 transition hover:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-amber-700 dark:text-amber-400">{codigoNorma(n)}</span>
                  <SeloSituacao status={n.status} />
                </div>
                <h4 className="mt-1 font-medium leading-snug">{n.ementa || n.tipo}</h4>
                <p className="mt-0.5 text-xs text-slate-500">{n.data || 'sem data'}{n.obs ? ` · ${n.obs}` : ''}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{n.texto.replace(/\s+/g, ' ').slice(0, 200)}</p>
                <div className="mt-2 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500"><DocumentTextIcon className="h-4 w-4" /> Toque para ler na íntegra</span>
                  <div className="flex gap-1">
                  <Botao pequeno variante="fantasma" onClick={() => setEditando({ ...n })}><PencilSquareIcon className="h-5 w-5" /> Editar</Botao>
                  {n.link && (
                    <a href={n.link} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-2 rounded px-3 text-sm font-medium text-slate-700 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-slate-800">
                      <ArrowTopRightOnSquareIcon className="h-5 w-5" /> Fonte
                    </a>
                  )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <Modal
        titulo={editando?.id ? 'Editar norma' : 'Nova norma'}
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        rodape={
          <div className="flex items-center justify-between gap-2">
            {editando?.id ? <Botao variante="perigo" onClick={excluir}><TrashIcon className="h-5 w-5" /> Excluir</Botao> : <span />}
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>
              <Botao onClick={salvarNorma}>Salvar</Botao>
            </div>
          </div>
        }
      >
        {editando && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="f-tipo">Tipo de ato</Rotulo>
                <Selecao id="f-tipo" value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value as TipoAto })}>
                  {TIPOS_ATO.map((t) => <option key={t}>{t}</option>)}
                </Selecao>
              </div>
              <div>
                <Rotulo htmlFor="f-numero">Número</Rotulo>
                <Campo id="f-numero" placeholder="097/2023" value={editando.numero} onChange={(e) => setEditando({ ...editando, numero: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-data">Data de aprovação</Rotulo>
                <Campo id="f-data" placeholder="12/04/2023" value={editando.data} onChange={(e) => setEditando({ ...editando, data: e.target.value })} />
              </div>
              <div>
                <Rotulo htmlFor="f-status">Situação</Rotulo>
                <Selecao id="f-status" value={editando.status} onChange={(e) => setEditando({ ...editando, status: e.target.value as Situacao })}>
                  <option value="vigente">Vigente</option>
                  <option value="vigente_alteracoes">Vigente com alterações</option>
                  <option value="revogada">Revogada</option>
                </Selecao>
              </div>
            </div>
            <div>
              <Rotulo htmlFor="f-ementa">Ementa ou título</Rotulo>
              <Campo id="f-ementa" placeholder="Dispõe sobre ..." value={editando.ementa} onChange={(e) => setEditando({ ...editando, ementa: e.target.value })} />
            </div>
            <div>
              <Rotulo htmlFor="f-obs">Se revogada ou alterada, por qual norma (opcional)</Rotulo>
              <Campo id="f-obs" placeholder="Revogada pela Resolução Normativa nº 144/2024" value={editando.obs} onChange={(e) => setEditando({ ...editando, obs: e.target.value })} />
            </div>
            <div>
              <Rotulo htmlFor="f-link">Link da norma no site oficial (opcional)</Rotulo>
              <Campo id="f-link" type="url" placeholder="https://www.tce.ba.gov.br/..." value={editando.link} onChange={(e) => setEditando({ ...editando, link: e.target.value })} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Rotulo htmlFor="f-texto">Texto integral (transcrição literal)</Rotulo>
                <Botao pequeno variante="secundario" onClick={() => inputPdf.current?.click()} disabled={lendoPdf}>
                  <DocumentArrowUpIcon className="h-5 w-5" /> {lendoPdf ? 'Lendo PDF' : 'Carregar PDF'}
                </Botao>
                <input ref={inputPdf} type="file" accept="application/pdf" className="hidden" onChange={lerPdf} />
              </div>
              <AreaTexto id="f-texto" rows={12} className="font-serif" placeholder="Cole aqui o texto integral do ato, ou use Carregar PDF e revise o resultado" value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        titulo="Colagem em lote"
        aberto={lote !== null}
        aoFechar={() => setLote(null)}
        rodape={
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-500">{blocosLote} bloco(s) reconhecido(s)</span>
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={() => setLote(null)}>Cancelar</Botao>
              <Botao onClick={processarLote}>Adicionar ao acervo</Botao>
            </div>
          </div>
        }
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Cole várias normas de uma vez, separadas por uma linha com <code>===</code>. Cada bloco reconhece os campos <b>Tipo</b>, <b>Número</b>, <b>Data</b>, <b>Ementa</b>, <b>Link</b> (opcional) e <b>Texto</b> (sempre o último campo; pode ocupar várias linhas).
        </p>
        <AreaTexto
          rows={14}
          value={lote ?? ''}
          onChange={(e) => setLote(e.target.value)}
          placeholder={'Tipo: Resolução Normativa\nNúmero: 097/2023\nData: 12/04/2023\nEmenta: Dispõe sobre ...\nLink: https://www.tce.ba.gov.br/...\nTexto:\nArt. 1º ...\n\n===\n\nTipo: Instrução Normativa\nNúmero: 03/2024\n...'}
        />
      </Modal>
    </div>
  );
}
