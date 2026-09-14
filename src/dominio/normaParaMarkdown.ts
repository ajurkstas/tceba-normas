import type { Norma } from './tipos';
import { rotuloSituacao } from './hierarquia';

const RE_TITULO_ESTRUTURAL = /^\s*(T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|LIVRO|PARTE|ANEXO)\b/i;
const RE_ARTIGO = /^\s*(Art\.?\s*\d+[ºo°]?[-A-Z]?\.?)(\s+)([\s\S]*)$/i;
const RE_PARAGRAFO = /^\s*(§\s*\d+[ºo°]?\.?|Parágrafo único\.?)/i;
const RE_INCISO = /^\s*([IVXLCDM]+\s*[-–.)]|[a-z]\)|\d+\s*[-–.)])\s+/;

function escapar(s: string): string {
  return s.replace(/([*_`#>\\[\]])/g, '\\$1');
}

// Converte o texto literal da norma em Markdown legível, sem alterar o conteúdo.
export function textoParaMarkdown(texto: string): string {
  const saida: string[] = [];
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const l = bruta.trim();
    if (!l) { saida.push(''); continue; }
    if (RE_TITULO_ESTRUTURAL.test(l) && l.length < 120) { saida.push('', `## ${escapar(l)}`, ''); continue; }
    const mArt = l.match(RE_ARTIGO);
    if (mArt) { saida.push('', `### ${escapar(mArt[1])}`, '', escapar(mArt[3])); continue; }
    if (RE_PARAGRAFO.test(l)) { saida.push('', escapar(l) + '  '); continue; }
    if (RE_INCISO.test(l)) { saida.push(`> ${escapar(l)}  `); continue; }
    // Linha em caixa alta curta: cabeçalho de seção não padronizado.
    if (l.length < 80 && l === l.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}/.test(l)) { saida.push('', `**${escapar(l)}**`, ''); continue; }
    // Duas barras de espaço no fim: quebra de linha dura, para cada linha do original ficar em sua linha.
    saida.push(escapar(l) + '  ');
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function normaParaMarkdown(n: Norma): string {
  const cabecalho = [
    `# ${escapar(n.tipo)}${n.numero ? ' nº ' + escapar(n.numero) : ''}`,
    '',
    n.ementa ? `*${escapar(n.ementa)}*` : '',
    '',
    `- **Data de aprovação:** ${n.data || 'não informada'}`,
    `- **Situação:** ${rotuloSituacao(n.status)}`,
    n.obs ? `- **Observação:** ${escapar(n.obs)}` : '',
    n.link ? `- **Fonte oficial:** [${n.link}](${n.link})` : '',
    '',
    '---',
    '',
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  return cabecalho.join('\n') + '\n' + textoParaMarkdown(n.texto);
}
