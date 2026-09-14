import { describe, expect, it } from 'vitest';
import { calcularEstatisticas } from './estatisticasAcervo';
import type { Norma } from './tipos';

const n = (p: Partial<Norma>): Norma => ({
  id: p.id ?? 'x', tipo: p.tipo ?? 'Resolução Normativa', numero: p.numero ?? '', data: p.data ?? '',
  status: p.status ?? 'vigente', ementa: p.ementa ?? '', obs: p.obs ?? '', link: p.link ?? '', texto: p.texto ?? 't',
});

describe('calcularEstatisticas', () => {
  it('conta normas por tipo e identifica o ano mais antigo e o mais recente', () => {
    const lista = [
      n({ tipo: 'Lei Orgânica', numero: '05/1991' }),
      n({ tipo: 'Resolução Normativa', numero: '074/2023' }),
      n({ tipo: 'Resolução Normativa', numero: '012/2024' }),
    ];
    const est = calcularEstatisticas(lista);
    expect(est.total).toBe(3);
    expect(est.porTipo).toEqual([
      { tipo: 'Lei Orgânica', quantidade: 1 },
      { tipo: 'Resolução Normativa', quantidade: 2 },
    ]);
    expect(est.anoMaisAntigo).toBe(1991);
    expect(est.anoMaisRecente).toBe(2024);
  });

  it('usa a data quando o número não traz o ano', () => {
    const lista = [n({ numero: 's/n', data: '12/04/2020' })];
    expect(calcularEstatisticas(lista).anoMaisAntigo).toBe(2020);
  });

  it('acervo vazio não quebra', () => {
    const est = calcularEstatisticas([]);
    expect(est).toEqual({ total: 0, porTipo: [], anoMaisAntigo: null, anoMaisRecente: null });
  });
});
