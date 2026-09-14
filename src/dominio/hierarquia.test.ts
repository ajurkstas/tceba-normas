import { describe, expect, it } from 'vitest';
import { normalizarNorma, normalizarTipo, ordenarNormas } from './hierarquia';
import type { Norma } from './tipos';
import { montarCorpoAcervo } from './montarCorpoAcervo';

const n = (p: Partial<Norma>): Norma => ({
  id: p.id ?? 'x', tipo: p.tipo ?? 'Resolução Normativa', numero: p.numero ?? '', data: p.data ?? '',
  status: p.status ?? 'vigente', ementa: p.ementa ?? '', obs: p.obs ?? '', link: p.link ?? '', texto: p.texto ?? 't',
});

describe('hierarquia', () => {
  it('normaliza tipos antigos', () => {
    expect(normalizarTipo('Súmula de Jurisprudência')).toBe('Súmula');
    expect(normalizarTipo('Outro')).toBe('Legislação Correlata');
    expect(normalizarTipo('Instrução Normativa')).toBe('Instrução Normativa');
  });

  it('ordena por hierarquia e depois por ano e número', () => {
    const lista = [
      n({ id: 'a', tipo: 'Resolução Normativa', numero: '012/2024' }),
      n({ id: 'b', tipo: 'Lei Orgânica', numero: '05/1991' }),
      n({ id: 'c', tipo: 'Resolução Normativa', numero: '074/2023' }),
      n({ id: 'd', tipo: 'Regimento Interno', numero: '18/1992' }),
    ];
    expect(ordenarNormas(lista).map((x) => x.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('normalizarNorma exige texto', () => {
    expect(normalizarNorma({ tipo: 'Súmula' }, () => 'id')).toBeNull();
    const r = normalizarNorma({ tipo: 'Súmula de Jurisprudência', texto: ' abc ' }, () => 'id');
    expect(r).toMatchObject({ id: 'id', tipo: 'Súmula', texto: 'abc', status: 'vigente' });
  });
});

describe('montarCorpoAcervo', () => {
  it('serializa todas as normas quando cabem no limite', () => {
    const c = montarCorpoAcervo([n({ numero: '1/2020', texto: 'Art. 1' })], 'pergunta');
    expect(c.preSelecionado).toBe(false);
    expect(c.texto).toContain('[1] Resolução Normativa nº 1/2020');
    expect(c.texto).toContain('Art. 1');
  });

  it('pré-seleciona por palavras-chave quando o acervo é grande', () => {
    const grande = 'x'.repeat(150_000);
    const lista = [
      n({ id: 'a', numero: '1/2020', texto: grande + ' prescrição' }),
      n({ id: 'b', numero: '2/2020', texto: grande }),
      n({ id: 'c', numero: '3/2020', texto: grande }),
    ];
    const c = montarCorpoAcervo(lista, 'prazo de prescrição');
    expect(c.preSelecionado).toBe(true);
    expect(c.enviadas).toBeLessThan(3);
    expect(c.texto).toContain('nº 1/2020');
    expect(c.texto).toContain('pré-selecionadas');
  });
});
