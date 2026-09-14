// Heurísticas para ficar só com o texto efetivo da norma extraída de um PDF:
// remove cabeçalho, rodapé, paginação e carimbos de assinatura eletrônica, preservando notas de rodapé.
// Puro (sem pdf.js) para ser testável. Ver _instrucoes/07-acervo-e-dados.md.

export interface LinhaPdf {
  texto: string;
  y: number;       // posição vertical do topo da página, em fração (0 = topo, 1 = base)
  altura: number;  // tamanho de fonte aproximado (unidades do PDF)
}

export interface PaginaPdf {
  linhas: LinhaPdf[]; // em ordem de leitura, de cima para baixo
}

const TOPO = 0.12;
const BASE = 0.85;
const REGIAO_NOTAS = 0.6;
const FATOR_FONTE_PEQUENA = 0.88;

const PADROES_CABECALHO_RODAPE = [
  /^\s*p[áa]g(?:ina)?\.?\s*:?\s*\d+/i,
  /^\s*\d+\s*(?:\/|de)\s*\d+\s*$/,
  /^\s*[-–]?\s*\d{1,4}\s*[-–]?\s*$/,
  /^\s*(?:fl\.?|folha)\s*\d+/i,
  /https?:\/\/|www\./i,
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
  /impresso\s+em|gerado\s+em|emitido\s+em/i,
];

const PADROES_ASSINATURA = [
  /assinad[oa]s?\s+(?:eletronic|digital)/i,
  /(?:este\s+)?documento\s+(?:foi\s+)?assinado/i,
  /assinatura\s+(?:eletr[ôo]nica|digital)/i,
  /autenticidade\s+(?:deste|do)\s+documento/i,
  /c[óo]digo\s+(?:verificador|de\s+verifica[çc][ãa]o|de\s+autentica[çc][ãa]o)/i,
  /verifique\s+(?:a\s+autenticidade|em)/i,
  /conforme\s+(?:art\.?\s*\d+.*)?mp\s*n?[ºo°.]?\s*2\.?200/i,
  /icp[- ]brasil/i,
  /certificad[oa]\s+digital/i,
  /\bhash\b\s*[:=]?\s*[0-9a-f]{16,}/i,
  /^\s*[0-9a-f]{32,}\s*$/i,
  /sei\s*n?[ºo°.]?\s*\d{5,}/i,
  /processo\s+eletr[ôo]nico.*\bsei\b/i,
  /autenticidade\s+(?:pode|deve|poder[áa])\s+ser\s+verificada/i,
  /^\s*autentica[çc][ãa]o\s*:\s*\S+\s*$/i,
  /^\s*endere[çc]o\s+https?:/i,
  /assinad[oa]\s+em\s+\d{2}\/\d{2}\/\d{4}/i,
];

// Página inteira de assinaturas: tudo a partir deste título é descartado.
const RE_QUADRO_ASSINATURAS = /^\s*quadro\s+de\s+assinaturas/i;
const RE_ASSINADO_EM = /assinad[oa]\s+em\s+\d{2}\/\d{2}\/\d{4}/i;
const MINIMO_TEXTO_ANTES_DO_CARIMBO = 30;

function chaveRepeticao(texto: string): string {
  return texto.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

function fonteDoCorpo(paginas: PaginaPdf[]): number {
  const pesos = new Map<number, number>();
  for (const p of paginas) for (const l of p.linhas) {
    const k = Math.round(l.altura * 2) / 2;
    pesos.set(k, (pesos.get(k) ?? 0) + l.texto.length);
  }
  let melhor = 0, peso = -1;
  for (const [k, w] of pesos) if (w > peso) { melhor = k; peso = w; }
  return melhor || 10;
}

export function ehLinhaDeAssinatura(texto: string): boolean {
  return PADROES_ASSINATURA.some((re) => re.test(texto));
}

// Carimbo lateral colado ao fim de uma linha de texto: corta o carimbo e preserva o texto.
export function removerCarimbo(texto: string): string {
  let menor = -1;
  for (const re of PADROES_ASSINATURA) {
    const m = re.exec(texto);
    if (m && (menor < 0 || m.index < menor)) menor = m.index;
  }
  if (menor < 0) return texto;
  const antes = texto.slice(0, menor).trim();
  return antes.length >= MINIMO_TEXTO_ANTES_DO_CARIMBO ? antes : '';
}

function ehLinhaDeCabecalhoRodape(texto: string): boolean {
  return PADROES_CABECALHO_RODAPE.some((re) => re.test(texto));
}

const RE_INICIO_NOTA = /^\s*(?:\(?\d{1,3}\)?[\s.:\-–]|[*†‡]|\[\d{1,3}\])/;

export function limparPaginas(paginas: PaginaPdf[]): string {
  if (paginas.length === 0) return '';
  const corpo = fonteDoCorpo(paginas);
  const limiarPequena = corpo * FATOR_FONTE_PEQUENA;

  // Linhas repetidas em várias páginas, nas margens: cabeçalho ou rodapé.
  const contagem = new Map<string, number>();
  for (const p of paginas) {
    const vistas = new Set<string>();
    for (const l of p.linhas) {
      if (l.y > TOPO && l.y < BASE) continue;
      const k = chaveRepeticao(l.texto);
      if (!k || vistas.has(k)) continue;
      vistas.add(k);
      contagem.set(k, (contagem.get(k) ?? 0) + 1);
    }
  }
  const minimoRepeticoes = paginas.length >= 3 ? Math.max(2, Math.ceil(paginas.length * 0.4)) : 2;
  const repetidas = new Set([...contagem.entries()].filter(([, n]) => n >= minimoRepeticoes).map(([k]) => k));

  const blocos: string[] = [];
  for (const p of paginas) {
    const corpoPagina: string[] = [];
    const notas: string[] = [];
    let emNota = false;

    let paginaDeAssinaturas = false;
    for (const l of p.linhas) {
      let t = l.texto.trim();
      if (!t || paginaDeAssinaturas) continue;
      if (RE_QUADRO_ASSINATURAS.test(t)) { paginaDeAssinaturas = true; continue; }
      if (ehLinhaDeAssinatura(t)) {
        // "Fulano" na linha anterior de "Conselheiro - Assinado em ..." é parte do carimbo.
        if (RE_ASSINADO_EM.test(t)) {
          const ultima = corpoPagina[corpoPagina.length - 1];
          if (ultima && !/\d/.test(ultima) && ultima.length < 70) corpoPagina.pop();
        }
        t = removerCarimbo(t);
        if (!t) continue;
      }
      const naMargem = l.y <= TOPO || l.y >= BASE;
      if (naMargem && (repetidas.has(chaveRepeticao(t)) || ehLinhaDeCabecalhoRodape(t))) continue;

      const pequena = l.altura < limiarPequena;
      if (pequena && l.y >= REGIAO_NOTAS) {
        // Nota de rodapé: começa com número/marcador ou continua uma nota anterior.
        if (RE_INICIO_NOTA.test(t)) { notas.push(t); emNota = true; continue; }
        if (emNota) { notas[notas.length - 1] += ' ' + t; continue; }
        // Texto pequeno na base sem cara de nota: rodapé.
        continue;
      }
      if (naMargem && pequena) continue; // cabeçalho em fonte pequena
      emNota = false;
      corpoPagina.push(t);
    }

    const partes = [corpoPagina.join('\n')];
    if (notas.length) partes.push(notas.join('\n'));
    blocos.push(partes.filter(Boolean).join('\n\n'));
  }
  return blocos.filter(Boolean).join('\n');
}

// Junta linhas quebradas pela largura da página, preservando quebras antes de
// artigos, parágrafos, incisos, alíneas e notas.
export function arrumarTexto(bruto: string): string {
  const linhas = bruto.replace(/\r/g, '').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  const inicioDispositivo = /^(Art\.?\s*\d|§\s*\d|Parágrafo único|[IVXLC]+\s*[-–.)]\s|[a-z]\)\s|\d{1,3}\s*[-–.)]\s|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|ANEXO)/i;
  const saida: string[] = [];
  for (const l of linhas) {
    if (!l) { if (saida.length && saida[saida.length - 1] !== '') saida.push(''); continue; }
    const anterior = saida.length ? saida[saida.length - 1] : '';
    const continuacao = anterior !== '' && !inicioDispositivo.test(l) && /^[a-záéíóúâêôãõç(“"]/.test(l) && !/[.:;]$/.test(anterior);
    const anteriorAberta = anterior !== '' && !inicioDispositivo.test(l) && /[,\-–]$/.test(anterior);
    // Linha anterior longa (quebrada pela largura da página) sem pontuação final: a atual é continuação.
    const terminaEmConectivo = /\b(de|da|do|das|dos|a|o|as|os|e|ou|no|na|nos|nas|em|para|com|que|ao|à|se|sem|sob|por|pelo|pela|pelos|pelas|até|após|entre|sobre|um|uma)$/i.test(anterior);
    const anteriorQuebrada = anterior.length >= 60 && !inicioDispositivo.test(l) && !/[.:;!?”"]$/.test(anterior)
      && (terminaEmConectivo || /^[a-z0-9(“"]/.test(l)) && !(l.length < 80 && l === l.toUpperCase());
    if (continuacao || anteriorAberta || anteriorQuebrada) saida[saida.length - 1] = anterior + ' ' + l;
    else saida.push(l);
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
