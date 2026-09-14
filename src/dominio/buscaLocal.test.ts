import { describe, expect, it } from 'vitest';
import { buscarNoAcervo, dividirEmDispositivos, radical, termosDeBusca } from './buscaLocal';
import type { Norma } from './tipos';

const n = (p: Partial<Norma>): Norma => ({
  id: p.id ?? 'x', tipo: p.tipo ?? 'Resolução Normativa', numero: p.numero ?? '1/2020', data: '', status: 'vigente',
  ementa: p.ementa ?? '', obs: '', link: '', texto: p.texto ?? '',
});

describe('termosDeBusca', () => {
  it('remove palavras vazias e reduz a radicais', () => {
    expect(termosDeBusca('Qual o prazo para a prescrição da pretensão punitiva?')).toEqual(['prescri', 'pretens', 'punitiv']);
    expect(radical('recursos')).toBe('recurs');
    expect(radical('apelação')).toBe('apela');
  });
});

describe('dividirEmDispositivos', () => {
  it('quebra por artigo e mantém preâmbulo', () => {
    const d = dividirEmDispositivos('RESOLUÇÃO X\nEmenta.\nArt. 1º Primeiro.\nParágrafo único. Detalhe.\nArt. 2º Segundo.');
    expect(d.map((x) => x.titulo)).toEqual(['RESOLUÇÃO X', 'Art. 1º Primeiro.', 'Art. 2º Segundo.']);
    expect(d[1].texto).toContain('Parágrafo único');
  });
});

describe('buscarNoAcervo', () => {
  it('encontra o artigo mais relacionado e agrupa por norma', () => {
    const normas = [
      n({ id: 'a', tipo: 'Lei Orgânica', numero: '05/1991', texto: 'Art. 1º Competências.\nArt. 2º O prazo de prescrição da pretensão punitiva é de cinco anos.\nArt. 3º Outro assunto.' }),
      n({ id: 'b', texto: 'Art. 1º Dispõe sobre licitações.\nArt. 2º Nada a ver.' }),
    ];
    const r = buscarNoAcervo(normas, 'prescrição da pretensão punitiva');
    expect(r.grupos).toHaveLength(1);
    expect(r.grupos[0].norma.id).toBe('a');
    expect(r.grupos[0].trechos[0].titulo).toMatch(/^Art\. 2º/);
    expect(r.grupos[0].trechos[0].termosEncontrados).toEqual(['prescri', 'pretens', 'punitiv']);
  });

  it('retorna vazio sem termos úteis', () => {
    expect(buscarNoAcervo([n({ texto: 'Art. 1º X' })], 'o que é?').grupos).toHaveLength(0);
  });
});
