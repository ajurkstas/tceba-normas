import { describe, expect, it } from 'vitest';
import { encontrarNormaReferida, extrairReferencia, referenciaCruzadaQuebrada } from './localizarNorma';
import type { Norma } from './tipos';

const n = (p: Partial<Norma>): Norma => ({
  id: p.id ?? 'x', tipo: p.tipo ?? 'Resolução Normativa', numero: p.numero ?? '', data: p.data ?? '',
  status: p.status ?? 'vigente', ementa: p.ementa ?? '', obs: p.obs ?? '', link: p.link ?? '', texto: p.texto ?? 't',
});

describe('extrairReferencia', () => {
  it('extrai tipo e número de um texto de fonte', () => {
    expect(extrairReferencia('Resolução Normativa nº 074/2023, art. 5º')).toEqual({ tipo: 'Resolução Normativa', numero: '074/2023' });
  });

  it('reconhece abreviações', () => {
    expect(extrairReferencia('RN nº 12/2024')).toEqual({ tipo: 'Resolução Normativa', numero: '12/2024' });
  });

  it('retorna null sem tipo nem número reconhecíveis', () => {
    expect(extrairReferencia('vide portal de legislação')).toBeNull();
  });
});

describe('encontrarNormaReferida', () => {
  const acervo = [
    n({ id: 'a', tipo: 'Resolução Normativa', numero: '074/2023' }),
    n({ id: 'b', tipo: 'Instrução Normativa', numero: '003/2024' }),
  ];

  it('localiza por tipo e número', () => {
    expect(encontrarNormaReferida(acervo, 'Resolução Normativa nº 074/2023, art. 5º')?.id).toBe('a');
  });

  it('não localiza quando o número não está no acervo', () => {
    expect(encontrarNormaReferida(acervo, 'Resolução Normativa nº 144/2024')).toBeUndefined();
  });

  it('exige número; tipo sozinho não basta', () => {
    expect(encontrarNormaReferida(acervo, 'conforme a Resolução Normativa')).toBeUndefined();
  });
});

describe('referenciaCruzadaQuebrada', () => {
  it('acusa quando obs cita norma revogadora ausente do acervo', () => {
    const norma = n({ id: 'a', obs: 'Revogada pela Resolução Normativa nº 144/2024' });
    expect(referenciaCruzadaQuebrada(norma, [norma])).toBe(true);
  });

  it('não acusa quando a norma revogadora está cadastrada', () => {
    const norma = n({ id: 'a', obs: 'Revogada pela Resolução Normativa nº 144/2024' });
    const revogadora = n({ id: 'b', tipo: 'Resolução Normativa', numero: '144/2024' });
    expect(referenciaCruzadaQuebrada(norma, [norma, revogadora])).toBe(false);
  });

  it('ignora obs que não menciona revogação ou alteração', () => {
    const norma = n({ id: 'a', obs: 'Texto consolidado com as alterações posteriores' });
    expect(referenciaCruzadaQuebrada(norma, [norma])).toBe(false);
  });

  it('ignora obs sem norma identificável', () => {
    const norma = n({ id: 'a', obs: 'Revogada parcialmente por norma posterior não especificada' });
    expect(referenciaCruzadaQuebrada(norma, [norma])).toBe(false);
  });
});
