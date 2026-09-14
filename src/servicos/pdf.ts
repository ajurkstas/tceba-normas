import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Junta linhas quebradas pela largura da página, preservando quebras antes de
// artigos, parágrafos, incisos e alíneas. Ver _instrucoes/07-acervo-e-dados.md.
export function arrumarTexto(bruto: string): string {
  const linhas = bruto.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const inicioDispositivo = /^(Art\.?\s*\d|§\s*\d|Parágrafo único|[IVXLC]+\s*[-–.)]|[a-z]\)\s)/;
  const saida: string[] = [];
  for (const l of linhas) {
    if (!l) { if (saida.length && saida[saida.length - 1] !== '') saida.push(''); continue; }
    if (/^\d{1,4}$/.test(l)) continue; // número de página isolado
    const anterior = saida.length ? saida[saida.length - 1] : '';
    if (anterior && anterior !== '' && !inicioDispositivo.test(l) && /^[a-záéíóúâêôãõç]/.test(l)) {
      saida[saida.length - 1] = anterior + ' ' + l;
    } else {
      saida.push(l);
    }
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function extrairTextoPdf(arquivo: File): Promise<string> {
  const buf = await arquivo.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const paginas: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p);
    const conteudo = await pagina.getTextContent();
    let texto = '';
    for (const item of conteudo.items) {
      if (!('str' in item)) continue;
      texto += item.str + (item.hasEOL ? '\n' : ' ');
    }
    paginas.push(texto);
  }
  const resultado = arrumarTexto(paginas.join('\n'));
  if (!resultado) throw new Error('sem texto extraído');
  return resultado;
}
