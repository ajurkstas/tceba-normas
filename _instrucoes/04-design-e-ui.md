# 04. Design e interface

## Princípios

- Mobile first. Tela de 360 px de largura é o alvo primário; desktop é secundário.
- Uma coisa por tela. Três abas na base (Android) ou no topo (web): Consulta, Acervo, Ajustes.
- Tom institucional e sóbrio, coerente com o rodapé "Esta ferramenta não é um sistema oficial do TCE/BA".
- Respeitar `env(safe-area-inset-*)` e a barra de status do Android.

## Cores: somente paleta padrão do Tailwind

A paleta atual do `index.html` (tokens ink, paper, brass, wine, slate, line) é substituída pelos tons padrão do Tailwind mais próximos. Nenhum valor hex fora da paleta e nenhuma extensão de `theme.colors`.

| Uso | Token antigo | Tailwind |
|---|---|---|
| Texto principal, cabeçalhos, barra de abas | ink-900 `#12192B` | `slate-900` |
| Texto secundário | ink-700 `#2B3752` | `slate-700` |
| Texto auxiliar, rótulos | slate-500 `#5B6472` | `slate-500` |
| Fundo da página | paper-0 `#ECEDE7` | `stone-100` |
| Fundo de cartões e campos | paper-100 `#FFFFFF` | `white` |
| Bordas e divisores | line `#D8D9D2` | `stone-300` |
| Destaque institucional (aba ativa, botão primário, rótulo Síntese) | brass-500 `#A9812F` | `amber-700` |
| Fundo de destaque suave | brass-100 `#EFE3C8` | `amber-100` |
| Alerta, revogada, excluir | wine-600 `#7A2331` | `rose-900` |
| Fundo de alerta suave | wine-100 `#F3E2E1` | `rose-100` |

Semântica adicional (somente estes):

| Situação | Cor |
|---|---|
| Em vigor | `emerald-700` sobre `emerald-50` |
| Vigente com alterações, vigência incerta | `amber-700` sobre `amber-50` |
| Revogada | `rose-900` sobre `rose-100` |
| Rascunho local (aviso) | `amber-800` sobre `amber-100` |
| Erro | `rose-900` sobre `rose-50` |
| Bloco Observação interpretativa | borda `slate-300`, fundo `slate-50` |
| Bloco Opinião | borda `amber-300`, fundo `amber-50` |
| Bloco Sem norma | borda `stone-300`, fundo `stone-50` |

Modo escuro: classe `dark` no `html`. O padrão do app é o tema claro; "Seguir o sistema" e "Escuro" são escolhas do usuário em Ajustes, persistidas em `Preferences`. Inversões: fundo `slate-950`, cartões `slate-900`, texto `stone-100`, bordas `slate-700`, destaque `amber-400`. Os selos mantêm o matiz com fundo `*-950/40`.

## Tipografia

- Interface: fonte do sistema (`font-sans` do Tailwind). Sem Google Fonts no APK, para funcionar offline e evitar requisições externas.
- Texto literal das normas: `font-serif` com `whitespace-pre-wrap` e `leading-relaxed`, para diferenciar visualmente a transcrição da síntese.
- Identificadores (FONTE, número da norma, selo de vigência): `font-mono text-xs uppercase tracking-wide`.
- Tamanho base 16 px no mobile; nunca abaixo de 14 px para texto lido.

## Ícones: Heroicons

Importar de `@heroicons/react/24/outline` para navegação e ações, `@heroicons/react/20/solid` para ícones dentro de texto, selos e botões pequenos. Nenhum SVG avulso e nenhuma outra biblioteca de ícones.

| Elemento | Ícone |
|---|---|
| Aba Consulta | `MagnifyingGlassIcon` |
| Aba Acervo | `BookOpenIcon` |
| Aba Ajustes | `Cog6ToothIcon` |
| Botão Consultar | `PaperAirplaneIcon` |
| Histórico | `ClockIcon` |
| Nova norma | `PlusIcon` |
| Editar | `PencilSquareIcon` |
| Excluir | `TrashIcon` |
| Colagem em lote | `ClipboardDocumentListIcon` |
| Carregar PDF | `DocumentArrowUpIcon` |
| Importar JSON | `ArrowUpTrayIcon` |
| Exportar JSON | `ArrowDownTrayIcon` |
| Link oficial | `ArrowTopRightOnSquareIcon` |
| Em vigor | `CheckCircleIcon` (solid) |
| Alterada ou incerta | `ExclamationTriangleIcon` (solid) |
| Revogada | `XCircleIcon` (solid) |
| Rascunho local | `PencilIcon` (solid) |
| Chave da API | `KeyIcon` |
| Mostrar chave | `EyeIcon`; ocultar: `EyeSlashIcon` |
| Chave protegida | `LockClosedIcon`; autenticação biométrica: `FingerPrintIcon` |
| Remover chave | `TrashIcon` |
| Sucesso | `CheckIcon` |
| Erro | `ExclamationCircleIcon` |
| Fechar | `XMarkIcon` |
| Ajuda | `InformationCircleIcon` |
| Copiar resposta | `ClipboardDocumentIcon` |
| Compartilhar resposta | `ShareIcon` |
| Nova consulta (limpar contexto) | `ArrowPathIcon` |
| Estatísticas do acervo | `ChartBarIcon` |
| Referência cruzada quebrada | `ExclamationTriangleIcon` |
| Conectividade | `WifiIcon` |

Tamanho padrão: `h-6 w-6` na navegação, `h-5 w-5` em botões, `h-4 w-4` em selos.

## Telas

### Consulta
- Logo no topo (`logo-titulo.png`), sem título escrito.
- Texto de apresentação curto explicando que a resposta se baseia apenas no acervo carregado.
- Atalhos de perguntas frequentes (diárias, licitação, prazo recursal, afastamento): botões em pílula acima do campo de pergunta; ao tocar, preenchem a pergunta e disparam a busca no acervo (sem IA).
- Campo de pergunta (textarea, 3 a 6 linhas) e dois botões: "Buscar no acervo" (secundário, `MagnifyingGlassIcon`; funciona sem chave) e "Buscar e consultar IA" (primário, `SparklesIcon`; desabilitado sem chave, com link para Ajustes). Durante a consulta, o botão primário vira "Cancelar" (`StopIcon`).
- Contexto de conversa: perguntas de acompanhamento na mesma sessão (ex.: "e no caso de férias?") entram como turnos anteriores na chamada à IA, sem repetir o acervo (ver `06`). Enquanto há contexto ativo, um aviso mostra quantas perguntas anteriores estão na sessão, com botão "Nova consulta (limpar contexto)" (`ArrowPathIcon`) para reiniciar.
- Resposta em duas seções, nesta ordem: "Normas relacionadas no acervo (busca sem IA)", com os dispositivos encontrados e termos realçados em `mark` `amber-100`; e "Resposta objetiva (gerada por IA a partir do acervo)", com os blocos de `02`.
- Cada bloco `NORMA` da resposta traz um link "Ver no dispositivo, na norma completa" (quando a norma citada é localizada no acervo pelo tipo e número da linha FONTE) que abre o `VisualizadorNorma` já rolado e com destaque temporário no artigo, parágrafo, inciso ou alínea citado.
- Botões "Copiar" (`ClipboardDocumentIcon`) e "Compartilhar" (`ShareIcon`) na resposta da IA: copiam ou compartilham a resposta formatada como texto simples, para juntar a processo administrativo.
- Estado de carregamento com a frase "Percorrendo o acervo carregado" e, com streaming, a resposta aparece progressivamente.
- Aviso quando o acervo foi pré-selecionado por volume.
- Blocos de resposta conforme `02-prompt-de-sistema.md`.
- Histórico das últimas 15 consultas, expansível, com botão para reexecutar a pergunta. Toda busca entra no histórico, mesmo sem IA (`resposta` vazia); a mesma pergunta não se repete, e a resposta da IA, quando houver, é preservada.
- Se não houver chave configurada: em vez de consultar, mostrar cartão com `KeyIcon` e botão que leva à aba Ajustes.
- Links para o portal de legislação do TCE/BA e Resoluções Normativas, como hoje.
- Rodapé com o aviso de sistema não oficial e autoria.

### Acervo
- Barra superior: campo de filtro por palavra-chave e quatro botões só com ícone (`aria-label` e `title`): Nova norma, Colagem em lote, Importar JSON, Exportar JSON.
- Abaixo da barra, dois seletores lado a lado: filtro por tipo de ato (`PLURAIS`, mais "Todos os tipos") e por situação (em vigor, vigente com alterações, revogada, mais "Todas as situações"); combinam com o filtro por palavra-chave.
- Painel retrátil "Estatísticas do acervo" (`ChartBarIcon`, `dominio/estatisticasAcervo.ts`): total de normas, quantidade por tipo e ano da norma mais antiga e da mais recente, para perceber se o acervo está defasado.
- Lista de normas agrupadas por tipo, na ordem de hierarquia (`hierarquia.ts`), com o rótulo do grupo no plural quando cabem vários atos (`PLURAIS`: "Resoluções Normativas", "Instruções Normativas", "Súmulas").
- Cartão enxuto: código (`LO-005/1991`) e selo de situação; título curto derivado da ementa (`tituloNorma`, que retira "Aprova o", "Dispõe sobre a", o aparte "no âmbito do Tribunal..." e "e dá outras providências"); linha com data e observação; e três ações só com ícone (ler na íntegra, editar, fonte oficial). Sem trecho do texto.
- Alerta de referência cruzada quebrada (`ExclamationTriangleIcon`, `dominio/localizarNorma.ts`): quando o campo `obs` menciona revogação ou alteração por outra norma e essa norma não é encontrada no acervo pelo tipo e número, o cartão exibe um aviso discreto abaixo da observação.
- Aviso "Rascunho local" enquanto houver edições não publicadas.
- Toque no cartão abre o leitor de tela inteira (`VisualizadorNorma`): barra superior apenas com X, código da norma e botão Editar. Corpo no padrão dos textos legais do Planalto (`dominio/estruturaNorma.ts`): fonte serifada, título centralizado, ementa recuada à direita, um parágrafo separado para cada "CONSIDERANDO", artigos e parágrafos como texto comum com recuo de primeira linha, incisos e alíneas recuados com barra lateral (sem aspas), e divisões (Título, Capítulo, Seção, Subseção) como `<details open>` retráteis, aninhadas e abertas ao abrir a norma. Fecha com X, Escape ou botão voltar do Android (`servicos/voltar.ts`).
- Modal de norma: botão "Carregar PDF da norma" no topo; ao carregar, o texto é transcrito e `dominio/metadadosNorma.ts` preenche tipo (se norma nova), número no formato `000/0000`, data de aprovação, ementa e situação (vigente, ou vigente com alterações quando o texto traz marcas de consolidação), sempre para revisão; o link fica manual. Demais campos: tipo, número, data, situação, ementa, norma revogadora ou modificadora, link, texto integral.
- Exclusão sempre com confirmação.

### Ajustes
Ver `05-ajustes-e-chave-api.md` para o bloco da chave. Demais itens:
- Modelo (seleção entre os modelos permitidos em `06`).
- Aparência: tema (sistema, claro, escuro) e tamanho da fonte (pequena, normal, grande); o tamanho ajusta o `font-size` da raiz do documento (`servicos/ajustes.ts`, `aplicarTamanhoFonte`), afetando todo o aplicativo, para leitura de texto normativo extenso.
- Conectividade (`WifiIcon`): "Testar conectividade" verifica só o alcance da rede até a Anthropic (`testarConectividade`, `06`), sem avaliar se a chave configurada é válida; distinto do "Testar chave" do bloco da chave.
- Uso de tokens (registro local, nunca remoto): total de consultas, tokens de entrada e saída, uso do mês corrente e por modelo, com "Limpar registro". Gravado em `Preferences` por `servicos/tokens.ts`, nunca a chave nem o texto da pergunta ou resposta.
- Dados: "Restaurar acervo publicado" (descarta rascunho local, com confirmação), "Limpar histórico".
- Sobre: versão do app, aviso de sistema não oficial, link do repositório.

## Componentes básicos (`src/componentes/`)

`Botao` (variantes primário `bg-amber-700 text-white`, secundário `border-stone-300`, perigo `text-rose-900`), `Campo`, `AreaTexto`, `Selecao`, `Modal`, `Selo`, `Aviso`, `BlocoResposta`, `BarraAbas`. Todos aceitam `className` para composição, sem estilos inline.

## Acessibilidade

- Toda ação com ícone isolado tem `aria-label`.
- Contraste mínimo AA: as combinações da tabela acima cumprem; não introduzir `*-400` sobre branco para texto.
- Áreas de toque de 44 px no mínimo.
