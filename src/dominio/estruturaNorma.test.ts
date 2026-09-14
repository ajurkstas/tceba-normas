import { describe, expect, it } from 'vitest';
import { estruturarTexto, extrairIdentificadorDispositivo, localizarDispositivo, type BlocoDivisao, type BlocoTexto } from './estruturaNorma';

const TEXTO = [
  'RESOLUÇÃO: 000074/2023',
  'Regulamenta, no âmbito do Tribunal,',
  'a incidência da prescrição.',
  'O TRIBUNAL DE CONTAS DO ESTADO DA BAHIA, reunido em sessão plenária, no uso',
  'de sua competência;',
  'CONSIDERANDO a evolução de entendimento do Supremo Tribunal Federal, que',
  'consolidou a interpretação;',
  'CONSIDERANDO a necessidade de estabelecer critérios;',
  'R E S O L V E:',
  'CAPÍTULO I',
  'DAS DISPOSIÇÕES PRELIMINARES',
  'Art. 1º. As pretensões punitiva e ressarcitória ficam sujeitas à',
  'prescrição.',
  'CAPÍTULO II',
  'DA PRESCRIÇÃO',
  'Seção I',
  'Dos prazos da prescrição',
  'Art. 3º. Prescrevem em cinco anos:',
  'I – a data da apresentação;',
  'II – a data em que as contas deveriam ter sido prestadas, no caso de omissão de prestação',
  'de contas;',
  '§ 1º. Com exceção do disposto no inciso III.',
].join('\n');

describe('estruturarTexto', () => {
  const blocos = estruturarTexto(TEXTO, 'Regulamenta, no âmbito do Tribunal, a incidência da prescrição.');
  const textos = blocos.filter((b): b is BlocoTexto => b.tipo !== 'divisao');

  it('identifica cabeçalho, ementa, preâmbulo e considerandos separados', () => {
    expect(textos[0]).toEqual({ tipo: 'cabecalho', texto: 'RESOLUÇÃO: 000074/2023' });
    expect(textos[1]).toEqual({ tipo: 'ementa', texto: 'Regulamenta, no âmbito do Tribunal, a incidência da prescrição.' });
    expect(textos[2].texto).toBe('O TRIBUNAL DE CONTAS DO ESTADO DA BAHIA, reunido em sessão plenária, no uso de sua competência;');
    const considerandos = textos.filter((b) => b.tipo === 'considerando');
    expect(considerandos).toHaveLength(2);
    expect(considerandos[0].texto).toContain('que consolidou a interpretação;');
  });

  it('aninha capítulos e seções com subtítulo e junta linhas quebradas', () => {
    const divisoes = blocos.filter((b): b is BlocoDivisao => b.tipo === 'divisao');
    expect(divisoes.map((d) => d.titulo)).toEqual(['CAPÍTULO I', 'CAPÍTULO II']);
    expect(divisoes[0].subtitulo).toBe('DAS DISPOSIÇÕES PRELIMINARES');
    expect(divisoes[0].filhos[0]).toEqual({ tipo: 'artigo', texto: 'Art. 1º. As pretensões punitiva e ressarcitória ficam sujeitas à prescrição.' });
    const secao = divisoes[1].filhos.find((b): b is BlocoDivisao => b.tipo === 'divisao')!;
    expect(secao.titulo).toBe('Seção I');
    expect(secao.subtitulo).toBe('Dos prazos da prescrição');
    const tipos = secao.filhos.map((b) => b.tipo);
    expect(tipos).toEqual(['artigo', 'inciso', 'inciso', 'paragrafo']);
    expect((secao.filhos[2] as BlocoTexto).texto).toMatch(/omissão de prestação de contas;$/);
  });

  it('funciona sem ementa cadastrada', () => {
    const b = estruturarTexto('Art. 1º Texto.\nI - um;\nII - dois.');
    expect(b.map((x) => x.tipo)).toEqual(['artigo', 'inciso', 'inciso']);
  });
});

describe('extrairIdentificadorDispositivo', () => {
  it('extrai artigo, parágrafo, inciso e alínea de uma citação', () => {
    expect(extrairIdentificadorDispositivo('Resolução Normativa nº 074/2023, art. 12, § 2º, inciso III')).toEqual({
      artigo: 12, paragrafo: 2, paragrafoUnico: undefined, inciso: 'III', alinea: undefined,
    });
  });

  it('reconhece parágrafo único', () => {
    expect(extrairIdentificadorDispositivo('Lei Orgânica nº 05/1991, art. 5º, parágrafo único')).toMatchObject({ artigo: 5, paragrafoUnico: true });
  });

  it('retorna null sem nenhum dispositivo identificável', () => {
    expect(extrairIdentificadorDispositivo('Resolução Normativa nº 074/2023')).toBeNull();
  });
});

describe('localizarDispositivo', () => {
  const blocos = estruturarTexto([
    'Art. 3º. Prescrevem em cinco anos:',
    'I – a data da apresentação;',
    'II – a data em que as contas deveriam ter sido prestadas;',
    '§ 1º. Com exceção do disposto no inciso III.',
    'Art. 4º. Outro artigo.',
    'Parágrafo único. Texto do parágrafo único.',
  ].join('\n'));

  it('localiza o artigo pelo número', () => {
    const i = localizarDispositivo(blocos, { artigo: 4 });
    expect(blocos[i!]).toMatchObject({ tipo: 'artigo', texto: expect.stringContaining('Art. 4') });
  });

  it('localiza o inciso dentro do artigo correto', () => {
    const i = localizarDispositivo(blocos, { artigo: 3, inciso: 'II' });
    expect((blocos[i!] as BlocoTexto).texto).toContain('contas deveriam ter sido prestadas');
  });

  it('localiza parágrafo único de um artigo específico', () => {
    const i = localizarDispositivo(blocos, { artigo: 4, paragrafoUnico: true });
    expect((blocos[i!] as BlocoTexto).texto).toContain('parágrafo único');
  });

  it('recua para o artigo quando o parágrafo pedido não existe nele', () => {
    const i = localizarDispositivo(blocos, { artigo: 4, paragrafo: 9 });
    expect(blocos[i!]).toMatchObject({ tipo: 'artigo' });
  });

  it('retorna null quando o artigo não existe no texto', () => {
    expect(localizarDispositivo(blocos, { artigo: 99 })).toBeNull();
  });
});
