import { describe, expect, it } from 'vitest';
import { parseResposta, tomVigencia } from './parserResposta';

const COMPLETA = `## SINTESE
O prazo é de quinze dias.

## NORMA
FONTE: Regimento Interno, Resolução nº 18/1992, art. 200
VIGENCIA: em vigor
Art. 200. O prazo para interposição é de 15 (quinze) dias.

## NORMA
FONTE: Lei Orgânica, Lei Complementar nº 05/1991, art. 50
VIGENCIA: alterada por Lei Complementar nº 27/2006
Art. 50. Texto original.

## OBSERVACAO
Observação sistemática.

## OPINIAO
Recomendo interpor no prazo.`;

describe('parseResposta', () => {
  it('reconhece resposta completa', () => {
    const r = parseResposta(COMPLETA);
    expect(r.formato).toBe('com_norma');
    if (r.formato !== 'com_norma') return;
    expect(r.sintese).toBe('O prazo é de quinze dias.');
    expect(r.normas).toHaveLength(2);
    expect(r.normas[0].fonte).toBe('Regimento Interno, Resolução nº 18/1992, art. 200');
    expect(r.normas[0].vigencia).toBe('em vigor');
    expect(r.normas[0].texto).toBe('Art. 200. O prazo para interposição é de 15 (quinze) dias.');
    expect(r.normas[1].vigencia).toContain('alterada');
    expect(r.observacao).toBe('Observação sistemática.');
    expect(r.opiniao).toBe('Recomendo interpor no prazo.');
  });

  it('aceita resposta sem observação e sem vigência', () => {
    const r = parseResposta('## SINTESE\nSim.\n\n## NORMA\nFONTE: RN 074/2023, art. 1º\nArt. 1º Texto.');
    expect(r.formato).toBe('com_norma');
    if (r.formato !== 'com_norma') return;
    expect(r.observacao).toBeUndefined();
    expect(r.normas[0].vigencia).toBeUndefined();
    expect(r.normas[0].texto).toBe('Art. 1º Texto.');
  });

  it('reconhece SEM_NORMA', () => {
    const r = parseResposta('## SEM_NORMA\nNão há, nos normativos do TCE/BA carregados neste aplicativo, regulamentação específica sobre a matéria consultada.');
    expect(r.formato).toBe('sem_norma');
    if (r.formato === 'sem_norma') expect(r.frase).toMatch(/^Não há/);
  });

  it('resposta misturada resolve para SEM_NORMA', () => {
    const r = parseResposta('## SINTESE\nAlgo.\n\n## SEM_NORMA\nNão há regulamentação.');
    expect(r.formato).toBe('sem_norma');
  });

  it('texto sem marcadores é inválido', () => {
    const r = parseResposta('Resposta solta sem marcadores.');
    expect(r.formato).toBe('invalido');
  });

  it('tolera negrito nos rótulos', () => {
    const r = parseResposta('## SINTESE\nX.\n\n## NORMA\n**FONTE:** RI art. 1\n**VIGENCIA:** em vigor\nArt. 1.');
    if (r.formato !== 'com_norma') throw new Error('formato inesperado');
    expect(r.normas[0].fonte).toBe('RI art. 1');
    expect(r.normas[0].vigencia).toBe('em vigor');
  });
});

describe('tomVigencia', () => {
  it('classifica os tons', () => {
    expect(tomVigencia('em vigor')).toBe('vigor');
    expect(tomVigencia('alterada por RN 1/2020')).toBe('atencao');
    expect(tomVigencia('incerta (norma ausente)')).toBe('atencao');
    expect(tomVigencia('revogada por RN 2/2021')).toBe('revogada');
    expect(tomVigencia(undefined)).toBe('neutro');
  });
});
