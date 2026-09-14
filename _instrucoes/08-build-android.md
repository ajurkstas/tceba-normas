# 08. Build Android (Capacitor)

## Pré-requisitos na máquina

- Node 20 ou superior (há Node 26 instalado).
- JDK 17 ou superior. A máquina tem apenas Java 8 no PATH; instalar JDK 17 (por exemplo Temurin) e apontar `JAVA_HOME` antes de qualquer `gradlew`. Java 8 não compila projetos Capacitor atuais.
- Android Studio com Android SDK (API 34 ou superior), Build Tools e Platform Tools. Definir `ANDROID_HOME` (padrão `~/Library/Android/sdk`).
- Aceitar as licenças do SDK: `sdkmanager --licenses`.

Antes de gerar o primeiro APK, executar `npx cap doctor` e resolver tudo o que ele apontar.

## Configuração (`capacitor.config.ts`)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.jurkstas.normastceba',   // ajustar se o usuário preferir outro domínio reverso
  appName: 'Normas TCE/BA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
```

Não colocar `server.url` nem `server.cleartext` no config: o app carrega o build local, sem servidor remoto.

## Primeira criação da plataforma

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/filesystem @capacitor/preferences @capacitor/share
npx cap add android
```

Depois de `add`, revisar `android/app/src/main/AndroidManifest.xml`:

- `android:allowBackup="false"` e `android:fullBackupContent="false"` na tag `<application>` (protege a chave da API; ver `05`).
- Permissão `INTERNET` presente (o Capacitor já inclui).
- `android:screenOrientation="portrait"` na activity principal, em linha com o `manifest.json` atual.

Comitar a pasta `android/` inteira, exceto `android/app/build/`, `android/.gradle/`, `android/local.properties` e `android/build/`.

## Ciclo de build

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK de depuração: `android/app/build/outputs/apk/debug/app-debug.apk`. Instalar no aparelho com `adb install -r <apk>` ou abrir no Android Studio com `npx cap open android` e rodar.

`npx cap sync` copia `dist/` e atualiza plugins nativos; rodar após qualquer `npm install` de plugin Capacitor.

## Release assinado

1. Gerar a keystore uma única vez, fora do repositório (por exemplo `~/.android/normas-tceba.jks`), com `keytool -genkeypair -v -keystore ~/.android/normas-tceba.jks -alias normas -keyalg RSA -keysize 2048 -validity 10000`. Guardar a senha em gerenciador de senhas. Perder a keystore impede atualizar o app já instalado.
2. Criar `android/keystore.properties` (ignorado pelo git) com `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.
3. Em `android/app/build.gradle`, ler `keystore.properties` em `signingConfigs.release` e usar em `buildTypes.release`.
4. `cd android && ./gradlew assembleRelease` gera `android/app/build/outputs/apk/release/app-release.apk`. Para Play Store, `bundleRelease` gera o `.aab`.

Claude Code nunca cria a keystore nem preenche senhas; orienta o usuário e monta os arquivos de configuração com placeholders.

## Versionamento

`android/app/build.gradle`: `versionCode` inteiro incrementado a cada APK distribuído; `versionName` igual à versão em `package.json`. A aba Ajustes exibe `versionName` (via `@capacitor/app`, `App.getInfo()`).

## Ícones e splash

Usar `@capacitor/assets`: colocar `assets/icon.png` (1024 px, quadrado) e `assets/splash.png` (2732 px), gerados a partir do `icon-512.png` atual e do fundo `stone-100`, e rodar `npx capacitor-assets generate --android`. A cor de fundo adaptativa do ícone é `#F5F5F4` (`stone-100`) e a de primeiro plano vem do PNG.

## Plugins previstos

| Plugin | Uso |
|---|---|
| `@capacitor/filesystem` | acervo no dispositivo, exportação |
| `@capacitor/preferences` | histórico, ajustes não sensíveis |
| `@capacitor/share` | compartilhar JSON exportado |
| `@capacitor/app` | versão, botão voltar do Android (fecha modal antes de sair do app) |
| armazenamento seguro (ver `05`) | chave da API |
| autenticação biométrica (ver `05`) | revelar, substituir e remover chave |
| tela privada (`FLAG_SECURE`) (ver `05`) | aba Ajustes |

Antes de adicionar qualquer plugin, verificar compatibilidade com a versão do Capacitor instalada e registrar a versão escolhida no `package.json` com número fixo.

## .gitignore a acrescentar

```
node_modules/
dist/
android/app/build/
android/build/
android/.gradle/
android/local.properties
android/keystore.properties
*.jks
*.keystore
.env
.env.*
Acervo/*.crdownload
```

## Verificação antes de distribuir um APK

1. Instalar limpo no aparelho, abrir e confirmar que o acervo publicado aparece sem rascunho.
2. Ajustes: informar chave, testar, revelar (com biometria), substituir, remover. Confirmar que nada aparece em `adb logcat` contendo `sk-ant-`.
3. Consulta com e sem conexão; conferir as mensagens de erro da tabela em `06`.
4. Exportar JSON e conferir que não contém chave nem histórico.
5. Fechar e reabrir o app: chave continua configurada, histórico continua.
