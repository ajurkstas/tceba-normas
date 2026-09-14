// Busca sem IA: localiza no acervo os dispositivos relacionados aos termos da pergunta.
import type { Norma } from './tipos';
import { ordenarNormas } from './hierarquia';

const PALAVRAS_VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'pra', 'com', 'sem', 'sob', 'sobre', 'ao', 'aos', 'e', 'ou', 'que', 'qual', 'quais', 'quando', 'como',
  'onde', 'quem', 'se', 'ser', 'sao', 'esta', 'este', 'esse', 'essa', 'isso', 'isto', 'ha', 'tem', 'ter', 'foi', 'sera',
  'pode', 'deve', 'devem', 'podem', 'existe', 'existem', 'qualquer', 'entre', 'mais', 'menos', 'muito', 'pelo', 'pela',
  'pelos', 'pelas', 'ate', 'apos', 'antes', 'depois', 'caso', 'tce', 'tceba', 'tribunal', 'contas', 'estado', 'bahia',
  'norma', 'normas', 'regra', 'dispositivo', 'artigo', 'art', 'lei', 'prazo', 'prazos',
]);

const SUFIXOS = ['mente', 'ções', 'ção', 'coes', 'cao', 'ões', 'oes', 'ão', 'ao', 'ais', 'eis', 'ois', 'is', 'es', 's', 'a', 'o', 'e'];

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function radical(palavra: string): string {
  let p = normalizar(palavra);
  // Até duas passagens: plural e depois desinência (recursos > recurso > recurs).
  for (let passo = 0; passo < 2; passo++) {
    const suf = SUFIXOS.find((s) => p.endsWith(s) && p.length - s.length >= 4);
    if (!suf) break;
    p = p.slice(0, -suf.length);
    if (suf !== 's' && suf !== 'es') break;
  }
  return p;
}

export function termosDeBusca(pergunta: string): string[] {
  const vistos = new Set<string>();
  const termos: string[] = [];
  for (const bruto of normalizar(pergunta).split(/[^a-z0-9]+/)) {
    if (bruto.length < 3 || PALAVRAS_VAZIAS.has(bruto)) continue;
    const r = radical(bruto);
    if (r.length < 3 || vistos.has(r)) continue;
    vistos.add(r);
    termos.push(r);
  }
  return termos;
}

export interface Trecho {
  normaId: string;
  titulo: string;   // primeira linha (ex.: "Art. 5º ...") ou rótulo
  texto: string;    // trecho completo
  pontuacao: number;
  termosEncontrados: string[];
}

export interface ResultadoBusca {
  termos: string[];
  grupos: { norma: Norma; trechos: Trecho[] }[];
  totalTrechos: number;
}

const RE_INICIO_ARTIGO = /^\s*(Art\.?\s*\d+[ºo°]?|Artigo\s+\d+|S[úu]mula\s+n?[ºo°.]?\s*\d+)/i;
const TAMANHO_MAX_TRECHO = 2500;

// Divide o texto de uma norma em dispositivos (um por artigo). Preâmbulo e trechos sem artigo viram blocos por parágrafo.
export function dividirEmDispositivos(texto: string): { titulo: string; texto: string }[] {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const blocos: string[][] = [];
  let atual: string[] = [];
  for (const l of linhas) {
    if (RE_INICIO_ARTIGO.test(l) && atual.length) {
      blocos.push(atual);
      atual = [];
    }
    atual.push(l);
  }
  if (atual.length) blocos.push(atual);

  const saida: { titulo: string; texto: string }[] = [];
  for (const b of blocos) {
    const conteudo = b.join('\n').trim();
    if (!conteudo) continue;
    if (RE_INICIO_ARTIGO.test(conteudo) || conteudo.length <= TAMANHO_MAX_TRECHO) {
      saida.push({ titulo: primeiraLinha(conteudo), texto: conteudo });
      continue;
    }
    // Bloco longo sem artigos: quebra por parágrafos em pedaços de tamanho razoável.
    let pedaco = '';
    for (const par of conteudo.split(/\n\s*\n/)) {
      if (pedaco && pedaco.length + par.length > TAMANHO_MAX_TRECHO) {
        saida.push({ titulo: primeiraLinha(pedaco), texto: pedaco.trim() });
        pedaco = '';
      }
      pedaco += (pedaco ? '\n\n' : '') + par;
    }
    if (pedaco.trim()) saida.push({ titulo: primeiraLinha(pedaco), texto: pedaco.trim() });
  }
  return saida;
}

function primeiraLinha(s: string): string {
  const l = s.split('\n').find((x) => x.trim()) ?? '';
  return l.trim().length > 90 ? l.trim().slice(0, 87) + '...' : l.trim();
}

function pontuar(textoNormalizado: string, termos: string[]): { pontuacao: number; encontrados: string[] } {
  let pontuacao = 0;
  const encontrados: string[] = [];
  for (const t of termos) {
    // radical no início de palavra
    const re = new RegExp(`(^|[^a-z0-9])${t}`, 'g');
    const n = (textoNormalizado.match(re) ?? []).length;
    if (n > 0) {
      encontrados.push(t);
      pontuacao += 3 + Math.min(n, 5);
    }
  }
  // Bônus por cobrir todos os termos e por trechos curtos (mais específicos).
  if (termos.length > 1 && encontrados.length === termos.length) pontuacao += 6;
  if (encontrados.length >= 2) pontuacao += encontrados.length * 2;
  return { pontuacao, encontrados };
}

export function buscarNoAcervo(normas: Norma[], pergunta: string, limite = 12): ResultadoBusca {
  const termos = termosDeBusca(pergunta);
  if (termos.length === 0) return { termos, grupos: [], totalTrechos: 0 };

  const trechos: Trecho[] = [];
  for (const n of normas) {
    const bonusEmenta = pontuar(normalizar(n.ementa), termos).encontrados.length;
    for (const d of dividirEmDispositivos(n.texto)) {
      const { pontuacao, encontrados } = pontuar(normalizar(d.texto), termos);
      if (pontuacao === 0) continue;
      const penalidadeTamanho = d.texto.length > 1500 ? 1 : 0;
      trechos.push({ normaId: n.id, titulo: d.titulo, texto: d.texto, pontuacao: pontuacao + bonusEmenta - penalidadeTamanho, termosEncontrados: encontrados });
    }
  }

  // Com dois ou mais termos, trechos que casam só um termo são ruído se houver trechos melhores.
  const melhorCobertura = Math.max(0, ...trechos.map((t) => t.termosEncontrados.length));
  const relevantes = termos.length >= 2 && melhorCobertura >= 2 ? trechos.filter((t) => t.termosEncontrados.length >= 2) : trechos;
  relevantes.sort((a, b) => b.pontuacao - a.pontuacao);
  const escolhidos = relevantes.slice(0, limite);
  const porNorma = new Map<string, Trecho[]>();
  for (const t of escolhidos) porNorma.set(t.normaId, [...(porNorma.get(t.normaId) ?? []), t]);

  // Normas ordenadas pela relevância do melhor trecho; empate resolvido pela hierarquia.
  const grupos = ordenarNormas(normas.filter((n) => porNorma.has(n.id)))
    .map((norma) => ({ norma, trechos: porNorma.get(norma.id)!.sort((a, b) => b.pontuacao - a.pontuacao) }))
    .sort((a, b) => b.trechos[0].pontuacao - a.trechos[0].pontuacao);
  return { termos, grupos, totalTrechos: relevantes.length };
}
