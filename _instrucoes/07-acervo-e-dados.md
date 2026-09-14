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
- Importação de PDF (`servicos/pdf.ts`): extrair texto com pdf.js, juntar linhas quebradas por largura de página quando a linha seguinte começar com minúscula, preservar quebras antes de "Art.", "§", "Parágrafo único", incisos romanos e alíneas. Sempre exibir o resultado para revisão antes de salvar; nunca salvar automaticamente.
- Colagem em lote: cada bloco separado por linha `===` vira uma norma; a primeira linha do bloco é o cabeçalho `Tipo | Número | Data | Ementa | Link`, o restante é o texto. Mesma regra: revisar antes de salvar.

## Limite de volume enviado ao modelo

`LIMITE_ACERVO_CHARS = 280_000` caracteres (valor herdado do `index.html`). Acima disso, `montarCorpoAcervo` pontua cada norma pela presença dos termos da pergunta (palavras com mais de 3 letras, sem acento e em minúsculas) em tipo, ementa e texto, envia as 25 mais pontuadas e acrescenta o aviso de pré-seleção. A pré-seleção nunca descarta Lei Orgânica e Regimento Interno quando cabem no limite.

Revisar esse limite quando a conta do usuário tiver janela de contexto de 1M tokens: o acervo inteiro cabe com folga e a pré-seleção deixa de ser necessária. Manter a função, elevar a constante.

## Exportação e importação

- Exportar: arquivo `acervo-tceba-AAAA-MM-DD.json`, array de `Norma`, indentação 2, UTF-8. No Android, gravar em `Directory.Documents` via Filesystem e oferecer compartilhamento (`@capacitor/share`). Nunca incluir histórico, ajustes ou chave.
- Importar: aceitar array de `Norma` ou objeto `{ normas: Norma[] }` (compatibilidade). Validar campos obrigatórios (`tipo`, `texto`); normalizar `tipo` antigo; ignorar chaves desconhecidas. Perguntar se substitui ou mescla; ao mesclar, o `id` decide a colisão.

## Histórico

Últimas 30 consultas em `Preferences` (`tce-historico`): `{ pergunta, resposta (texto bruto do modelo), modelo, quando (ISO) }`. Exibir 15. Nunca gravar a chave, o `usage` ou o corpo do acervo.
