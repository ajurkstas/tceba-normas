import type { Situacao, TipoAto } from './tipos';

// Extrai do texto de uma norma (em geral recém-extraído de PDF) os dados de
// cadastro: tipo, número no formato 000/0000, data de aprovação, ementa e
// situação. Cada campo vem vazio quando não há reconhecimento seguro.
export interface Metadados {
  tipo?: TipoAto;
  numero: string;
  data: string;
  ementa: string;
  status: Situacao;
}

const MESES: Record<string, string> = {
  janeiro: '01', fevereiro: '02', 'março': '03', marco: '03', abril: '04', maio: '05', junho: '06',
  julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};
const RE_DATA_LONGA = /(\d{1,2})[ºo°]?\s+de\s+([a-zç]+)\s+de\s+(\d{4})/gi;
const RE_CABECALHO = /^(RESOLU[ÇC][ÃA]O|INSTRU[ÇC][ÃA]O NORMATIVA|PORTARIA(?: NORMATIVA)?|LEI COMPLEMENTAR|LEI|DECRETO|S[ÚU]MULA)\b/i;
const RE_NUMERO = /(?:N[º°o.]*\s*|:\s*|\s)0*(\d{1,4})\s*[\/-]\s*(\d{2,4})\b/i;
const RE_NUMERO_VIRGULA = /N[º°o.]*\s*0*(\d{1,4})\s*,?\s*de\s+\d{1,2}\s+de/i;
const RE_VERBO_EMENTA = /^(Dispõe|Disp[õo]e|Aprova|Regulamenta|Institui|Altera|Estabelece|Disciplina|Fixa|Cria|Define|Revoga|Regula|Uniformiza|Consolida|Prorroga|Determina)\b/;
const RE_PREAMBULO = /^(O|A) (TRIBUNAL|PRESIDENTE|CONSELHEIR|GOVERNADOR|CORREGEDOR|PLENÁRIO)|^CONSIDERANDO\b|^R\s*E\s*S\s*O\s*L\s*V\s*E|^Art\.?\s*\d/i;
const RE_ALTERACOES = /texto consolidado|com as altera[çc][õo]es|Reda[çc][ãa]o (dada |de acordo|original)|revogad[oa]s? pel[oa] art|\(Inclu[íi]d[oa] pel|\(Acrescentad[oa] pel|Alterad[oa] pel[ao] (Resolu|Lei|Instru|Portaria)/i;

function formatarData(dia: string, mes: string, ano: string): string {
  const m = MESES[mes.toLowerCase()];
  return m ? `${dia.padStart(2, '0')}/${m}/${ano}` : '';
}

function extrairDatas(trecho: string): string[] {
  const datas: string[] = [];
  for (const m of trecho.matchAll(RE_DATA_LONGA)) {
    const d = formatarData(m[1], m[2], m[3]);
    if (d) datas.push(d);
  }
  return datas;
}

function inferirTipo(cabecalho: string, ementa: string): TipoAto | undefined {
  const c = cabecalho.toUpperCase();
  if (/^INSTRU/.test(c)) return 'Instrução Normativa';
  if (/^PORTARIA/.test(c)) return 'Portaria Normativa';
  if (/^S[ÚU]MULA/.test(c)) return 'Súmula';
  if (/^RESOLU/.test(c)) return /Regimento Interno/i.test(ementa) && /^Aprova/i.test(ementa) ? 'Regimento Interno' : 'Resolução Normativa';
  if (/^LEI COMPLEMENTAR/.test(c)) return /Lei Orgânica/i.test(ementa) ? 'Lei Orgânica' : 'Legislação Correlata';
  if (/^(LEI|DECRETO)/.test(c)) return 'Legislação Correlata';
  return undefined;
}

export function extrairMetadados(texto: string): Metadados {
  const linhas = texto.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const inicio = linhas.slice(0, 60);

  // Cabeçalho: primeira linha que nomeia o ato ("RESOLUÇÃO: 000074/2023", "LEI COMPLEMENTAR Nº 005 DE ...").
  const idxCab = inicio.findIndex((l) => RE_CABECALHO.test(l));
  const cabecalho = idxCab >= 0 ? inicio[idxCab] : '';

  // Ementa: a partir do primeiro verbo típico, até o ponto final ou o preâmbulo.
  let ementa = '';
  const idxEmenta = inicio.findIndex((l, i) => i > idxCab && RE_VERBO_EMENTA.test(l));
  if (idxEmenta >= 0) {
    const partes: string[] = [];
    for (let i = idxEmenta; i < inicio.length; i++) {
      const l = inicio[i];
      if (!l || (i > idxEmenta && RE_PREAMBULO.test(l))) break;
      partes.push(l);
      if (/\.$/.test(l)) break;
    }
    ementa = partes.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Número: no cabeçalho ("000074/2023", "N.º 18, de 29 de junho de 1992"), com ano da data quando faltar.
  let numero = '';
  const datasCabecalho = extrairDatas(cabecalho + ' ' + (inicio[idxCab + 1] ?? ''));
  const mNum = cabecalho.match(RE_NUMERO);
  if (mNum) {
    const ano = mNum[2].length === 2 ? String(Number(mNum[2]) > 50 ? 1900 + Number(mNum[2]) : 2000 + Number(mNum[2])) : mNum[2];
    numero = `${mNum[1].padStart(3, '0')}/${ano}`;
  } else {
    const mV = cabecalho.match(RE_NUMERO_VIRGULA) ?? cabecalho.match(/N[º°o.]*\s*0*(\d{1,4})\b/i);
    const ano = datasCabecalho[0]?.slice(-4);
    if (mV && ano) numero = `${mV[1].padStart(3, '0')}/${ano}`;
  }

  // Data de aprovação: fecho ("Tribunal de Contas..., em 31 de agosto de 2023."), depois cabeçalho, depois primeira data.
  let data = '';
  const fecho = linhas.filter((l) => /^(Tribunal de Contas|Sala das Sess[õo]es|Salvador|Gabinete|Plenário),?\s.*\d{4}\.?$/i.test(l) || /^(Sala das Sess[õo]es|Salvador),?\s+(em\s+)?\d{1,2}\s+de/i.test(l));
  for (const l of fecho.reverse()) { const d = extrairDatas(l); if (d.length) { data = d[0]; break; } }
  if (!data && datasCabecalho.length) data = datasCabecalho[0];
  if (!data) {
    const todas = extrairDatas(inicio.join('\n'));
    if (todas.length) data = todas[0];
  }

  const status: Situacao = RE_ALTERACOES.test(texto) ? 'vigente_alteracoes' : 'vigente';
  return { tipo: inferirTipo(cabecalho, ementa), numero, data, ementa, status };
}
