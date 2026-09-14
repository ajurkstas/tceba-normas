# 03. Arquitetura e stack

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Framework | React 18 + TypeScript, build com Vite | Base simples, compatível com Capacitor, tipagem para o esquema do acervo e o parser |
| Empacotamento móvel | Capacitor, plataforma Android | Gera APK instalável a partir do mesmo build web |
| Estilo | Tailwind CSS, somente paleta padrão | Pedido do projeto; consistência sem tokens próprios |
| Ícones | `@heroicons/react` | Pedido do projeto; um único conjunto de ícones |
| IA | `@anthropic-ai/sdk` chamado do próprio dispositivo com a chave do usuário | Elimina dependência de backend; a chave fica no aparelho |
| Rede no Android | `fetch` nativo do WebView (`CapacitorHttp` desabilitado) | O SDK envia o cabeçalho que libera CORS; o patch do CapacitorHttp quebra o streaming |
| Persistência do acervo | `@capacitor/filesystem`, `Directory.Data`, arquivo `acervo.json` | Volume (centenas de KB) acima do confortável para `Preferences` |
| Histórico e preferências | `@capacitor/preferences` | Dados pequenos |
| Chave da API | armazenamento seguro nativo (ver `05-ajustes-e-chave-api.md`) | Nunca em `Preferences`, `localStorage` ou arquivo |
| PDF | pdf.js (`pdfjs-dist`) empacotado localmente, sem CDN | Funciona offline no APK |
| Testes | vitest | Parser, hierarquia, serialização do acervo, mascaramento da chave |

## Estrutura de pastas (alvo)

```
tceba-normas/
├── CLAUDE.md
├── _instrucoes/
├── Acervo/                    # fontes originais (PDF, ODT); não empacotadas no app
├── public/
│   ├── acervo.json            # acervo publicado (migrado da raiz)
│   ├── logo-titulo.png
│   └── icones/                # ícones PWA existentes
├── src/
│   ├── main.tsx
│   ├── App.tsx                # abas e roteamento interno
│   ├── telas/
│   │   ├── Consulta.tsx
│   │   ├── Acervo.tsx
│   │   └── Ajustes.tsx
│   ├── componentes/           # botões, campos, modal, blocos de resposta, selo de vigência
│   ├── dominio/               # regras puras, sem React e sem Capacitor
│   │   ├── tipos.ts           # Norma, Situacao, TipoAto, Resposta
│   │   ├── hierarquia.ts      # ordem dos tipos de ato, abreviações, rótulos
│   │   ├── promptSistema.ts   # PROMPT_SISTEMA (texto de 02)
│   │   ├── montarCorpoAcervo.ts
│   │   └── parserResposta.ts
│   ├── servicos/              # fronteira com o mundo externo
│   │   ├── anthropic.ts       # cliente, consulta com streaming, mapeamento de erros
│   │   ├── acervo.ts          # carregar/salvar/exportar/importar acervo
│   │   ├── historico.ts
│   │   ├── ajustes.ts         # preferências não sensíveis (modelo, tema)
│   │   ├── chaveApi.ts        # única porta de acesso à chave (secure storage)
│   │   ├── voltar.ts          # pilha de fechamento para o botão voltar do Android
│   │   └── pdf.ts
│   └── estilos/index.css      # diretivas do Tailwind
├── android/                   # gerado por `npx cap add android`; comitado
├── worker/                    # proxy Cloudflare legado; opcional para a versão web
├── index.html                 # entrada do Vite (substitui o arquivo único atual)
├── capacitor.config.ts
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

Regras de dependência: `dominio/` não importa de `servicos/`, `telas/` nem `componentes/`. `servicos/` não importa de `telas/`. Só `servicos/chaveApi.ts` importa o plugin de armazenamento seguro.

## Migração a partir do `index.html` atual

O `index.html` de arquivo único contém a lógica de referência. Ao migrar:

1. Extrair a constante `SISTEMA` para `promptSistema.ts`, atualizada conforme `02-prompt-de-sistema.md`.
2. Extrair `montarCorpoAcervo`, `renderResposta` (vira parser + componentes), `rotuloStatus`, `ABREV` para `dominio/`.
3. Substituir a detecção `window.storage` (artefato do Claude.ai) por `servicos/`; o app não roda mais como artefato.
4. Mover `acervo.json`, `logo-titulo.png` e ícones para `public/`.
5. Trocar a chamada direta `fetch("https://api.anthropic.com/...")` sem chave pelo SDK com a chave vinda de `chaveApi.ts` (`06-integracao-anthropic.md`).
6. Só remover o `index.html` antigo depois que a versão React reproduzir todas as funções: consulta, histórico, cadastro, edição, exclusão, colagem em lote, importar/exportar JSON, carregar PDF, aviso de rascunho local.

`sw.js` e `manifest.json` passam a ser gerados por `vite-plugin-pwa` (ou mantidos manualmente em `public/`), preservando os ícones existentes.

## Estado da aplicação

- Estado global mínimo com React context ou `zustand`: `normas`, `historico`, `ajustes`, `temChave` (booleano; a chave em si nunca fica em estado React).
- Carregamento inicial: ler `acervo.json` do dispositivo; se não existir, semear a partir de `public/acervo.json` e marcar como não rascunho.
- Toda edição do acervo grava no dispositivo e marca `rascunhoLocal = true` até uma reimportação do acervo publicado.

## Versão web

O mesmo build roda no navegador. Diferenças tratadas por `Capacitor.isNativePlatform()`:

- Chave da API: no navegador, guardar apenas em `sessionStorage` com aviso visível de que expira ao fechar a aba (uso de desenvolvimento). Ver `05`.
- Rede: no navegador, o SDK precisa de `dangerouslyAllowBrowser: true` (ver `06`).
- O `worker/` continua disponível como alternativa para a versão web pública sem chave própria, mas o app Android não depende dele.
