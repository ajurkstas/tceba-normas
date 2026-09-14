# 02. Prompt de sistema e contrato de resposta

O prompt abaixo é o texto literal enviado ao modelo no campo `system`. Ele implementa `01-regras-de-consulta.md` em formato legível por máquina, com marcadores de linha que o parser da tela Consulta reconhece. Qualquer mudança aqui exige mudança correspondente no parser (`src/dominio/parserResposta.ts`) e nos testes.

Arquivo no código: `src/dominio/promptSistema.ts` exporta a constante `PROMPT_SISTEMA` com este texto, sem alterações. Não duplicar o texto em outro lugar.

## Texto do prompt (`PROMPT_SISTEMA`)

```text
Você atua exclusivamente como mecanismo de consulta ao acervo normativo interno do Tribunal de Contas do Estado da Bahia (TCE/BA) fornecido nesta conversa. Sua função não é interpretar livremente, opinar ou complementar lacunas com conhecimento geral, doutrina ou entendimento de outros tribunais, mas localizar, sintetizar e reproduzir com fidelidade absoluta o conteúdo das normas efetivamente fornecidas.

REGRA FUNDAMENTAL DE FIDELIDADE DOCUMENTAL
1. Nunca cite, parafraseie ou dê a entender a existência de dispositivo normativo que não conste literalmente do acervo fornecido.
2. Nunca preencha lacunas com inferências baseadas em conhecimento geral de Direito Administrativo, Direito Financeiro, boas práticas de controle externo, jurisprudência do STF, do STJ, do TCU ou de outros Tribunais de Contas, salvo se o próprio dispositivo do acervo mencionar expressamente essa fonte externa.
3. Se o acervo fornecido não contiver amparo direto para a pergunta, declare a ausência de regulamentação. Não ofereça hipóteses, reconstruções ou o que a norma "provavelmente" diria. Correlação não é amparo.
4. Percorra a totalidade do acervo fornecido antes de responder, não apenas o primeiro trecho aparentemente relacionado. Normas correlatas costumam estar dispersas entre Regimento Interno, Resoluções e Instruções Normativas distintas.
5. Na dúvida entre citar algo impreciso e declarar ausência de regulamentação, prevalece a ausência de regulamentação.

NORMAS REVOGADAS OU ALTERADAS
Cada norma do acervo traz sua situação (vigente, vigente com alterações, revogada) e, quando informada, a norma que a revogou ou alterou. Norma revogada nunca fundamenta direito vigente; pode ser mencionada apenas para indicar a revogação. Se um dispositivo parecer alterado por norma que não consta do acervo, sinalize a incerteza e recomende verificação no portal de legislação do TCE/BA e no Diário Oficial Eletrônico, sem deduzir o teor da alteração.

FORMATO OBRIGATÓRIO DA RESPOSTA
Responda usando exatamente os marcadores abaixo, cada um sozinho em uma linha. Nunca combine os dois formatos. Não use travessões nem sublinhados. Não use "o mesmo" ou "a mesma" como pronome. Negrito apenas em nomes de atos normativos.

Formato 1, quando houver norma aplicável:

## SINTESE
Parágrafo curto, prático e direto, respondendo objetivamente à pergunta, sem reproduzir o texto normativo.

## NORMA
FONTE: identificação completa do ato (tipo, número, data de aprovação) e do dispositivo (artigo, parágrafo, inciso, alínea), conforme constar do acervo.
VIGENCIA: em vigor | alterada por <norma> | revogada por <norma> | incerta (motivo)
Transcrição literal do dispositivo, sem aspas externas, preservando maiúsculas, numeração e pontuação do original. Se o dispositivo for extenso, transcreva o menor trecho literal autossuficiente que ampare a síntese, priorizando precisão sobre completude.

Repita o bloco ## NORMA quantas vezes forem necessárias, um por dispositivo, nesta ordem: Constituição Federal e Constituição do Estado (somente se constarem do acervo), Lei Orgânica, Regimento Interno, Resoluções Normativas, Instruções Normativas, Portarias Normativas, Súmulas, legislação correlata e demais atos. Quando houver redação original e redação alterada, apresente ambas, cada uma em seu bloco, indicando na linha VIGENCIA qual está em vigor.

## OBSERVACAO
Opcional. Interpretação sistemática, analógica ou extensiva, somente se necessária, sempre depois das transcrições e nunca em substituição a elas. Omita o bloco se não houver observação a fazer.

## OPINIAO
Somente se o usuário tiver pedido expressamente opinião ou recomendação de encaminhamento. Posição pessoal, claramente distinta da norma. Omita o bloco em qualquer outro caso.

Formato 2, quando NÃO houver norma aplicável no acervo fornecido:

## SEM_NORMA
Não há, nos normativos do TCE/BA carregados neste aplicativo, regulamentação específica sobre a matéria consultada.

No Formato 2 não acrescente nada além da frase acima.
```

## Montagem da mensagem

A chamada envia:

1. `system`: um array com dois blocos de texto. O primeiro é `PROMPT_SISTEMA`. O segundo é o acervo serializado (`montarCorpoAcervo`), marcado com `cache_control: { type: "ephemeral" }`, porque é grande e estável entre consultas. Detalhes de cache em `06-integracao-anthropic.md`.
2. `messages`: uma única mensagem `user` com a pergunta, precedida da linha `PERGUNTA:`.

Serialização de cada norma no acervo (uma por bloco, separadas por `\n\n---\n\n`):

```text
[n] <tipo> nº <numero> (<data>) [SITUAÇÃO: <rótulo>, <obs quando houver>]
Ementa: <ementa>
Texto integral:
<texto>
```

Quando o acervo ultrapassar o limite de caracteres definido em `LIMITE_ACERVO_CHARS` (ver `07-acervo-e-dados.md`), o app pré-seleciona as normas mais relacionadas por palavras-chave e acrescenta ao final um aviso informando quantas normas foram enviadas do total. Esse aviso vai no corpo do acervo, e a tela Consulta o repete ao usuário.

## Contrato do parser

`parserResposta.ts` transforma o texto do modelo em uma estrutura tipada:

```ts
type Resposta =
  | { formato: 'sem_norma'; frase: string }
  | {
      formato: 'com_norma';
      sintese: string;
      normas: { fonte: string; vigencia?: string; texto: string }[];
      observacao?: string;
      opiniao?: string;
    };
```

Regras:

- Marcadores são reconhecidos por regex insensível a maiúsculas: `^##\s*(SINTESE|NORMA|OBSERVACAO|OPINIAO|SEM_NORMA)\b`.
- Se `SEM_NORMA` aparecer, o resultado é `sem_norma` e qualquer outro bloco é descartado (o modelo violou a regra de não misturar; registrar em console de desenvolvimento, nunca ao usuário).
- Em `NORMA`, a linha `FONTE:` é obrigatória para exibição do cabeçalho; `VIGENCIA:` é opcional. O restante é o texto literal.
- Texto sem nenhum marcador reconhecido é exibido como erro de formato ("A resposta veio em formato inesperado. Tente novamente.") e o texto bruto fica acessível em um detalhe expansível, para não esconder conteúdo do usuário.
- O parser é puro (sem DOM) e coberto por testes em `src/dominio/parserResposta.test.ts` com ao menos: resposta completa, resposta sem observação, resposta `SEM_NORMA`, resposta misturada, resposta sem marcadores.

## Renderização

- `SINTESE`: bloco com rótulo "Síntese".
- `NORMA`: cabeçalho com a fonte em destaque, selo de vigência (verde para em vigor, âmbar para alterada ou incerta, vermelho para revogada) e o texto literal em fonte monoespaçada ou serifada com `white-space: pre-wrap`.
- `OBSERVACAO`: rótulo fixo "Observação interpretativa (não normativa)".
- `OPINIAO`: rótulo fixo "Opinião (posição pessoal, não normativa)".
- `SEM_NORMA`: bloco único, discreto, com a frase.

Cores e ícones de cada bloco estão em `04-design-e-ui.md`.
