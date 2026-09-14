import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.jurkstas.normastceba',
  appName: 'Normas TCE/BA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Roteia o fetch pela camada nativa: sem CORS no WebView e a chave sai direto para api.anthropic.com.
    CapacitorHttp: { enabled: true },
    // Só ativado programaticamente na aba Ajustes (ver servicos/telaPrivada.ts).
    PrivacyScreen: { enable: false, preventScreenshots: true },
  },
};

export default config;
