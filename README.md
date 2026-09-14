# Consulta às Normas do TCE/BA

Aplicativo Android (Capacitor) e web (React) para consulta ao acervo normativo do TCE/BA. A consulta por IA responde exclusivamente com base nos textos carregados no acervo: síntese prática seguida da transcrição literal da norma aplicável, ou declaração expressa de ausência de regulamentação.

- Site: https://ajurkstas.github.io/tceba-normas/
- APK mais recente: https://github.com/ajurkstas/tceba-normas/releases/tag/apk-latest (gerado automaticamente a cada push em `main`)

## Como usar

1. Instale o APK no Android (habilite "fontes desconhecidas") ou abra o site.
2. Na aba **Ajustes**, informe sua chave da API da Anthropic (`sk-ant-...`). No Android ela fica em armazenamento cifrado do aparelho; no navegador, só até fechar a aba.
3. Na aba **Consulta**, faça a pergunta. A resposta traz Síntese, Norma(s) aplicável(is) com transcrição literal e, se houver, Observação interpretativa.
4. Na aba **Acervo**, cadastre, edite, importe ou exporte normas. Edições ficam como rascunho local até serem publicadas no repositório.

## Desenvolvimento

```bash
npm install
npm run dev          # web em http://localhost:5173
npm test             # vitest
npm run build        # dist/
npm run apk          # build + cap sync + gradlew assembleDebug (exige JDK 17+ e Android SDK)
```

Estrutura, regras de negócio e decisões técnicas estão em `CLAUDE.md` e em `_instrucoes/`.

## Acervo publicado

`public/acervo.json` é o acervo que todo usuário recebe. Para publicar alterações feitas no app: Exportar JSON na aba Acervo, substituir `public/acervo.json` no repositório e fazer commit. O push em `main` regenera o site e o APK.

Fontes originais (PDF, ODT) ficam em `Acervo/`, apenas para conferência.

## Versão anterior

A PWA em arquivo único (`index.html` sem build) e o proxy `worker/` (Cloudflare) foram substituídos por esta versão. O `worker/` permanece no repositório apenas como referência.
