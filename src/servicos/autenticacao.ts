// Autenticação do aparelho (biometria ou credencial) para ações sensíveis com a chave.
import { BiometricAuth, BiometryError, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { NATIVO } from './plataforma';

export interface EstadoAutenticacao {
  disponivel: boolean;      // dá para pedir autenticação (biometria ou bloqueio de tela)
  biometria: boolean;
}

export async function estadoAutenticacao(): Promise<EstadoAutenticacao> {
  if (!NATIVO) return { disponivel: false, biometria: false };
  try {
    const r = await BiometricAuth.checkBiometry();
    return { disponivel: r.isAvailable || r.deviceIsSecure, biometria: r.isAvailable };
  } catch {
    return { disponivel: false, biometria: false };
  }
}

export type ResultadoAutenticacao = 'ok' | 'cancelado' | 'falhou' | 'indisponivel';

export async function autenticar(motivo: string): Promise<ResultadoAutenticacao> {
  if (!NATIVO) return 'indisponivel';
  try {
    await BiometricAuth.authenticate({
      reason: motivo,
      allowDeviceCredential: true,
      androidTitle: 'Normas TCE/BA',
      androidSubtitle: motivo,
      cancelTitle: 'Cancelar',
    });
    return 'ok';
  } catch (e) {
    if (e instanceof BiometryError) {
      if (e.code === BiometryErrorType.userCancel || e.code === BiometryErrorType.appCancel || e.code === BiometryErrorType.systemCancel) return 'cancelado';
      if (e.code === BiometryErrorType.biometryNotAvailable || e.code === BiometryErrorType.noDeviceCredential || e.code === BiometryErrorType.passcodeNotSet) return 'indisponivel';
    }
    return 'falhou';
  }
}
