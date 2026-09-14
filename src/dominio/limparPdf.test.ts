import { describe, expect, it } from 'vitest';
import { arrumarTexto, limparPaginas, type PaginaPdf } from './limparPdf';

const linha = (texto: string, y: number, altura = 11) => ({ texto, y, altura });

describe('limparPaginas', () => {
  it('remove cabeçalho e rodapé repetidos, paginação e assinatura, e mantém notas', () => {
    const paginas: PaginaPdf[] = [
      { linhas: [
        linha('TRIBUNAL DE CONTAS DO ESTADO DA BAHIA', 0.04, 9),
        linha('RESOLUÇÃO Nº 18, de 29 de junho de 1992.', 0.15),
        linha('Art. 1º Aprovar o Regimento Interno.1', 0.3),
        linha('Art. 2º Esta Resolução entra em vigor.', 0.4),
        linha('1 Publicada no DOE de 30/06/1992.', 0.9, 8),
        linha('Página 1 de 2', 0.96, 8),
        linha('Documento assinado eletronicamente por FULANO, em 01/01/2020.', 0.5, 7),
      ] },
      { linhas: [
        linha('TRIBUNAL DE CONTAS DO ESTADO DA BAHIA', 0.04, 9),
        linha('Art. 3º Revogam-se as disposições em contrário.', 0.2),
        linha('Página 2 de 2', 0.96, 8),
        linha('www.tce.ba.gov.br', 0.97, 8),
      ] },
    ];
    const r = limparPaginas(paginas);
    expect(r).not.toContain('TRIBUNAL DE CONTAS DO ESTADO');
    expect(r).not.toContain('Página');
    expect(r).not.toContain('assinado eletronicamente');
    expect(r).not.toContain('www.');
    expect(r).toContain('Art. 1º Aprovar o Regimento Interno.1');
    expect(r).toContain('1 Publicada no DOE de 30/06/1992.');
    expect(r).toContain('Art. 3º');
  });

  it('não remove título único que está no topo da primeira página', () => {
    const r = limparPaginas([{ linhas: [linha('LEI COMPLEMENTAR Nº 005', 0.05, 12), linha('Art. 1º X.', 0.3)] }]);
    expect(r).toContain('LEI COMPLEMENTAR Nº 005');
  });
});

describe('arrumarTexto', () => {
  it('junta linhas quebradas e preserva dispositivos', () => {
    const r = arrumarTexto('Art. 1º O prazo para\ninterposição é de\nquinze dias.\n§ 1º Detalhe.\nI - inciso um;\nII - inciso dois.');
    expect(r).toBe('Art. 1º O prazo para interposição é de quinze dias.\n§ 1º Detalhe.\nI - inciso um;\nII - inciso dois.');
  });
});

describe('assinaturas', () => {
  it('descarta o quadro de assinaturas e corta carimbo lateral preservando o texto', () => {
    const r = limparPaginas([
      { linhas: [
        linha('Art. 1º Texto da norma que continua Este documento foi assinado eletronicamente. As assinaturas estão na última página.', 0.3),
        linha('Tribunal de Contas do Estado da Bahia, em 31 de agosto de 2023.', 0.4),
      ] },
      { linhas: [
        linha('Quadro de Assinaturas', 0.06, 12),
        linha('Este documento foi assinado eletronicamente por:', 0.08),
        linha('Fulano de Tal', 0.12),
        linha('Conselheiro - Assinado em 04/09/2023', 0.13),
        linha('Sua autenticidade pode ser verificada no Portal', 0.6),
      ] },
    ]);
    expect(r).toBe('Art. 1º Texto da norma que continua\nTribunal de Contas do Estado da Bahia, em 31 de agosto de 2023.');
  });
});
