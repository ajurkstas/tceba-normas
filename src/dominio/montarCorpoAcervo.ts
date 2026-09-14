import type { Norma } from './tipos';
import { codigoNorma, ordenarNormas, rotuloSituacao } from './hierarquia';

// Herdado do index.html original. Ver _instrucoes/07-acervo-e-dados.md.
export const LIMITE_ACERVO_CHARS = 280_000;
const MAX_NORMAS_PRE_SELECIONADAS = 25;

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function termosDaPergunta(pergunta: string): string[] {
  return semAcento(pergunta).split(/[^a-z0-9]+/).filter((t) => t.length > 3);
}

export interface CorpoAcervo {
  texto: string;
  enviadas: number;
  total: number;
  preSelecionado: boolean;
}

export function selecionarNormas(normas: Norma[], pergunta: string): Norma[] {
  const ordenadas = ordenarNormas(normas);
  const tamanhoTotal = ordenadas.reduce((s, n) => s + n.texto.length, 0);
  if (tamanhoTotal <= LIMITE_ACERVO_CHARS) return ordenadas;
  const termos = termosDaPergunta(pergunta);
  if (termos.length === 0) return ordenadas;

  const pontuadas = ordenadas.map((n) => {
    const base = semAcento(n.tipo + ' ' + n.ementa + ' ' + n.texto);
    const score = termos.reduce((s, t) => s + (base.includes(t) ? 1 : 0), 0);
    return { n, score };
  });

  // Lei Orgânica e Regimento Interno sempre entram quando cabem no limite.
  const essenciais = pontuadas.filter((p) => p.n.tipo === 'Lei Orgânica' || p.n.tipo === 'Regimento Interno');
  const demais = pontuadas
    .filter((p) => !essenciais.includes(p))
    .sort((a, b) => b.score - a.score);

  const escolhidas: Norma[] = [];
  let acumulado = 0;
  for (const p of [...essenciais, ...demais]) {
    if (escolhidas.length >= MAX_NORMAS_PRE_SELECIONADAS) break;
    if (acumulado + p.n.texto.length > LIMITE_ACERVO_CHARS && escolhidas.length > 0) continue;
    escolhidas.push(p.n);
    acumulado += p.n.texto.length;
  }
  return ordenarNormas(escolhidas);
}

export function serializarNorma(n: Norma, indice: number): string {
  const situacao =
    n.status !== 'vigente'
      ? ` [SITUAÇÃO: ${rotuloSituacao(n.status).toUpperCase()}${n.obs ? ', ' + n.obs : ''}]`
      : '';
  return `[${indice + 1}] ${n.tipo} nº ${n.numero || 's/n'} (${n.data || 'sem data'}) ${codigoNorma(n)}${situacao}\nEmenta: ${n.ementa || 'sem ementa'}\nTexto integral:\n${n.texto}`;
}

export function montarCorpoAcervo(normas: Norma[], pergunta: string): CorpoAcervo {
  const selecionadas = selecionarNormas(normas, pergunta);
  const corpo = selecionadas.map(serializarNorma).join('\n\n---\n\n');
  const preSelecionado = selecionadas.length < normas.length;
  const aviso = preSelecionado
    ? `\n\n[Aviso: o acervo completo tem ${normas.length} normas; por volume, foram pré-selecionadas as ${selecionadas.length} mais relacionadas à pergunta pelas palavras-chave. Caso a resposta pareça incompleta, refine a pergunta com termos mais específicos.]`
    : '';
  return {
    texto: `ACERVO NORMATIVO DISPONÍVEL (${selecionadas.length} de ${normas.length} normas):\n\n${corpo || '(acervo vazio)'}${aviso}`,
    enviadas: selecionadas.length,
    total: normas.length,
    preSelecionado,
  };
}
