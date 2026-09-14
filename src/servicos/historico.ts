import { Preferences } from '@capacitor/preferences';
import type { ItemHistorico } from '../dominio/tipos';

const CHAVE = 'tce-historico';
const MAXIMO = 30;

export async function carregarHistorico(): Promise<ItemHistorico[]> {
  try {
    const { value } = await Preferences.get({ key: CHAVE });
    const lista = value ? (JSON.parse(value) as ItemHistorico[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function salvarHistorico(lista: ItemHistorico[]): Promise<void> {
  try {
    await Preferences.set({ key: CHAVE, value: JSON.stringify(lista.slice(0, MAXIMO)) });
  } catch { /* histórico não é crítico */ }
}

export async function limparHistorico(): Promise<void> {
  await Preferences.remove({ key: CHAVE });
}
