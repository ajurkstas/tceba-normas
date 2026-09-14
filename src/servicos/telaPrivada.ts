// Bloqueia captura de tela e oculta a aba Ajustes no seletor de apps recentes (FLAG_SECURE).
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { NATIVO } from './plataforma';

export async function protegerTela(ativa: boolean): Promise<void> {
  if (!NATIVO) return;
  try {
    if (ativa) await PrivacyScreen.enable();
    else await PrivacyScreen.disable();
  } catch { /* plugin ausente na plataforma: sem efeito */ }
}
