# 05. Aba Ajustes e chave da API

A chave da API da Anthropic pertence ao usuário e é informada uma vez na aba Ajustes. O aplicativo a guarda no dispositivo, de forma secreta (nunca exibida por inteiro, nunca registrada, nunca exportada) e protegida (armazenamento cifrado pelo sistema e autenticação do aparelho para revelar ou remover).

## Regras absolutas

1. Nenhuma chave no código-fonte, em variáveis de ambiente de build, em `capacitor.config.ts`, em `public/`, no `acervo.json`, em testes ou em fixtures. Testes usam a string `sk-ant-teste-0000`.
2. A chave nunca entra em `console.log`, em mensagens de erro, em relatórios de falha, no histórico de consultas nem em exportações (JSON do acervo, backups).
3. A chave nunca fica em estado React, context, store global, `localStorage`, `Preferences` ou arquivo. O único módulo que a lê é `src/servicos/chaveApi.ts`; o cliente da API a recebe por chamada e a descarta.
4. O campo de entrada é `type="password"` com `autocomplete="off"`, `autocorrect="off"`, `spellcheck={false}`. Não há preenchimento automático por teclado.
5. Na interface, a chave só aparece mascarada: prefixo `sk-ant-` e os últimos 4 caracteres (`sk-ant-••••••••3f9A`). Revelar por inteiro exige autenticação do dispositivo.
6. A tela Ajustes bloqueia captura de tela e fica oculta no seletor de apps recentes no Android (`FLAG_SECURE`), via plugin de tela privada.
7. O AndroidManifest declara `android:allowBackup="false"` e `android:fullBackupContent="false"`, para a chave não ir em backup de nuvem.
8. Remover a chave apaga o valor do armazenamento seguro imediatamente e zera `temChave`.

## Armazenamento

- Android: plugin de armazenamento seguro baseado em Android Keystore com `EncryptedSharedPreferences` (por exemplo `@aparajita/capacitor-secure-storage`; confirmar a versão compatível com a versão do Capacitor no momento da implementação). Chave de registro: `anthropic_api_key`.
- Web (desenvolvimento e versão publicada): `sessionStorage` apenas, com aviso permanente no bloco da chave: "No navegador a chave fica guardada só até fechar esta aba." Nunca `localStorage`.
- Interface única em `chaveApi.ts`:

```ts
export async function temChave(): Promise<boolean>;
export async function gravarChave(chave: string): Promise<void>;   // valida formato antes
export async function lerChave(): Promise<string | null>;          // usada só por servicos/anthropic.ts
export async function removerChave(): Promise<void>;
export function mascarar(chave: string): string;                   // sk-ant-••••3f9A
```

`lerChave` não é exportada para `telas/` nem `componentes/`; a tela só conhece `temChave`, `mascarar` e o resultado de `revelarChave()` (abaixo).

## Validação ao gravar

- Remover espaços nas pontas.
- Exigir prefixo `sk-ant-` e comprimento mínimo de 40 caracteres; caso contrário, erro "A chave não tem o formato esperado (deve começar com sk-ant-)."
- Depois de gravar, oferecer "Testar chave": envia uma requisição mínima (`max_tokens: 16`, mensagem "ok") e mostra sucesso ou o erro mapeado (`06-integracao-anthropic.md`). O teste nunca mostra o corpo da resposta da API.

## Proteção por autenticação do dispositivo

Usar autenticação biométrica ou credencial do aparelho (PIN, padrão, senha) via plugin de autenticação biométrica do Capacitor (por exemplo `@aparajita/capacitor-biometric-auth`, com `allowDeviceCredential: true`).

| Ação | Exige autenticação |
|---|---|
| Ver estado (há chave ou não, forma mascarada) | Não |
| Informar chave pela primeira vez | Não |
| Substituir chave existente | Sim, e confirmação |
| Revelar chave por inteiro (`revelarChave()`) | Sim; exibida por no máximo 30 s, depois volta a mascarada |
| Remover chave | Sim, e confirmação |
| Usar a chave em uma consulta | Não |

Se o dispositivo não tiver nenhum bloqueio configurado, a ação de revelar fica desabilitada com a explicação "Configure um bloqueio de tela para poder revelar a chave." Substituir e remover continuam possíveis, com confirmação.

Na web, onde não há autenticação do aparelho, revelar fica desabilitado; substituir e remover pedem confirmação.

## Layout do bloco na aba Ajustes

```
[KeyIcon] Chave da API da Anthropic
Estado: Configurada (sk-ant-••••3f9A)  [LockClosedIcon]
[ Revelar ]  [ Substituir ]  [ Remover ]
Texto de apoio: A chave fica guardada apenas neste aparelho, em armazenamento
cifrado. Ela é enviada somente para api.anthropic.com no momento da consulta.
Link: Onde obter uma chave (console.anthropic.com)
```

Sem chave:

```
[KeyIcon] Chave da API da Anthropic
Estado: Não configurada
Campo (mascarado) com botão de olho para conferir o que está sendo digitado
[ Salvar ]  [ Testar chave ]
```

O botão de olho no campo de digitação alterna a visibilidade apenas enquanto o usuário digita (a chave ainda não foi gravada); isso não é "revelar" e não exige autenticação.

## Erros e mensagens

- Chave ausente ao consultar: cartão na aba Consulta "Configure sua chave da API em Ajustes para consultar." com botão que troca de aba.
- Chave inválida (401 na API): "A chave foi recusada pela Anthropic. Confira em Ajustes." O app não apaga a chave sozinho.
- Falha ao gravar no armazenamento seguro: "Não foi possível guardar a chave neste aparelho." e nada é gravado em fallback inseguro.
