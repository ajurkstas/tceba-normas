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

Modo escuro: classe `dark` no `html`, seguindo a preferência do sistema. Inversões: fundo `slate-950`, cartões `slate-900`, texto `stone-100`, bordas `slate-700`, destaque `amber-400`. Os selos mantêm o matiz com fundo `*-950/40`.

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

Tamanho padrão: `h-6 w-6` na navegação, `h-5 w-5` em botões, `h-4 w-4` em selos.

## Telas

### Consulta
- Logo no topo (`logo-titulo.png`), sem título escrito.
- Texto de apresentação curto explicando que a resposta se baseia apenas no acervo carregado.
- Campo de pergunta (textarea, 3 a 6 linhas) e botão primário "Consultar".
- Estado de carregamento com a frase "Percorrendo o acervo carregado" e, com streaming, a resposta aparece progressivamente.
- Aviso quando o acervo foi pré-selecionado por volume.
- Blocos de resposta conforme `02-prompt-de-sistema.md`.
- Histórico das últimas 15 consultas, expansível, com botão para reexecutar a pergunta.
- Se não houver chave configurada: em vez de consultar, mostrar cartão com `KeyIcon` e botão que leva à aba Ajustes.
- Links para o portal de legislação do TCE/BA e Resoluções Normativas, como hoje.
- Rodapé com o aviso de sistema não oficial e autoria.

### Acervo
- Lista de normas agrupadas por tipo, na ordem de hierarquia (`hierarquia.ts`), com número, data, ementa, selo de situação e link oficial.
- Aviso "Rascunho local" enquanto houver edições não publicadas, com botão "Exportar JSON".
- Ações: Nova norma, Colagem em lote, Importar JSON, Exportar JSON.
- Modal de norma com os campos atuais: tipo, número, data, situação, ementa, norma revogadora ou modificadora, link, texto integral, botão Carregar PDF.
- Exclusão sempre com confirmação.

### Ajustes
Ver `05-ajustes-e-chave-api.md` para o bloco da chave. Demais itens:
- Modelo (seleção entre os modelos permitidos em `06`).
- Tema: sistema, claro, escuro.
- Dados: "Restaurar acervo publicado" (descarta rascunho local, com confirmação), "Limpar histórico".
- Sobre: versão do app, aviso de sistema não oficial, link do repositório.

## Componentes básicos (`src/componentes/`)

`Botao` (variantes primário `bg-amber-700 text-white`, secundário `border-stone-300`, perigo `text-rose-900`), `Campo`, `AreaTexto`, `Selecao`, `Modal`, `Selo`, `Aviso`, `BlocoResposta`, `BarraAbas`. Todos aceitam `className` para composição, sem estilos inline.

## Acessibilidade

- Toda ação com ícone isolado tem `aria-label`.
- Contraste mínimo AA: as combinações da tabela acima cumprem; não introduzir `*-400` sobre branco para texto.
- Áreas de toque de 44 px no mínimo.
