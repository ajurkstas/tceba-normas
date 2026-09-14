import { describe, expect, it } from 'vitest';
import { textoParaMarkdown } from './normaParaMarkdown';

describe('textoParaMarkdown', () => {
  it('destaca artigos, capítulos e incisos e preserva quebras de linha', () => {
    const md = textoParaMarkdown('CAPÍTULO I\nDAS DISPOSIÇÕES\nArt. 1º Texto do artigo.\nI - inciso;\nII - outro.\n§ 1º Parágrafo.\nLinha solta um\nLinha solta dois');
    expect(md).toContain('## CAPÍTULO I');
    expect(md).toContain('### Art. 1º');
    expect(md).toContain('Texto do artigo.');
    expect(md).toContain('> I - inciso;  ');
    expect(md).toContain('§ 1º Parágrafo.  ');
    expect(md).toContain('Linha solta um  \nLinha solta dois');
  });
});
