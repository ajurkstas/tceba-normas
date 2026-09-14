import type { Norma, Situacao, TipoAto } from './tipos';
import { TIPOS_ATO } from './tipos';

export const ABREVIACOES: Record<TipoAto, string> = {
  'Constituição Federal': 'CF',
  'Constituição do Estado': 'CE',
  'Lei Orgânica': 'LO',
  'Regimento Interno': 'RI',
  'Resolução Normativa': 'RN',
  'Instrução Normativa': 'IN',
  'Portaria Normativa': 'PN',
  'Súmula': 'SUM',
  'Legislação Correlata': 'LC',
};

const TIPOS_ANTIGOS: Record<string, TipoAto> = {
  'Súmula de Jurisprudência': 'Súmula',
  'Outro': 'Legislação Correlata',
};

export function normalizarTipo(tipo: unknown): TipoAto {
  if (typeof tipo !== 'string') return 'Legislação Correlata';
  if ((TIPOS_ATO as readonly string[]).includes(tipo)) return tipo as TipoAto;
  return TIPOS_ANTIGOS[tipo] ?? 'Legislação Correlata';
}

export function normalizarSituacao(status: unknown): Situacao {
  return status === 'revogada' || status === 'vigente_alteracoes' ? status : 'vigente';
}

export function ordemTipo(tipo: TipoAto): number {
  return TIPOS_ATO.indexOf(tipo);
}

export function codigoNorma(n: Pick<Norma, 'tipo' | 'numero'>): string {
  return ABREVIACOES[n.tipo] + (n.numero ? '-' + n.numero : '');
}

export function rotuloSituacao(status: Situacao): string {
  if (status === 'revogada') return 'revogada';
  if (status === 'vigente_alteracoes') return 'vigente, com alterações';
  return 'em vigor';
}

function chaveNumero(numero: string): [number, number] {
  const m = numero.match(/(\d+)\s*\/\s*(\d{2,4})/);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  const ano = m[2].length === 2 ? 1900 + Number(m[2]) : Number(m[2]);
  return [ano, Number(m[1])];
}

// Ordem de hierarquia interna e, dentro do tipo, ano e número crescentes.
export function ordenarNormas(normas: Norma[]): Norma[] {
  return normas.slice().sort((a, b) => {
    const d = ordemTipo(a.tipo) - ordemTipo(b.tipo);
    if (d !== 0) return d;
    const [aa, an] = chaveNumero(a.numero);
    const [ba, bn] = chaveNumero(b.numero);
    return aa - ba || an - bn || a.numero.localeCompare(b.numero);
  });
}

export function normalizarNorma(bruto: Record<string, unknown>, gerarId: () => string): Norma | null {
  const texto = typeof bruto.texto === 'string' ? bruto.texto.trim() : '';
  if (!texto) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    id: str(bruto.id) || gerarId(),
    tipo: normalizarTipo(bruto.tipo),
    numero: str(bruto.numero),
    data: str(bruto.data),
    status: normalizarSituacao(bruto.status),
    ementa: str(bruto.ementa),
    obs: str(bruto.obs),
    link: str(bruto.link),
    texto,
  };
}

export function gerarId(): string {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
