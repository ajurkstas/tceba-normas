// Converte o texto literal de uma norma em blocos estruturados para o leitor,
// sem alterar o conteúdo: apenas identifica ementa, considerandos, divisões
// (título, capítulo, seção), artigos, parágrafos e incisos.

export type TipoBloco = 'cabecalho' | 'ementa' | 'considerando' | 'artigo' | 'paragrafo' | 'inciso' | 'rotulo' | 'texto';

export interface BlocoTexto { tipo: TipoBloco; texto: string }
export interface BlocoDivisao { tipo: 'divisao'; nivel: number; titulo: string; subtitulo: string; filhos: Bloco[] }
export type Bloco = BlocoTexto | BlocoDivisao;

const NIVEIS: [RegExp, number][] = [
  [/^(LIVRO|PARTE)\b/i, 1],
  [/^T[ÍI]TULO\b/i, 2],
  [/^CAP[ÍI]TULO\b/i, 3],
  [/^SE[ÇC][ÃA]O\b/i, 4],
  [/^SUBSE[ÇC][ÃA]O\b/i, 5],
  [/^ANEXO\b/i, 2],
];
const RE_DIVISAO_CORPO = /^(LIVRO|PARTE|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|ANEXO)\s+(?:[IVXLCDM]+|\d+|ÚNIC[OA])\b[\s\S]{0,90}$/i;
const RE_ARTIGO = /^Art\.?\s*\d+/i;
const RE_PARAGRAFO = /^(§\s*\d+|Parágrafo único)/i;
const RE_INCISO = /^([IVXLCDM]+\s*[-–.)]\s|[a-z]\)\s|\d{1,3}\s*[-–.)]\s)/;
const RE_CONSIDERANDO = /^CONSIDERANDO\b/i;
const RE_PREAMBULO = /^(O |A |OS |AS )?(TRIBUNAL|PRESIDENTE|CONSELHEIR|GOVERNADOR|CORREGEDOR|PLENÁRIO|MINISTÉRIO)/i;
const RE_ROTULO = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 :.,ºª\-–()/"“”]{4,80}$/;

function nivelDivisao(l: string): number {
  if (!RE_DIVISAO_CORPO.test(l)) return 0;
  for (const [re, n] of NIVEIS) if (re.test(l)) return n;
  return 0;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ehRotulo(l: string): boolean {
  return l.length <= 80 && RE_ROTULO.test(l) && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}/.test(l) && l === l.toUpperCase();
}

function classificar(l: string): TipoBloco {
  if (RE_CONSIDERANDO.test(l)) return 'considerando';
  if (RE_ARTIGO.test(l)) return 'artigo';
  if (RE_PARAGRAFO.test(l)) return 'paragrafo';
  if (RE_INCISO.test(l)) return 'inciso';
  if (ehRotulo(l)) return 'rotulo';
  return 'texto';
}

// Localiza, no início do texto, a sequência de linhas que reproduz a ementa cadastrada.
function localizarEmenta(linhas: string[], ementa: string): [number, number] | null {
  const alvo = normalizar(ementa);
  if (alvo.length < 12) return null;
  const limite = Math.min(linhas.length, 40);
  for (let i = 0; i < limite; i++) {
    if (!linhas[i]) continue;
    let acumulado = '';
    for (let j = i; j < limite; j++) {
      if (!linhas[j]) break;
      acumulado += normalizar(linhas[j]);
      if (acumulado === alvo) return [i, j];
      if (!alvo.startsWith(acumulado)) break;
    }
  }
  return null;
}

// Linha que dá continuidade ao bloco anterior (quebrada pela largura da página no PDF).
function ehContinuacao(anterior: BlocoTexto | undefined, l: string): boolean {
  if (!anterior || anterior.tipo === 'rotulo' || anterior.tipo === 'cabecalho') return false;
  if (classificar(l) !== 'texto') return false;
  if (nivelDivisao(l)) return false;
  if (RE_PREAMBULO.test(l) && anterior.tipo !== 'considerando') return false;
  const fimAnterior = anterior.texto.trimEnd();
  if (/^[a-záéíóúâêôãõç0-9(“"]/.test(l)) return true;
  return !/[.:;!?”"]$/.test(fimAnterior);
}

export function estruturarTexto(texto: string, ementa = ''): Bloco[] {
  const linhas = texto.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const ementaPos = localizarEmenta(linhas, ementa);
  const raiz: Bloco[] = [];
  const pilha: { nivel: number; filhos: Bloco[] }[] = [{ nivel: 0, filhos: raiz }];
  let antesDoCorpo = true;
  let ultimo: BlocoTexto | undefined;

  const destino = () => pilha[pilha.length - 1].filhos;
  const empurrar = (b: BlocoTexto) => { destino().push(b); ultimo = b; };

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l) { ultimo = undefined; continue; }

    if (ementaPos && i >= ementaPos[0] && i <= ementaPos[1]) {
      if (i === ementaPos[0]) empurrar({ tipo: 'ementa', texto: l });
      else if (ultimo) ultimo.texto += ' ' + l;
      continue;
    }

    const nivel = nivelDivisao(l);
    if (nivel) {
      antesDoCorpo = false;
      // Subtítulo na linha seguinte ("CAPÍTULO I" + "DAS DISPOSIÇÕES PRELIMINARES").
      let subtitulo = '';
      const prox = linhas[i + 1] ?? '';
      if (prox && prox.length <= 100 && !nivelDivisao(prox) && classificar(prox) !== 'artigo' && classificar(prox) !== 'paragrafo' && classificar(prox) !== 'inciso' && !/[;:]$/.test(prox) && (ehRotulo(prox) || /^(D[aoe]s?|Disposi)/.test(prox))) {
        subtitulo = prox;
        i++;
      }
      while (pilha.length > 1 && pilha[pilha.length - 1].nivel >= nivel) pilha.pop();
      const div: BlocoDivisao = { tipo: 'divisao', nivel, titulo: l, subtitulo, filhos: [] };
      destino().push(div);
      pilha.push({ nivel, filhos: div.filhos });
      ultimo = undefined;
      continue;
    }

    if (ehContinuacao(ultimo, l)) { ultimo!.texto += ' ' + l; continue; }

    let tipo = classificar(l);
    if (tipo === 'artigo' || tipo === 'paragrafo') antesDoCorpo = false;
    if (antesDoCorpo && (tipo === 'texto' || tipo === 'rotulo') && !RE_PREAMBULO.test(l) && (!ementaPos || i < ementaPos[0])) tipo = 'cabecalho';
    if (tipo === 'considerando') antesDoCorpo = false;
    empurrar({ tipo, texto: l });
  }
  return raiz;
}
