// Formata uma Resposta já interpretada como texto simples, para copiar ou
// compartilhar (ex.: juntar a um processo administrativo). Não reinterpreta o
// conteúdo; apenas reorganiza os blocos já produzidos pelo parser.
import type { Resposta } from './tipos';

export function formatarRespostaTexto(pergunta: string, resposta: Resposta): string {
  const linhas: string[] = [`Pergunta: ${pergunta}`, ''];

  if (resposta.formato === 'invalido') {
    linhas.push(resposta.bruto);
    return linhas.join('\n').trim();
  }

  if (resposta.formato === 'sem_norma') {
    linhas.push(resposta.frase);
    return linhas.join('\n').trim();
  }

  if (resposta.sintese) {
    linhas.push('Síntese', resposta.sintese, '');
  }
  for (const n of resposta.normas) {
    linhas.push(n.fonte || 'Fonte não identificada');
    if (n.vigencia) linhas.push(`Vigência: ${n.vigencia}`);
    linhas.push(n.texto, '');
  }
  if (resposta.observacao) {
    linhas.push('Observação interpretativa (não normativa)', resposta.observacao, '');
  }
  if (resposta.opiniao) {
    linhas.push('Opinião (posição pessoal, não normativa)', resposta.opiniao, '');
  }
  return linhas.join('\n').trim();
}
