// Consulta ao modelo. Ver _instrucoes/06-integracao-anthropic.md.
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { ModeloId, Norma } from '../dominio/tipos';
import { PROMPT_SISTEMA } from '../dominio/promptSistema';
import { montarCorpoAcervo } from '../dominio/montarCorpoAcervo';
import { lerChave } from './chaveApi';

export class ErroConsulta extends Error {
  constructor(mensagem: string, public readonly codigo: string) {
    super(mensagem);
  }
}

export const ERRO_SEM_CHAVE = 'sem_chave';

function criarCliente(chave: string): Anthropic {
  return new Anthropic({
    apiKey: chave,
    // Roda em WebView/navegador; no Android o tráfego passa pelo CapacitorHttp, sem CORS.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    timeout: 180_000,
  });
}

export function mapearErro(e: unknown): ErroConsulta {
  if (e instanceof ErroConsulta) return e;
  if (e instanceof Anthropic.AuthenticationError) return new ErroConsulta('A chave foi recusada pela Anthropic. Confira em Ajustes.', 'auth');
  if (e instanceof Anthropic.PermissionDeniedError) return new ErroConsulta('Esta chave não tem permissão para usar o modelo escolhido.', 'permissao');
  if (e instanceof Anthropic.RateLimitError) return new ErroConsulta('Limite de uso atingido. Aguarde alguns instantes e tente de novo.', 'limite');
  if (e instanceof Anthropic.BadRequestError) return new ErroConsulta('A consulta não pôde ser processada. Se o acervo for muito grande, refine a pergunta.', 'requisicao');
  if (e instanceof Anthropic.InternalServerError) return new ErroConsulta('A Anthropic está indisponível no momento. Tente novamente em instantes.', 'servidor');
  if (e instanceof Anthropic.APIConnectionError) return new ErroConsulta('Sem conexão. Verifique a internet e tente novamente.', 'conexao');
  return new ErroConsulta('Não foi possível concluir a consulta agora.', 'desconhecido');
}

export interface ResultadoConsulta {
  texto: string;
  interrompida: boolean;   // stop_reason max_tokens
  recusada: boolean;       // stop_reason refusal
  enviadas: number;
  total: number;
  preSelecionado: boolean;
}

export async function consultar(
  normas: Norma[],
  pergunta: string,
  modelo: ModeloId,
  aoReceberTexto: (parcial: string) => void,
  sinal?: AbortSignal,
): Promise<ResultadoConsulta> {
  const chave = await lerChave();
  if (!chave) throw new ErroConsulta('Configure sua chave da API em Ajustes para consultar.', ERRO_SEM_CHAVE);

  const corpo = montarCorpoAcervo(normas, pergunta);
  const cliente = criarCliente(chave);

  const system: TextBlockParam[] = [
    { type: 'text', text: PROMPT_SISTEMA },
    { type: 'text', text: corpo.texto, cache_control: { type: 'ephemeral' } },
  ];

  const suportaEsforco = modelo !== 'claude-haiku-4-5';

  try {
    const stream = cliente.messages.stream(
      {
        model: modelo,
        max_tokens: 8000,
        ...(suportaEsforco ? { thinking: { type: 'adaptive' }, output_config: { effort: 'high' } } : {}),
        system,
        messages: [{ role: 'user', content: `PERGUNTA:\n${pergunta}` }],
      },
      { signal: sinal },
    );

    let acumulado = '';
    stream.on('text', (delta) => {
      acumulado += delta;
      aoReceberTexto(acumulado);
    });

    const final = await stream.finalMessage();
    const texto = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');

    if (import.meta.env.DEV) {
      console.info('uso', {
        cache_read: final.usage.cache_read_input_tokens,
        cache_create: final.usage.cache_creation_input_tokens,
        entrada: final.usage.input_tokens,
        saida: final.usage.output_tokens,
      });
      if (final.stop_reason === 'refusal') console.warn('recusa', final.stop_details?.category);
    }

    return {
      texto,
      interrompida: final.stop_reason === 'max_tokens',
      recusada: final.stop_reason === 'refusal',
      enviadas: corpo.enviadas,
      total: corpo.total,
      preSelecionado: corpo.preSelecionado,
    };
  } catch (e) {
    throw mapearErro(e);
  }
}

export async function testarChave(chave: string): Promise<void> {
  const cliente = criarCliente(chave);
  try {
    await cliente.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'ok' }],
    });
  } catch (e) {
    throw mapearErro(e);
  }
}
