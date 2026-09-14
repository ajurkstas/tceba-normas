import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import type { Ajustes as TAjustes, ItemHistorico, Norma } from './dominio/tipos';
import { AJUSTES_PADRAO } from './dominio/tipos';
import { carregarAcervo, restaurarPublicado, salvarAcervo } from './servicos/acervo';
import { carregarHistorico, limparHistorico, salvarHistorico } from './servicos/historico';
import { aplicarTema, carregarAjustes, salvarAjustes } from './servicos/ajustes';
import { temChave as verificarChave } from './servicos/chaveApi';
import { NATIVO } from './servicos/plataforma';
import { executarVoltar } from './servicos/voltar';
import { BarraAbas, type Aba } from './componentes/BarraAbas';
import { Aviso } from './componentes/basicos';
import { Consulta } from './telas/Consulta';
import { Acervo } from './telas/Acervo';
import { Ajustes } from './telas/Ajustes';
import { VisualizadorNorma } from './componentes/VisualizadorNorma';

export function App() {
  const [aba, setAba] = useState<Aba>('consulta');
  const [normas, setNormas] = useState<Norma[]>([]);
  const [rascunho, setRascunho] = useState(false);
  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [ajustes, setAjustes] = useState<TAjustes>(AJUSTES_PADRAO);
  const [temChave, setTemChave] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [avisoInicial, setAvisoInicial] = useState<string | null>(null);
  const [versao, setVersao] = useState(__VERSAO_APP__);
  const [visualizando, setVisualizando] = useState<Norma | null>(null);
  const [editarAoFechar, setEditarAoFechar] = useState<Norma | null>(null);

  useEffect(() => {
    (async () => {
      const a = await carregarAjustes();
      setAjustes(a);
      aplicarTema(a.tema);
      const acervo = await carregarAcervo();
      setNormas(acervo.normas);
      setRascunho(acervo.rascunhoLocal);
      if (acervo.atualizadoAutomaticamente) setAvisoInicial('O acervo publicado foi atualizado nesta versão do aplicativo.');
      setHistorico(await carregarHistorico());
      setTemChave(await verificarChave());
      if (NATIVO) {
        try { setVersao((await CapApp.getInfo()).version); } catch { /* mantém a versão do build */ }
      }
      setPronto(true);
    })();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const f = () => aplicarTema(ajustes.tema);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [ajustes.tema]);

  // Botão voltar do Android: volta para Consulta antes de sair do app.
  useEffect(() => {
    if (!NATIVO) return;
    let handle: { remove: () => Promise<void> } | undefined;
    CapApp.addListener('backButton', () => {
      if (executarVoltar()) return;
      if (aba !== 'consulta') setAba('consulta');
      else CapApp.exitApp();
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, [aba]);

  const salvarNormas = useCallback(async (novas: Norma[]) => {
    setNormas(novas);
    setRascunho(true);
    await salvarAcervo(novas);
  }, []);

  const registrarHistorico = useCallback((item: ItemHistorico) => {
    setHistorico((h) => {
      const novo = [item, ...h].slice(0, 30);
      salvarHistorico(novo);
      return novo;
    });
  }, []);

  const mudarAjustes = useCallback((a: TAjustes) => {
    setAjustes(a);
    aplicarTema(a.tema);
    salvarAjustes(a);
  }, []);

  if (!pronto) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Carregando acervo</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-4">
      {avisoInicial && <Aviso tom="info" className="mb-4">{avisoInicial}</Aviso>}
      {aba === 'consulta' && (
        <Consulta normas={normas} modelo={ajustes.modelo} temChave={temChave} historico={historico} aoRegistrar={registrarHistorico} irParaAjustes={() => setAba('ajustes')} aoVisualizar={setVisualizando} />
      )}
      {aba === 'acervo' && (
        <Acervo normas={normas} rascunhoLocal={rascunho} aoSalvar={salvarNormas} aoVisualizar={setVisualizando} editarInicial={editarAoFechar} aoConsumirEditarInicial={() => setEditarAoFechar(null)} />
      )}
      {aba === 'ajustes' && (
        <Ajustes
          ajustes={ajustes}
          aoMudarAjustes={mudarAjustes}
          temChave={temChave}
          aoMudarChave={setTemChave}
          versao={versao}
          aoRestaurarAcervo={async () => { setNormas(await restaurarPublicado()); setRascunho(false); }}
          aoLimparHistorico={async () => { await limparHistorico(); setHistorico([]); }}
        />
      )}
      <BarraAbas ativa={aba} aoMudar={setAba} />
      {visualizando && (
        <VisualizadorNorma
          norma={visualizando}
          aoFechar={() => setVisualizando(null)}
          aoEditar={() => { setEditarAoFechar(visualizando); setVisualizando(null); setAba('acervo'); }}
        />
      )}
    </div>
  );
}
