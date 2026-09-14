// Estatísticas simples do acervo: quantidade por tipo e ano da norma mais
// antiga e da mais recente, para o usuário perceber se o acervo está defasado.
import type { Norma, TipoAto } from './tipos';
import { TIPOS_ATO } from './tipos';

function anoDe(n: Norma): number | null {
  const doNumero = n.numero.match(/\/(\d{2,4})\s*$/);
  if (doNumero) return doNumero[1].length === 2 ? 1900 + Number(doNumero[1]) : Number(doNumero[1]);
  const daData = n.data.match(/(\d{4})\s*$/);
  return daData ? Number(daData[1]) : null;
}

export interface EstatisticasAcervo {
  total: number;
  porTipo: { tipo: TipoAto; quantidade: number }[];
  anoMaisAntigo: number | null;
  anoMaisRecente: number | null;
}

export function calcularEstatisticas(normas: Norma[]): EstatisticasAcervo {
  const porTipo = TIPOS_ATO
    .map((tipo) => ({ tipo, quantidade: normas.filter((n) => n.tipo === tipo).length }))
    .filter((g) => g.quantidade > 0);

  const anos = normas.map(anoDe).filter((a): a is number => a !== null);

  return {
    total: normas.length,
    porTipo,
    anoMaisAntigo: anos.length ? Math.min(...anos) : null,
    anoMaisRecente: anos.length ? Math.max(...anos) : null,
  };
}
