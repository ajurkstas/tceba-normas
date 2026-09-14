import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { arrumarTexto, limparPaginas, type LinhaPdf, type PaginaPdf } from '../dominio/limparPdf';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Item { str: string; x: number; y: number; altura: number }

// Agrupa os itens de texto de uma página em linhas, pela posição vertical.
function montarLinhas(itens: Item[], alturaPagina: number): LinhaPdf[] {
  const ordenados = itens.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: { y: number; altura: number; itens: Item[] }[] = [];
  for (const it of ordenados) {
    const atual = linhas[linhas.length - 1];
    const tolerancia = Math.max(2, Math.min(it.altura, atual?.altura ?? it.altura) * 0.5);
    if (atual && Math.abs(atual.y - it.y) <= tolerancia) {
      atual.itens.push(it);
      atual.altura = Math.max(atual.altura, it.altura);
    } else {
      linhas.push({ y: it.y, altura: it.altura, itens: [it] });
    }
  }
  return linhas.map((l) => {
    const partes = l.itens.sort((a, b) => a.x - b.x);
    let texto = '';
    let fimAnterior = -Infinity;
    for (const p of partes) {
      const precisaEspaco = texto && p.x - fimAnterior > p.altura * 0.15 && !texto.endsWith(' ') && !p.str.startsWith(' ');
      texto += (precisaEspaco ? ' ' : '') + p.str;
      fimAnterior = p.x + p.str.length * p.altura * 0.5; // largura estimada
    }
    // Altura de referência: a mais comum entre os itens da linha (ignora sobrescritos).
    const alturas = partes.map((p) => p.altura).sort((a, b) => a - b);
    const alturaLinha = alturas[Math.floor(alturas.length / 2)];
    return { texto: texto.replace(/\s+/g, ' ').trim(), y: 1 - l.y / alturaPagina, altura: alturaLinha };
  });
}

export async function extrairTextoPdf(arquivo: File): Promise<string> {
  const buf = await arquivo.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const paginas: PaginaPdf[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const alturaPagina = pagina.getViewport({ scale: 1 }).height;
    const conteudo = await pagina.getTextContent();
    const itens: Item[] = [];
    for (const item of conteudo.items) {
      if (!('str' in item)) continue;
      // Texto rotacionado (carimbos laterais de assinatura) não pertence ao corpo.
      if (Math.abs(item.transform[0]) < 0.01 && Math.abs(item.transform[3]) < 0.01) continue;
      const altura = Math.abs(item.transform[3]) || item.height || 10;
      itens.push({ str: item.str, x: item.transform[4], y: item.transform[5], altura });
    }
    paginas.push({ linhas: montarLinhas(itens, alturaPagina) });
  }
  const resultado = arrumarTexto(limparPaginas(paginas));
  if (!resultado) throw new Error('sem texto extraído');
  return resultado;
}
