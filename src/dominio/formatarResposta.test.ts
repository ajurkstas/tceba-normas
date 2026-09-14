import { describe, expect, it } from 'vitest';
import { formatarRespostaTexto } from './formatarResposta';
import type { Resposta } from './tipos';

describe('formatarRespostaTexto', () => {
  it('formata resposta com norma, observação e opinião', () => {
    const r: Resposta = {
      formato: 'com_norma',
      sintese: 'O prazo é de quinze dias.',
      normas: [{ fonte: 'Regimento Interno, art. 12', vigencia: 'em vigor', texto: 'Art. 12. O prazo é de quinze dias.' }],
      observacao: 'Observação qualquer.',
      opiniao: 'Opinião qualquer.',
    };
    const texto = formatarRespostaTexto('Qual o prazo recursal?', r);
    expect(texto).toContain('Pergunta: Qual o prazo recursal?');
    expect(texto).toContain('Síntese');
    expect(texto).toContain('O prazo é de quinze dias.');
    expect(texto).toContain('Regimento Interno, art. 12');
    expect(texto).toContain('Vigência: em vigor');
    expect(texto).toContain('Observação qualquer.');
    expect(texto).toContain('Opinião qualquer.');
  });

  it('formata resposta sem norma aplicável', () => {
    const r: Resposta = { formato: 'sem_norma', frase: 'Não há regulamentação.' };
    expect(formatarRespostaTexto('X?', r)).toBe('Pergunta: X?\n\nNão há regulamentação.');
  });
});
