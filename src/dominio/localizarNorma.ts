// Localiza, a partir de um texto livre (a linha FONTE de uma norma citada pela IA,
// ou o campo obs de uma norma do acervo), a norma correspondente já cadastrada.
// Não interpreta o teor da norma; apenas casa tipo e número contra o acervo.
import type { Norma, TipoAto } from './tipos';
import { TIPOS_ATO } from './tipos';
import { ABREVIACOES } from './hierarquia';

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Casa tanto o nome por extenso (sem acento) quanto a abreviação (RN, IN, PN...).
const NOMES_TIPO: [RegExp, TipoAto][] = TIPOS_ATO
  .map((t): [RegExp, TipoAto] => [new RegExp(semAcento(t), 'i'), t])
  .concat(Object.entries(ABREVIACOES).map(([t, sigla]): [RegExp, TipoAto] => [new RegExp(`\\b${sigla}\\b`, 'i'), t as TipoAto]));

const RE_NUMERO = /n[ºo°]?\s*(\d{1,5})\s*\/\s*(\d{2,4})/i;

export interface ReferenciaNormativa {
  tipo?: TipoAto;
  numero?: string; // "074/2023", normalizado
}

// Extrai o tipo de ato e o número normativo mencionados em um texto livre.
export function extrairReferencia(texto: string): ReferenciaNormativa | null {
  if (!texto) return null;
  const semAc = semAcento(texto);
  const mNumero = texto.match(RE_NUMERO);
  let tipo: TipoAto | undefined;
  for (const [re, t] of NOMES_TIPO) {
    if (re.test(semAc)) { tipo = t; break; }
  }
  if (!tipo && !mNumero) return null;
  const numero = mNumero ? `${mNumero[1]}/${mNumero[2].length === 2 ? '19' + mNumero[2] : mNumero[2]}` : undefined;
  return { tipo, numero };
}

function numerosEquivalentes(a: string, b: string): boolean {
  const norm = (n: string) => {
    const m = n.match(/(\d+)\s*\/\s*(\d{2,4})/);
    if (!m) return n;
    const ano = m[2].length === 2 ? 1900 + Number(m[2]) : Number(m[2]);
    return `${Number(m[1])}/${ano}`;
  };
  return norm(a) === norm(b);
}

// Localiza, no acervo, a norma referida por um texto livre (fonte citada ou obs).
// Exige ao menos o número normativo para considerar encontrada (tipo sozinho é
// ambíguo demais, ex.: "Resolução Normativa" sem número casaria com dezenas).
export function encontrarNormaReferida(normas: Norma[], texto: string): Norma | undefined {
  const ref = extrairReferencia(texto);
  if (!ref?.numero) return undefined;
  const candidatas = normas.filter((n) => n.numero && numerosEquivalentes(n.numero, ref.numero!));
  if (candidatas.length === 0) return undefined;
  if (candidatas.length === 1 || !ref.tipo) return candidatas[0];
  return candidatas.find((n) => n.tipo === ref.tipo) ?? candidatas[0];
}

const RE_MENCIONA_REVOGACAO = /\b(revogad[ao]|alterad[ao]|modificad[ao])\b/i;

// Uma obs conta como referência cruzada quando menciona revogação/alteração por
// outra norma e traz elementos suficientes (tipo + número) para tentar localizá-la.
export function obsReferenciaOutraNorma(obs: string): boolean {
  return !!obs && RE_MENCIONA_REVOGACAO.test(obs) && extrairReferencia(obs)?.numero !== undefined;
}

// Verifica se a norma citada em `obs` (revogadora ou modificadora) está cadastrada
// no próprio acervo. Retorna null quando obs não faz esse tipo de referência.
export function referenciaCruzadaQuebrada(norma: Norma, todas: Norma[]): boolean {
  if (!obsReferenciaOutraNorma(norma.obs)) return false;
  const alvo = encontrarNormaReferida(
    todas.filter((n) => n.id !== norma.id),
    norma.obs,
  );
  return !alvo;
}
