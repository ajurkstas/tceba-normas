// Consulta ao modelo. Ver _instrucoes/06-integracao-anthropic.md.
import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageCreateParamsNonStreaming, TextBlockParam } from '@anthropic-ai/sdk/resources/messages';
import type { ModeloId, Norma } from '../dominio/tipos';
import { PROMPT_SISTEMA } from '../dominio/promptSistema';
import { montarCorpoAcervo } from '../dominio/montarCorpoAcervo';
import { lerChave } from './chaveApi';

export class ErroConsulta extends Error {
  constructor(mensagem: string, public readonly codigo: string, public readonly detalhes?: string) {
    super(mensagem);
  }
}

export const ERRO_SEM_CHAVE = 'sem_chave';

function criarCliente(chave: string): Anthropic {
  return new Anthropic({
    apiKey: chave,
    // Roda em WebView/navegador. O SDK envia o cabeçalho que libera CORS na API.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    timeout: 180_000,
  });
}

// Nunca deixa uma chave escapar em mensagens de erro ou logs.
function ocultarChave(texto: string): string {
  return texto.replace(/sk-ant-[A-Za-z0-9_-]+/g, 'sk-ant-***');
}

function detalhesDe(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    const corpo = e.error as { error?: { type?: string; message?: string } } | undefined;
    const msg = corpo?.error?.message ?? e.message;
    return ocultarChave(`HTTP ${e.status ?? '?'}${corpo?.error?.type ? ' ' + corpo.error.type : ''}: ${msg}`);
  }
  if (e instanceof Error) return ocultarChave(`${e.name}: ${e.message}`);
  return ocultarChave(String(e));
}

export function mapearErro(e: unknown): ErroConsulta {
  if (e instanceof ErroConsulta) return e;
  const d = detalhesDe(e);
  if (e instanceof Anthropic.AuthenticationError) return new ErroConsulta('A chave foi recusada pela Anthropic. Confira em Ajustes.', 'auth', d);
  if (e instanceof Anthropic.PermissionDeniedError) return new ErroConsulta('Esta chave não tem permissão para usar o modelo escolhido.', 'permissao', d);
  if (e instanceof Anthropic.RateLimitError) return new ErroConsulta('Limite de uso atingido. Aguarde alguns instantes e tente de novo.', 'limite', d);
  if (e instanceof Anthropic.BadRequestError) return new ErroConsulta('A Anthropic rejeitou a requisição. Veja os detalhes técnicos.', 'requisicao', d);
  if (e instanceof Anthropic.NotFoundError) return new ErroConsulta('O modelo escolhido não foi encontrado. Escolha outro em Ajustes.', 'modelo', d);
  if (e instanceof Anthropic.InternalServerError) return new ErroConsulta('A Anthropic está indisponível no momento. Tente novamente em instantes.', 'servidor', d);
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new ErroConsulta('A consulta demorou demais e foi interrompida. Tente novamente.', 'tempo', d);
  if (e instanceof Anthropic.APIConnectionError) return new ErroConsulta('Sem conexão com api.anthropic.com. Verifique a internet e tente novamente.', 'conexao', d);
  if (e instanceof Anthropic.APIUserAbortError || (e instanceof Error && e.name === 'AbortError')) return new ErroConsulta('Consulta cancelada.', 'cancelada', d);
  return new ErroConsulta('Não foi possível concluir a consulta agora.', 'desconhecido', d);
}

export interface ResultadoConsulta {
  texto: string;
  interrompida: boolean;   // stop_reason max_tokens
  recusada: boolean;       // stop_reason refusal
  enviadas: number;
  total: number;
  preSelecionado: boolean;
}

function montarParametros(modelo: ModeloId, corpoAcervo: string, pergunta: string): MessageCreateParamsNonStreaming {
  const system: TextBlockParam[] = [
    { type: 'text', text: PROMPT_SISTEMA },
    { type: 'text', text: corpoAcervo, cache_control: { type: 'ephemeral' } },
  ];
  const suportaEsforco = modelo !== 'claude-haiku-4-5';
  return {
    model: modelo,
    max_tokens: 8000,
    ...(suportaEsforco ? { thinking: { type: 'adaptive' }, output_config: { effort: 'high' } } : {}),
    system,
    messages: [{ role: 'user', content: `PERGUNTA:\n${pergunta}` }],
  };
}

function textoDe(m: Message): string {
  return m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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
  const params = montarParametros(modelo, corpo.texto, pergunta);

  let final: Message;
  try {
    // Preferência: streaming. Se o ambiente não suportar (WebView antigo, proxy), cai para a chamada simples.
    let acumulado = '';
    const stream = cliente.messages.stream(params, { signal: sinal });
    stream.on('text', (delta) => {
      acumulado += delta;
      aoReceberTexto(acumulado);
    });
    final = await stream.finalMessage();
  } catch (e) {
    const erroStream = mapearErro(e);
    const tentarSemStream = erroStream.codigo === 'desconhecido' || erroStream.codigo === 'conexao';
    if (!tentarSemStream || sinal?.aborted) throw erroStream;
    if (import.meta.env.DEV) console.warn('streaming falhou, tentando sem streaming', erroStream.detalhes);
    try {
      final = await cliente.messages.create(params, { signal: sinal });
    } catch (e2) {
      const erro2 = mapearErro(e2);
      throw new ErroConsulta(erro2.message, erro2.codigo, `${erro2.detalhes ?? ''}\n(streaming: ${erroStream.detalhes ?? ''})`.trim());
    }
  }

  const texto = textoDe(final);
  if (import.meta.env.DEV) {
    console.info('uso', {
      cache_read: final.usage.cache_read_input_tokens,
      cache_create: final.usage.cache_creation_input_tokens,
      entrada: final.usage.input_tokens,
      saida: final.usage.output_tokens,
      parada: final.stop_reason,
    });
  }
  if (!texto && final.stop_reason !== 'refusal') {
    throw new ErroConsulta('A Anthropic respondeu sem texto.', 'vazia', `stop_reason=${final.stop_reason}`);
  }

  return {
    texto,
    interrompida: final.stop_reason === 'max_tokens',
    recusada: final.stop_reason === 'refusal',
    enviadas: corpo.enviadas,
    total: corpo.total,
    preSelecionado: corpo.preSelecionado,
  };
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
