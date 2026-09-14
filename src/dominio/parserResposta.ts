import type { NormaCitada, Resposta } from './tipos';

const RE_MARCADOR = /^##\s*(SINTESE|NORMA|OBSERVACAO|OPINIAO|SEM_NORMA)\b[ \t]*$/im;
const RE_DIVISAO = /(?=^##\s*(?:SINTESE|NORMA|OBSERVACAO|OPINIAO|SEM_NORMA)\b)/im;

function limparMarcadores(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').trim();
}

function parseNorma(corpo: string): NormaCitada {
  const linhas = corpo.split('\n');
  let fonte = '';
  let vigencia: string | undefined;
  let inicioTexto = 0;
  for (let i = 0; i < Math.min(linhas.length, 3); i++) {
    const l = linhas[i].trim();
    const mf = l.match(/^\**FONTE:?\**:?\s*(.*)$/i);
    const mv = l.match(/^\**VIGENCIA:?\**:?\s*(.*)$/i);
    if (mf) { fonte = limparMarcadores(mf[1]); inicioTexto = i + 1; continue; }
    if (mv) { vigencia = limparMarcadores(mv[1]); inicioTexto = i + 1; continue; }
    if (l === '' && inicioTexto === i) { inicioTexto = i + 1; continue; }
    break;
  }
  return { fonte, vigencia, texto: linhas.slice(inicioTexto).join('\n').trim() };
}

export function parseResposta(bruto: string): Resposta {
  const texto = (bruto || '').replace(/\r\n/g, '\n').trim();
  if (!RE_MARCADOR.test(texto)) return { formato: 'invalido', bruto: texto };

  const partes = texto.split(RE_DIVISAO).map((p) => p.trim()).filter(Boolean);
  const blocos = partes
    .map((p) => {
      const m = p.match(/^##\s*(SINTESE|NORMA|OBSERVACAO|OPINIAO|SEM_NORMA)\b[ \t]*\n?([\s\S]*)$/i);
      return m ? { tipo: m[1].toUpperCase(), corpo: m[2].trim() } : null;
    })
    .filter((b): b is { tipo: string; corpo: string } => b !== null);

  const semNorma = blocos.find((b) => b.tipo === 'SEM_NORMA');
  if (semNorma) {
    if (blocos.length > 1 && import.meta.env?.DEV) {
      console.warn('Resposta misturou SEM_NORMA com outros blocos; blocos extras descartados.');
    }
    return { formato: 'sem_norma', frase: limparMarcadores(semNorma.corpo) };
  }

  const resposta: Resposta = { formato: 'com_norma', sintese: '', normas: [] };
  for (const b of blocos) {
    if (b.tipo === 'SINTESE') resposta.sintese = limparMarcadores(b.corpo);
    else if (b.tipo === 'NORMA') resposta.normas.push(parseNorma(b.corpo));
    else if (b.tipo === 'OBSERVACAO') resposta.observacao = limparMarcadores(b.corpo);
    else if (b.tipo === 'OPINIAO') resposta.opiniao = limparMarcadores(b.corpo);
  }
  if (!resposta.sintese && resposta.normas.length === 0) return { formato: 'invalido', bruto: texto };
  return resposta;
}

export type TomVigencia = 'vigor' | 'atencao' | 'revogada' | 'neutro';

export function tomVigencia(vigencia?: string): TomVigencia {
  if (!vigencia) return 'neutro';
  const v = vigencia.toLowerCase();
  if (v.startsWith('revogada')) return 'revogada';
  if (v.startsWith('alterada') || v.startsWith('incerta')) return 'atencao';
  if (v.startsWith('em vigor')) return 'vigor';
  return 'neutro';
}
