# Consulta às Normas do TCE/BA

Aplicativo móvel (Android, via Capacitor) e web (React) para consulta ao acervo normativo interno do Tribunal de Contas do Estado da Bahia. A consulta por IA responde exclusivamente com base nos textos carregados no acervo, com transcrição literal do dispositivo aplicável ou declaração expressa de ausência de regulamentação.

Este arquivo é o ponto de entrada. As regras detalhadas ficam em `_instrucoes/` e devem ser lidas antes de trabalhar na área correspondente.

## Índice de instruções (`_instrucoes/`)

| Arquivo | Quando ler |
|---|---|
| `01-regras-de-consulta.md` | Sempre. Regra de negócio central: fidelidade documental, formatos de resposta, estilo. Vale para o app e para você ao responder sobre normas neste repositório. |
| `02-prompt-de-sistema.md` | Ao mexer no prompt enviado ao modelo, nos marcadores da resposta ou no parser. |
| `03-arquitetura-e-stack.md` | Ao criar ou reorganizar código: React, Vite, TypeScript, Capacitor, estrutura de pastas, persistência. |
| `04-design-e-ui.md` | Ao criar telas ou componentes: cores Tailwind, Heroicons, tipografia, abas, comportamento mobile. |
| `05-ajustes-e-chave-api.md` | Ao tocar na aba Ajustes ou em qualquer coisa que leia, grave ou transporte a chave da API. |
| `06-integracao-anthropic.md` | Ao chamar a API da Anthropic: SDK, modelo, streaming, cache, erros. |
| `07-acervo-e-dados.md` | Ao alterar o esquema do acervo, o cadastro de normas, importação de PDF ou o fluxo de publicação. |
| `08-build-android.md` | Ao gerar APK, configurar Capacitor, assinar release ou ajustar ícones e splash. |

## Estado atual

- App React + TypeScript + Vite em `src/`, empacotado com Capacitor em `android/`. Três abas na barra inferior: Consulta, Acervo, Ajustes.
- A chave da API é informada na aba Ajustes e guardada em armazenamento seguro do dispositivo (`src/servicos/chaveApi.ts`). Nenhuma chave no código, no repositório, em exportações ou em logs. Regras em `05-ajustes-e-chave-api.md`.
- Acervo publicado em `public/acervo.json`; cópia local editável no dispositivo (`src/servicos/acervo.ts`).
- Publicação: push em `main` dispara `.github/workflows/pages.yml` (site) e `.github/workflows/apk.yml` (APK na release `apk-latest`).
- `worker/` é legado da versão anterior (proxy Cloudflare) e não é usado pelo app.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (somente paleta padrão do Tailwind, sem cores customizadas)
- Heroicons (`@heroicons/react`)
- Capacitor (Android), com `CapacitorHttp` desabilitado (fetch nativo do WebView)
- `@anthropic-ai/sdk` para a consulta por IA; busca local sem IA em `src/dominio/buscaLocal.ts`
- Leitor de norma próprio (`src/dominio/estruturaNorma.ts` + `src/componentes/VisualizadorNorma.tsx`), sem Markdown
- pdf.js para importar texto de PDF no cadastro do acervo

## Comandos

```bash
npm install            # dependências
npm run dev            # web em desenvolvimento
npm run build          # gera dist/
npm test               # testes (vitest)
npx cap sync android   # copia dist/ e plugins para android/
npx cap open android   # abre no Android Studio
```

APK de depuração: `cd android && ./gradlew assembleDebug` (saída em `android/app/build/outputs/apk/debug/`). Passo a passo e assinatura em `08-build-android.md`.

## Regras inegociáveis

1. Fidelidade documental. A resposta da IA nunca cita, parafraseia ou insinua dispositivo que não conste literalmente do acervo carregado. Correlação não é amparo. Sem amparo, a resposta é a frase padrão de ausência de regulamentação. Ver `01-regras-de-consulta.md`.
2. Toda mudança no prompt de sistema, nos marcadores de resposta ou no parser passa por `02-prompt-de-sistema.md` e mantém os dois formatos de resposta (há norma / não há norma) sem misturá-los.
3. A chave da API nunca aparece em código, commit, log, exportação, screenshot de teste ou mensagem de erro. Campo mascarado, armazenamento seguro, revelação protegida.
4. Somente a paleta padrão do Tailwind e somente ícones do Heroicons. Nada de cores hex soltas nem bibliotecas de ícones adicionais.
5. O acervo publicado (`public/acervo.json`, hoje `acervo.json` na raiz) é a fonte única para quem instala o app. Edições locais são rascunho até serem publicadas por commit.

## Idioma e estilo

- Código, comentários, nomes de arquivos, componentes, variáveis e mensagens de commit em português do Brasil, seguindo o padrão já adotado (`consultar`, `montarCorpoAcervo`, `renderResposta`).
- Textos exibidos ao usuário: linguagem sóbria, objetiva e tecnicamente precisa.
- Vedado usar "o mesmo" ou "a mesma" como pronome.
- Vedado usar travessão e sublinhado em textos exibidos ao usuário e em respostas da IA. Use vírgula, dois-pontos ou parênteses.
- Negrito reservado a termos-chave (nome do tópico, nome do ato normativo).
- Mensagens de commit: verbo no presente, uma linha objetiva, como no histórico (`Cadastra Resolução Normativa nº 074/2023 no acervo`).

## Git e entrega: commit, push e APK a cada mudança

Toda mudança no código deste app é seguida, na mesma tarefa e sem esperar novo pedido, de três passos:

1. `git add` dos arquivos alterados e `git commit` com mensagem no padrão do histórico.
2. `git push origin main`.
3. Geração do APK atualizado. Localmente: `npm run apk` (exige JDK 17+ e Android SDK; saída em `android/app/build/outputs/apk/debug/app-debug.apk`), enviando o arquivo ao usuário com SendUserFile. Sem o toolchain local, o push em `main` já dispara `.github/workflows/apk.yml`, que publica o APK na release `apk-latest`; nesse caso, acompanhar a execução com `gh run watch` e informar ao usuário o link do APK quando concluir (ou a falha, com o trecho relevante do log).

Regras:

- Vale para qualquer alteração em `src/`, `public/`, `android/`, `capacitor.config.ts`, `package.json`, `CLAUDE.md` e `_instrucoes/`. Para mudanças só em documentação (`CLAUDE.md`, `_instrucoes/`, `README.md`), executar os passos 1 e 2 e pular o APK.
- Se nem o build local nem o workflow puderem gerar o APK (build quebrado, CI falhando), fazer mesmo assim o commit e o push e dizer explicitamente ao usuário que o APK não foi gerado e por quê. Nunca omitir a falha.
- Se o build falhar por erro no código recém-alterado, corrigir antes de comitar; não comitar código que não compila.
- Branch principal: `main`. Publicação web é feita a partir de `main`.
- Não comitar: `node_modules/`, `dist/`, `android/app/build/`, `*.keystore`, `*.jks`, `.env*`, `Acervo/*.crdownload`, `.DS_Store`.
- Comitar `android/` (projeto nativo gerado pelo Capacitor), exceto artefatos de build.
- Arquivos que já estavam sem versionamento antes da tarefa (hoje `Acervo/` e `worker/`) não entram no commit automático; só quando o usuário pedir.

## Quando você (Claude Code) responder sobre normas neste repositório

Aplique as regras de `01-regras-de-consulta.md` como se fosse o app: consulte apenas `acervo.json` e os arquivos de `Acervo/`, transcreva literalmente e, sem amparo, declare a ausência. Conhecimento geral de Direito não substitui o acervo.
