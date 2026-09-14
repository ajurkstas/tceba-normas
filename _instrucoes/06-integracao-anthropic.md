# 06. Integração com a API da Anthropic

## Cliente

Usar `@anthropic-ai/sdk` (TypeScript). Nunca `fetch` manual para `api.anthropic.com`. O cliente é criado por consulta, com a chave lida de `chaveApi.ts`, e descartado ao final:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { Capacitor } from "@capacitor/core";

function criarCliente(chave: string) {
  return new Anthropic({
    apiKey: chave,
    // Necessário porque o código roda em WebView/navegador, não em servidor.
    // No Android o tráfego passa pelo CapacitorHttp (camada nativa), sem CORS.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    timeout: 120_000, // milissegundos no SDK TypeScript
  });
}
```

`CapacitorHttp` fica desabilitado em `capacitor.config.ts` (`plugins.CapacitorHttp.enabled: false`): o patch de `fetch` do plugin não suporta streaming e quebra o SDK. O `fetch` nativo do WebView funciona direto com api.anthropic.com porque o SDK envia o cabeçalho `anthropic-dangerous-direct-browser-access`, que libera CORS. Se o streaming falhar por motivo de rede (erro `conexao` ou `desconhecido`), `consultar` tenta uma segunda vez sem streaming (`messages.create`) antes de desistir.

## Modelo

- Padrão: `claude-opus-5`. É a melhor escolha para a tarefa de percorrer o acervo inteiro e transcrever com fidelidade.
- Opções em Ajustes: `claude-opus-5` (padrão), `claude-sonnet-5` (mais rápido e barato), `claude-haiku-4-5` (mais barato; usar só para testes). Somente estes três identificadores, sem sufixo de data.
- Não usar identificadores antigos (`claude-sonnet-4-6` do `index.html` atual é substituído).

## Parâmetros da chamada

```ts
const stream = cliente.messages.stream({
  model: modelo,
  max_tokens: 8000,
  thinking: { type: "adaptive" },          // Opus 5 já liga por padrão; explícito para Sonnet 5
  output_config: { effort: "high" },       // fidelidade acima de velocidade
  system: [
    { type: "text", text: PROMPT_SISTEMA },
    { type: "text", text: corpoAcervo, cache_control: { type: "ephemeral" } },
  ],
  messages: [{ role: "user", content: `PERGUNTA:\n${pergunta}` }],
});
```

- Streaming sempre (`messages.stream`), porque a entrada é grande. Renderizar o texto conforme chega (`stream.on("text", ...)`) e fechar com `await stream.finalMessage()`.
- `haiku-4-5` não aceita `thinking: adaptive` nem `output_config.effort`; para ele, omitir os dois campos.
- Não usar prefill de mensagem `assistant`: rejeitado nos modelos atuais.
- Não usar `temperature`: removido nos modelos atuais.

## Contexto de conversa (perguntas de acompanhamento)

A tela Consulta mantém, em memória (estado React, nunca persistido além do histórico normal), os turnos já respondidos pela IA na sessão atual: pergunta e texto bruto da resposta. A cada nova consulta, `consultar` (`servicos/anthropic.ts`) monta `messages` com esses turnos anteriores (até `MAX_TURNOS_CONTEXTO`, hoje 6) intercalando `user`/`assistant`, seguidos da pergunta atual, permitindo "e no caso de férias?" sem repetir o contexto por escrito. O `system` (prompt e acervo cacheado) não muda: a regra de fidelidade documental e o acervo disponível são os mesmos em toda pergunta da sessão, só o histórico de mensagens cresce. Reiniciar a consulta ("Nova consulta") limpa o contexto do lado do app; a API não guarda estado entre chamadas.

## Cache do acervo

O acervo serializado não muda entre consultas e é grande (o Regimento Interno sozinho passa de 170 mil caracteres). Ele vai no `system` como segundo bloco com `cache_control`, depois de `PROMPT_SISTEMA`, e antes da pergunta. Isso faz as consultas seguintes ao mesmo acervo pagarem só a leitura do cache. Regras para o cache funcionar:

- A serialização é determinística: normas ordenadas por hierarquia e depois por número; sem data/hora, sem contadores e sem identificadores aleatórios no texto.
- O aviso de pré-seleção por volume é acrescentado só quando ocorre; quando ocorre, o conjunto de normas varia com a pergunta e o cache naturalmente não se aproveita.
- Registrar em console de desenvolvimento `usage.cache_read_input_tokens` e `usage.cache_creation_input_tokens` da mensagem final para conferir.

## Mapeamento de erros para o usuário

Usar as classes tipadas do SDK, da mais específica para a mais geral. A mensagem principal é curta; os detalhes técnicos (status HTTP, tipo e mensagem da API) vão em `ErroConsulta.detalhes`, exibidos em um bloco expansível "Detalhes técnicos", sempre passando por `ocultarChave` para nunca expor `sk-ant-...`.

| Erro do SDK | Mensagem |
|---|---|
| `AuthenticationError` (401) | A chave foi recusada pela Anthropic. Confira em Ajustes. |
| `PermissionDeniedError` (403) | Esta chave não tem permissão para usar o modelo escolhido. |
| `RateLimitError` (429) | Limite de uso atingido. Aguarde alguns instantes e tente de novo. |
| `BadRequestError` (400) | A Anthropic rejeitou a requisição. Veja os detalhes técnicos. |
| `NotFoundError` (404) | O modelo escolhido não foi encontrado. Escolha outro em Ajustes. |
| `APIConnectionTimeoutError` | A consulta demorou demais e foi interrompida. Tente novamente. |
| `InternalServerError` (5xx) | A Anthropic está indisponível no momento. Tente novamente em instantes. |
| `APIConnectionError` | Sem conexão com api.anthropic.com. Verifique a internet e tente novamente. |
| `APIUserAbortError` | Consulta cancelada. |
| outro | Não foi possível concluir a consulta agora. |

Se `stop_reason` for `refusal`, exibir "O modelo recusou processar esta consulta." e registrar `stop_details.category` só em console de desenvolvimento. Se `stop_reason` for `max_tokens`, exibir o que veio e o aviso "A resposta foi interrompida por tamanho; refine a pergunta."

## Teste de chave (Ajustes)

`testarChave(chave)` cria o cliente e chama `messages.create` com `model: "claude-haiku-4-5"`, `max_tokens: 16`, mensagem "ok", sem `system`. Retorna sucesso ou o erro mapeado pela tabela acima. Não usa streaming e não passa pelo acervo.

## Teste de conectividade (Ajustes)

`testarConectividade()` verifica só o alcance da rede até a Anthropic, sem avaliar se a chave é válida (isso é `testarChave`, acima). Usa a chave configurada, ou uma string qualquer no formato esperado quando não há chave (o pedido falha por autenticação, mas isso já prova que o servidor foi alcançado). Chama `cliente.models.list({ limit: 1 })`; qualquer resposta HTTP da API, mesmo erro de autenticação, conta como "conectado". Só `APIConnectionError` e `APIConnectionTimeoutError` (mapeados para os códigos `conexao` e `tempo`) contam como sem conexão. Nunca usa `fetch` manual, pelo mesmo motivo do restante desta integração.

## O que não fazer

- Não embutir a chave no worker nem o worker no app. `worker/` é legado da versão web e pode ser removido quando a versão React estiver publicada.
- Não enviar o acervo em `messages`; ele fica em `system` para o cache.
- Não truncar o texto das normas silenciosamente. Se o acervo estourar o limite (`07-acervo-e-dados.md`), a pré-seleção é anunciada ao usuário.
