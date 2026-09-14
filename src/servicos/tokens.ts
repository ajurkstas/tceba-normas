// Registro local (nunca remoto) de tokens consumidos por consulta à IA, para o
// usuário acompanhar sua própria cota na Anthropic. Nunca grava a chave.
import { Preferences } from '@capacitor/preferences';
import type { UsoTokens } from '../dominio/tipos';

const CHAVE = 'tce-uso-tokens';
const MAXIMO = 500;

export async function carregarUso(): Promise<UsoTokens[]> {
  try {
    const { value } = await Preferences.get({ key: CHAVE });
    const lista = value ? (JSON.parse(value) as UsoTokens[]) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function registrarUso(uso: UsoTokens): Promise<UsoTokens[]> {
  const atual = await carregarUso();
  const novo = [uso, ...atual].slice(0, MAXIMO);
  await Preferences.set({ key: CHAVE, value: JSON.stringify(novo) });
  return novo;
}

export async function limparUso(): Promise<void> {
  await Preferences.remove({ key: CHAVE });
}

export interface ResumoUso {
  totalConsultas: number;
  totalEntrada: number;
  totalSaida: number;
  totalCacheLeitura: number;
  totalCacheEscrita: number;
  esteMes: { entrada: number; saida: number };
  porModelo: { modelo: string; entrada: number; saida: number }[];
}

export function resumirUso(registros: UsoTokens[]): ResumoUso {
  const agora = new Date();
  const mesAtual = `${agora.getFullYear()}-${agora.getMonth()}`;
  const porModeloMapa = new Map<string, { entrada: number; saida: number }>();
  let totalEntrada = 0, totalSaida = 0, totalCacheLeitura = 0, totalCacheEscrita = 0;
  let esteMesEntrada = 0, esteMesSaida = 0;

  for (const r of registros) {
    totalEntrada += r.entrada;
    totalSaida += r.saida;
    totalCacheLeitura += r.cacheLeitura;
    totalCacheEscrita += r.cacheEscrita;
    const d = new Date(r.quando);
    if (`${d.getFullYear()}-${d.getMonth()}` === mesAtual) {
      esteMesEntrada += r.entrada;
      esteMesSaida += r.saida;
    }
    const acumulado = porModeloMapa.get(r.modelo) ?? { entrada: 0, saida: 0 };
    acumulado.entrada += r.entrada;
    acumulado.saida += r.saida;
    porModeloMapa.set(r.modelo, acumulado);
  }

  return {
    totalConsultas: registros.length,
    totalEntrada,
    totalSaida,
    totalCacheLeitura,
    totalCacheEscrita,
    esteMes: { entrada: esteMesEntrada, saida: esteMesSaida },
    porModelo: Array.from(porModeloMapa.entries()).map(([modelo, v]) => ({ modelo, ...v })),
  };
}
