import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.jurkstas.normastceba',
  appName: 'Normas TCE/BA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Desabilitado de propósito: o patch de fetch do CapacitorHttp não suporta streaming e
    // quebra o SDK da Anthropic. O SDK envia o cabeçalho anthropic-dangerous-direct-browser-access,
    // que libera CORS no WebView, então o fetch nativo funciona direto com api.anthropic.com.
    CapacitorHttp: { enabled: false },
    // Só ativado programaticamente na aba Ajustes (ver servicos/telaPrivada.ts).
    PrivacyScreen: { enable: false, preventScreenshots: true },
  },
};

export default config;
