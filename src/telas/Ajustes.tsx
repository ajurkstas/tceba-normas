import { useEffect, useState } from 'react';
import {
  ArrowPathIcon, ArrowTopRightOnSquareIcon, CheckIcon, EyeIcon, EyeSlashIcon, ExclamationCircleIcon,
  FingerPrintIcon, InformationCircleIcon, KeyIcon, LockClosedIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import type { Ajustes as TAjustes, ModeloId, Tema } from '../dominio/tipos';
import { MODELOS } from '../dominio/tipos';
import { chaveMascarada, gravarChave, lerChave, removerChave, validarFormato } from '../servicos/chaveApi';
import { autenticar, estadoAutenticacao, type EstadoAutenticacao } from '../servicos/autenticacao';
import { testarChave } from '../servicos/anthropic';
import { protegerTela } from '../servicos/telaPrivada';
import { NATIVO } from '../servicos/plataforma';
import { AreaTexto, Aviso, Botao, Cartao, Rotulo, Selecao, Titulo } from '../componentes/basicos';

interface Props {
  ajustes: TAjustes;
  aoMudarAjustes: (a: TAjustes) => void;
  temChave: boolean;
  aoMudarChave: (tem: boolean) => void;
  versao: string;
  aoRestaurarAcervo: () => Promise<void>;
  aoLimparHistorico: () => Promise<void>;
}

const SEGUNDOS_REVELADA = 30;

export function Ajustes({ ajustes, aoMudarAjustes, temChave, aoMudarChave, versao, aoRestaurarAcervo, aoLimparHistorico }: Props) {
  const [mascarada, setMascarada] = useState<string | null>(null);
  const [revelada, setRevelada] = useState<string | null>(null);
  const [editandoChave, setEditandoChave] = useState(!temChave);
  const [entrada, setEntrada] = useState('');
  const [mostrarEntrada, setMostrarEntrada] = useState(false);
  const [auth, setAuth] = useState<EstadoAutenticacao>({ disponivel: false, biometria: false });
  const [msg, setMsg] = useState<{ tom: 'erro' | 'sucesso' | 'atencao' | 'info'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    protegerTela(true);
    estadoAutenticacao().then(setAuth);
    return () => { protegerTela(false); };
  }, []);

  useEffect(() => {
    if (temChave) chaveMascarada().then(setMascarada);
    else setMascarada(null);
    setEditandoChave(!temChave);
  }, [temChave]);

  useEffect(() => {
    if (!revelada) return;
    const t = setTimeout(() => setRevelada(null), SEGUNDOS_REVELADA * 1000);
    return () => clearTimeout(t);
  }, [revelada]);

  async function salvar() {
    const erro = validarFormato(entrada);
    if (erro) { setMsg({ tom: 'erro', texto: erro }); return; }
    setOcupado(true);
    try {
      await gravarChave(entrada);
      setEntrada('');
      setMostrarEntrada(false);
      setEditandoChave(false);
      aoMudarChave(true);
      setMsg({ tom: 'sucesso', texto: NATIVO ? 'Chave guardada em armazenamento cifrado deste aparelho.' : 'Chave guardada nesta aba do navegador.' });
    } catch {
      setMsg({ tom: 'erro', texto: 'Não foi possível guardar a chave neste aparelho.' });
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    const candidata = editandoChave ? entrada.trim() : await lerChave();
    if (!candidata) { setMsg({ tom: 'erro', texto: 'Informe a chave antes de testar.' }); return; }
    const erro = validarFormato(candidata);
    if (erro) { setMsg({ tom: 'erro', texto: erro }); return; }
    setOcupado(true);
    setMsg({ tom: 'info', texto: 'Testando a chave junto à Anthropic.' });
    try {
      await testarChave(candidata);
      setMsg({ tom: 'sucesso', texto: 'Chave aceita pela Anthropic.' });
    } catch (e) {
      setMsg({ tom: 'erro', texto: e instanceof Error ? e.message : 'Falha ao testar a chave.' });
    } finally {
      setOcupado(false);
    }
  }

  async function exigirAutenticacao(motivo: string): Promise<boolean> {
    if (!auth.disponivel) return false;
    const r = await autenticar(motivo);
    if (r === 'ok') return true;
    if (r === 'cancelado') setMsg({ tom: 'info', texto: 'Autenticação cancelada.' });
    else if (r === 'indisponivel') setMsg({ tom: 'atencao', texto: 'Configure um bloqueio de tela para usar esta ação.' });
    else setMsg({ tom: 'erro', texto: 'Autenticação não reconhecida.' });
    return false;
  }

  async function revelar() {
    if (revelada) { setRevelada(null); return; }
    if (!(await exigirAutenticacao('Revelar a chave da API'))) return;
    setRevelada(await lerChave());
  }

  async function substituir() {
    if (auth.disponivel && !(await exigirAutenticacao('Substituir a chave da API'))) return;
    if (!window.confirm('Substituir a chave atual? A chave anterior será apagada ao salvar a nova.')) return;
    setRevelada(null);
    setEditandoChave(true);
  }

  async function remover() {
    if (auth.disponivel && !(await exigirAutenticacao('Remover a chave da API'))) return;
    if (!window.confirm('Remover a chave deste aparelho? Será preciso informá-la de novo para consultar.')) return;
    setOcupado(true);
    try {
      await removerChave();
      setRevelada(null);
      aoMudarChave(false);
      setMsg({ tom: 'sucesso', texto: 'Chave removida.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-5">
      <Cartao>
        <Titulo icone={<KeyIcon className="h-6 w-6 text-amber-700 dark:text-amber-400" />}>Chave da API da Anthropic</Titulo>

        {temChave && !editandoChave ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Estado:</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                <CheckIcon className="h-4 w-4" /> Configurada
              </span>
              <code className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">{revelada ?? mascarada ?? ''}</code>
              <LockClosedIcon className="h-4 w-4 text-slate-500" aria-label="Protegida" />
            </div>
            {revelada && <Aviso tom="atencao">Chave visível por {SEGUNDOS_REVELADA} segundos. Não compartilhe a tela.</Aviso>}
            <div className="flex flex-wrap gap-2">
              <Botao variante="secundario" pequeno onClick={revelar} disabled={!auth.disponivel || ocupado} title={auth.disponivel ? undefined : 'Configure um bloqueio de tela para poder revelar a chave.'}>
                {revelada ? <EyeSlashIcon className="h-5 w-5" /> : auth.biometria ? <FingerPrintIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                {revelada ? 'Ocultar' : 'Revelar'}
              </Botao>
              <Botao variante="secundario" pequeno onClick={substituir} disabled={ocupado}><ArrowPathIcon className="h-5 w-5" /> Substituir</Botao>
              <Botao variante="secundario" pequeno onClick={testar} disabled={ocupado}>Testar chave</Botao>
              <Botao variante="perigo" pequeno onClick={remover} disabled={ocupado}><TrashIcon className="h-5 w-5" /> Remover</Botao>
            </div>
            {!auth.disponivel && (
              <p className="text-xs text-slate-500">
                {NATIVO ? 'Configure um bloqueio de tela para poder revelar a chave.' : 'No navegador não é possível revelar a chave.'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm"><span className="text-slate-500">Estado:</span> <span className="font-medium">{temChave ? 'Substituindo chave' : 'Não configurada'}</span></div>
            <div>
              <Rotulo htmlFor="chave">Chave (começa com sk-ant-)</Rotulo>
              <div className="relative">
                <AreaTexto
                  id="chave"
                  rows={2}
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className={`pr-11 font-mono text-sm ${mostrarEntrada ? '' : '[-webkit-text-security:disc]'}`}
                  placeholder="sk-ant-..."
                />
                <button
                  type="button"
                  aria-label={mostrarEntrada ? 'Ocultar o que está sendo digitado' : 'Mostrar o que está sendo digitado'}
                  onClick={() => setMostrarEntrada((v) => !v)}
                  className="absolute right-2 top-2 rounded p-1 text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800"
                >
                  {mostrarEntrada ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao onClick={salvar} disabled={ocupado || !entrada.trim()}>Salvar</Botao>
              <Botao variante="secundario" onClick={testar} disabled={ocupado || !entrada.trim()}>Testar chave</Botao>
              {temChave && <Botao variante="fantasma" onClick={() => { setEditandoChave(false); setEntrada(''); }}>Cancelar</Botao>}
            </div>
          </div>
        )}

        {msg && (
          <Aviso tom={msg.tom} className="mt-3" icone={msg.tom === 'erro' ? <ExclamationCircleIcon className="h-5 w-5" /> : <InformationCircleIcon className="h-5 w-5" />}>
            {msg.texto}
          </Aviso>
        )}

        <p className="mt-3 text-xs text-slate-500">
          {NATIVO
            ? 'A chave fica guardada apenas neste aparelho, em armazenamento cifrado. Ela é enviada somente para api.anthropic.com no momento da consulta.'
            : 'No navegador a chave fica guardada só até fechar esta aba. Para uso permanente, instale o aplicativo Android.'}
        </p>
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
          Onde obter uma chave <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
      </Cartao>

      <Cartao>
        <Titulo>Consulta</Titulo>
        <Rotulo htmlFor="modelo">Modelo</Rotulo>
        <Selecao id="modelo" value={ajustes.modelo} onChange={(e) => aoMudarAjustes({ ...ajustes, modelo: e.target.value as ModeloId })}>
          {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
        </Selecao>
      </Cartao>

      <Cartao>
        <Titulo>Aparência</Titulo>
        <Rotulo htmlFor="tema">Tema</Rotulo>
        <Selecao id="tema" value={ajustes.tema} onChange={(e) => aoMudarAjustes({ ...ajustes, tema: e.target.value as Tema })}>
          <option value="claro">Claro</option>
          <option value="sistema">Seguir o sistema</option>
          <option value="escuro">Escuro</option>
        </Selecao>
      </Cartao>

      <Cartao>
        <Titulo>Dados</Titulo>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" pequeno onClick={async () => { if (window.confirm('Descartar as edições locais e restaurar o acervo publicado?')) { await aoRestaurarAcervo(); setMsg({ tom: 'sucesso', texto: 'Acervo publicado restaurado.' }); } }}>
            <ArrowPathIcon className="h-5 w-5" /> Restaurar acervo publicado
          </Botao>
          <Botao variante="secundario" pequeno onClick={async () => { if (window.confirm('Limpar o histórico de consultas?')) { await aoLimparHistorico(); setMsg({ tom: 'sucesso', texto: 'Histórico limpo.' }); } }}>
            <TrashIcon className="h-5 w-5" /> Limpar histórico
          </Botao>
        </div>
      </Cartao>

      <Cartao>
        <Titulo>Sobre</Titulo>
        <p className="text-sm">Normas TCE/BA, versão {versao}.</p>
        <p className="mt-1 text-xs text-slate-500">Esta ferramenta não é um sistema oficial do TCE/BA. Sistema desenvolvido por André Barreto Jurkstas.</p>
        <a href="https://github.com/ajurkstas/tceba-normas" target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
          Repositório <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>
      </Cartao>
    </div>
  );
}
