import { Preferences } from '@capacitor/preferences';
import type { Ajustes, ModeloId, Tema } from '../dominio/tipos';
import { AJUSTES_PADRAO, MODELOS } from '../dominio/tipos';

const CHAVE = 'tce-ajustes';

export async function carregarAjustes(): Promise<Ajustes> {
  try {
    const { value } = await Preferences.get({ key: CHAVE });
    if (!value) return AJUSTES_PADRAO;
    const bruto = JSON.parse(value) as Partial<Ajustes>;
    const modelo = MODELOS.some((m) => m.id === bruto.modelo) ? (bruto.modelo as ModeloId) : AJUSTES_PADRAO.modelo;
    const tema: Tema = bruto.tema === 'claro' || bruto.tema === 'escuro' ? bruto.tema : 'sistema';
    return { modelo, tema };
  } catch {
    return AJUSTES_PADRAO;
  }
}

export async function salvarAjustes(a: Ajustes): Promise<void> {
  await Preferences.set({ key: CHAVE, value: JSON.stringify(a) });
}

export function aplicarTema(tema: Tema): void {
  const escuroSistema = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const escuro = tema === 'escuro' || (tema === 'sistema' && escuroSistema);
  document.documentElement.classList.toggle('dark', escuro);
}
