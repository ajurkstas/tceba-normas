import { describe, expect, it } from 'vitest';
import { extrairMetadados } from './metadadosNorma';
import { tituloNorma } from './hierarquia';

describe('extrairMetadados', () => {
  it('reconhece resolução normativa do TCE/BA extraída de PDF', () => {
    const m = extrairMetadados([
      'Processos: TCE/004566/2023', 'Colegiado Tribunal Pleno', 'Relator: Conselheiro Fulano',
      'RESOLUÇÃO: 000074/2023',
      'Regulamenta, no âmbito do Tribunal de Contas do Estado da Bahia,',
      'a incidência da prescrição das pretensões punitiva e de',
      'ressarcimento nos processos de controle externo.',
      'O TRIBUNAL DE CONTAS DO ESTADO DA BAHIA, reunido em sessão plenária, no uso',
      'CONSIDERANDO a necessidade;', 'R E S O L V E:', 'Art. 1º. As pretensões.',
      'Art. 11. Esta Resolução entra em vigor na data da sua publicação.',
      'Tribunal de Contas do Estado da Bahia, em 31 de agosto de 2023.',
      'Conselheiro - Assinado em 04/09/2023',
    ].join('\n'));
    expect(m.tipo).toBe('Resolução Normativa');
    expect(m.numero).toBe('074/2023');
    expect(m.data).toBe('31/08/2023');
    expect(m.ementa).toBe('Regulamenta, no âmbito do Tribunal de Contas do Estado da Bahia, a incidência da prescrição das pretensões punitiva e de ressarcimento nos processos de controle externo.');
    expect(m.status).toBe('vigente');
  });

  it('reconhece resolução antiga com número e data no cabeçalho e texto consolidado', () => {
    const m = extrairMetadados('RESOLUÇÃO N.º 18, de 29 de junho de 1992.\nAprova o Regimento Interno do Tribunal de Contas do Estado da Bahia\nO TRIBUNAL DE CONTAS DO ESTADO DA BAHIA, reunido\nRESOLVE:\nArt. 1º Aprovar.\n(Redação dada pela Resolução nº 42/2022)');
    expect(m.tipo).toBe('Regimento Interno');
    expect(m.numero).toBe('018/1992');
    expect(m.data).toBe('29/06/1992');
    expect(m.ementa).toBe('Aprova o Regimento Interno do Tribunal de Contas do Estado da Bahia');
    expect(m.status).toBe('vigente_alteracoes');
  });

  it('reconhece lei complementar', () => {
    const m = extrairMetadados('LEI COMPLEMENTAR Nº 005 DE 04 DE DEZEMBRO DE 1991\nDispõe sobre a Lei Orgânica do Tribunal de Contas do Estado da Bahia e dá outras providências.\nO GOVERNADOR DO ESTADO DA BAHIA, faço saber');
    expect(m.tipo).toBe('Lei Orgânica');
    expect(m.numero).toBe('005/1991');
    expect(m.data).toBe('04/12/1991');
  });

  it('devolve campos vazios sem reconhecimento', () => {
    const m = extrairMetadados('Texto qualquer sem estrutura.');
    expect(m).toEqual({ tipo: undefined, numero: '', data: '', ementa: '', status: 'vigente' });
  });
});

describe('tituloNorma', () => {
  it('retira a fórmula introdutória e apartes', () => {
    expect(tituloNorma({ tipo: 'Regimento Interno', ementa: 'Aprova o Regimento Interno do Tribunal de Contas do Estado da Bahia (texto consolidado)' })).toBe('Regimento Interno do Tribunal de Contas do Estado da Bahia (texto consolidado)');
    expect(tituloNorma({ tipo: 'Lei Orgânica', ementa: 'Dispõe sobre a Lei Orgânica do Tribunal de Contas do Estado da Bahia e dá outras providências.' })).toBe('Lei Orgânica do Tribunal de Contas do Estado da Bahia');
    expect(tituloNorma({ tipo: 'Resolução Normativa', ementa: 'Regulamenta, no âmbito do Tribunal de Contas do Estado da Bahia, a incidência da prescrição das pretensões punitiva e de ressarcimento nos processos de controle externo.' })).toBe('Regulamenta a incidência da prescrição das pretensões punitiva e de ressarcimento nos processos de controle externo');
    expect(tituloNorma({ tipo: 'Súmula', ementa: '' })).toBe('Súmula');
  });
});
