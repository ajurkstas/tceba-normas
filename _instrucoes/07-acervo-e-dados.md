# 07. Acervo e dados

## Esquema de uma norma (`src/dominio/tipos.ts`)

```ts
export type TipoAto =
  | 'Constituição Federal'
  | 'Constituição do Estado'
  | 'Lei Orgânica'
  | 'Regimento Interno'
  | 'Resolução Normativa'
  | 'Instrução Normativa'
  | 'Portaria Normativa'
  | 'Súmula'
  | 'Legislação Correlata';

export type Situacao = 'vigente' | 'vigente_alteracoes' | 'revogada';

export interface Norma {
  id: string;        // gerado no cadastro, estável
  tipo: TipoAto;
  numero: string;    // "074/2023", "18/1992", "05/1991"
  data: string;      // "dd/mm/aaaa", data de aprovação
  status: Situacao;
  ementa: string;
  obs: string;       // norma revogadora ou modificadora, quando houver
  link: string;      // URL no site oficial, opcional
  texto: string;     // transcrição literal integral
}
```

O `acervo.json` é um array de `Norma`. Os registros já publicados usam `"Súmula de Jurisprudência"` como tipo em versões antigas; o carregador normaliza para `'Súmula'` na leitura e o exportador grava sempre o valor normalizado.

## Hierarquia e abreviações (`hierarquia.ts`)

Ordem para listagem, serialização e resposta:

| Ordem | Tipo | Abreviação |
|---|---|---|
| 1 | Constituição Federal | CF |
| 2 | Constituição do Estado | CE |
| 3 | Lei Orgânica | LO |
| 4 | Regimento Interno | RI |
| 5 | Resolução Normativa | RN |
| 6 | Instrução Normativa | IN |
| 7 | Portaria Normativa | PN |
| 8 | Súmula | SUM |
| 9 | Legislação Correlata | LC |

Dentro do mesmo tipo, ordenar por ano e número crescentes (`074/2023` antes de `012/2024`).

Rótulos de situação: `vigente` = "em vigor"; `vigente_alteracoes` = "vigente, com alterações"; `revogada` = "revogada".

## Onde o acervo vive

| Camada | Local | Conteúdo |
|---|---|---|
| Publicado | `public/acervo.json` no repositório (hoje `acervo.json` na raiz) | O que todo usuário recebe ao instalar ou atualizar o app |
| Dispositivo | `Directory.Data/acervo.json` (Filesystem) | Cópia local, com edições do usuário |
| Fontes | `Acervo/` no repositório | PDFs e ODTs originais, para conferência; não vão para o app |

Na primeira abertura, o app copia o acervo publicado para o dispositivo. Nas seguintes, usa a cópia local. Se o usuário editar, a cópia local vira rascunho (`rascunhoLocal = true`, aviso na aba Acervo). "Restaurar acervo publicado" em Ajustes sobrescreve a cópia local com `public/acervo.json` do build atual.

Quando um novo build trouxer `public/acervo.json` mais novo (comparar por hash do conteúdo gravado em `Preferences` na última semeadura) e a cópia local não for rascunho, substituir automaticamente. Se for rascunho, avisar e deixar o usuário decidir.

## Fluxo de publicação

1. Cadastrar ou editar na aba Acervo (dispositivo ou navegador).
2. Exportar JSON.
3. Substituir `public/acervo.json` no repositório pelo arquivo exportado, revisar o diff (número, data, situação, ementa, texto sem cortes) e comitar com mensagem no padrão "Cadastra Resolução Normativa nº 000/0000 no acervo".
4. Publicar: push para `main` (versão web) e gerar novo APK (`08-build-android.md`).

Claude Code faz o passo 3 quando o usuário entregar o JSON exportado. Antes de substituir, comparar a quantidade de normas e listar as que entram, saem ou mudam.

## Cadastro de texto integral

- Preferir o texto consolidado oficial. Ao cadastrar texto consolidado, informar em `obs` até qual norma a consolidação vai (exemplo já em uso: "Texto consolidado com as alterações posteriores, até a Resolução Normativa nº 042/2022").
- Manter numeração de artigos, parágrafos, incisos e alíneas exatamente como no original. Não "limpar" o texto além de remover cabeçalhos e rodapés de página repetidos e números de página.
- Importação de PDF (`servicos/pdf.ts` + `dominio/limparPdf.ts`): pdf.js entrega os itens com posição e tamanho de fonte; o serviço agrupa em linhas e descarta texto rotacionado (carimbos laterais). `limparPaginas` fica só com o texto efetivo da norma: remove cabeçalho e rodapé (linhas nas margens repetidas entre páginas ou com cara de paginação, URL, e-mail), carimbos de assinatura eletrônica e autenticação (em qualquer região; se o carimbo vier colado ao fim de uma linha de texto, só o carimbo é cortado), e a página "Quadro de Assinaturas" inteira. Notas de rodapé (fonte menor, na base da página, iniciadas por número ou marcador) são preservadas ao fim do texto da página. `arrumarTexto` junta linhas quebradas pela largura da página, preservando quebras antes de "Art.", "§", "Parágrafo único", incisos, alíneas, títulos e capítulos. Heurísticas cobertas por `limparPdf.test.ts`; sempre exibir o resultado para revisão antes de salvar.
- Colagem em lote: cada bloco separado por linha `===` vira uma norma; a primeira linha do bloco é o cabeçalho `Tipo | Número | Data | Ementa | Link`, o restante é o texto. Mesma regra: revisar antes de salvar.

## Busca sem IA (`dominio/buscaLocal.ts`)

A primeira parte de toda consulta não usa o modelo: o app divide cada norma em dispositivos (um por artigo; preâmbulo e blocos sem artigo por parágrafos), extrai os termos da pergunta (sem acentos, sem palavras vazias, reduzidos a radicais) e pontua cada dispositivo pela presença dos radicais no início de palavra, com bônus para cobrir todos os termos e para menção na ementa. Com dois ou mais termos, dispositivos que casam só um são descartados se houver melhores. Os 12 melhores são agrupados por norma, ordenados pela relevância do melhor trecho, com os termos realçados e link para ler a norma na íntegra. Funciona sem chave da API.

## Limite de volume enviado ao modelo

`LIMITE_ACERVO_CHARS = 280_000` caracteres (valor herdado do `index.html`). Acima disso, `montarCorpoAcervo` pontua cada norma pela presença dos termos da pergunta (palavras com mais de 3 letras, sem acento e em minúsculas) em tipo, ementa e texto, envia as 25 mais pontuadas e acrescenta o aviso de pré-seleção. A pré-seleção nunca descarta Lei Orgânica e Regimento Interno quando cabem no limite.

Revisar esse limite quando a conta do usuário tiver janela de contexto de 1M tokens: o acervo inteiro cabe com folga e a pré-seleção deixa de ser necessária. Manter a função, elevar a constante.

## Exportação e importação

- Exportar: arquivo `acervo-tceba-AAAA-MM-DD.json`, array de `Norma`, indentação 2, UTF-8. No Android, gravar em `Directory.Documents` via Filesystem e oferecer compartilhamento (`@capacitor/share`). Nunca incluir histórico, ajustes ou chave.
- Importar: aceitar array de `Norma` ou objeto `{ normas: Norma[] }` (compatibilidade). Validar campos obrigatórios (`tipo`, `texto`); normalizar `tipo` antigo; ignorar chaves desconhecidas. Perguntar se substitui ou mescla; ao mesclar, o `id` decide a colisão.

## Estatísticas e referências cruzadas

`dominio/estatisticasAcervo.ts` calcula, a partir da lista de normas em memória (sem gravar nada), o total por tipo e o ano da norma mais antiga e da mais recente (extraído do número `nnn/aaaa` ou, na falta, da data de aprovação); exibido no painel retrátil "Estatísticas do acervo" da aba Acervo.

`dominio/localizarNorma.ts` casa um texto livre (a linha `FONTE` de uma norma citada pela IA, ou o campo `obs` de um registro do acervo) contra tipo e número normativo, para: (a) na tela Consulta, linkar cada dispositivo citado ao ponto exato no `VisualizadorNorma` (ver `04`, `06`); (b) na aba Acervo, sinalizar quando `obs` menciona revogação ou alteração por outra norma que não está cadastrada no acervo (`referenciaCruzadaQuebrada`). Exige tipo e número explícitos no texto; menção vaga ("norma posterior") não é tratada como referência quebrada, para não gerar falsos positivos.

## Histórico

Últimas 30 consultas em `Preferences` (`tce-historico`): `{ pergunta, resposta (texto bruto do modelo), modelo, quando (ISO) }`. Exibir 15. Nunca gravar a chave, o `usage` ou o corpo do acervo.
