// Única porta de acesso à chave da API. Ver _instrucoes/05-ajustes-e-chave-api.md.
// No Android a chave fica no armazenamento seguro (Keystore). No navegador,
// apenas em sessionStorage, para desenvolvimento.
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { NATIVO } from './plataforma';

const CHAVE_REGISTRO = 'anthropic_api_key';
const PREFIXO_ESPERADO = 'sk-ant-';
const COMPRIMENTO_MINIMO = 40;

let prefixoDefinido = false;
async function garantirPrefixo(): Promise<void> {
  if (prefixoDefinido) return;
  await SecureStorage.setKeyPrefix('normastceba_');
  prefixoDefinido = true;
}

async function lerBruta(): Promise<string | null> {
  if (!NATIVO) {
    try { return sessionStorage.getItem(CHAVE_REGISTRO); } catch { return null; }
  }
  await garantirPrefixo();
  const v = await SecureStorage.getItem(CHAVE_REGISTRO);
  return v && v.length > 0 ? v : null;
}

export function validarFormato(chave: string): string | null {
  const c = chave.trim();
  if (!c.startsWith(PREFIXO_ESPERADO) || c.length < COMPRIMENTO_MINIMO) {
    return 'A chave não tem o formato esperado (deve começar com sk-ant-).';
  }
  if (/\s/.test(c)) return 'A chave não pode conter espaços.';
  return null;
}

export async function temChave(): Promise<boolean> {
  return (await lerBruta()) !== null;
}

export async function gravarChave(chave: string): Promise<void> {
  const c = chave.trim();
  const erro = validarFormato(c);
  if (erro) throw new Error(erro);
  if (!NATIVO) {
    sessionStorage.setItem(CHAVE_REGISTRO, c);
    return;
  }
  await garantirPrefixo();
  await SecureStorage.setItem(CHAVE_REGISTRO, c);
}

// Usada somente por servicos/anthropic.ts. Telas não importam esta função.
export async function lerChave(): Promise<string | null> {
  return lerBruta();
}

export async function removerChave(): Promise<void> {
  if (!NATIVO) {
    try { sessionStorage.removeItem(CHAVE_REGISTRO); } catch { /* nada a fazer */ }
    return;
  }
  await garantirPrefixo();
  await SecureStorage.removeItem(CHAVE_REGISTRO);
}

export function mascarar(chave: string): string {
  const fim = chave.slice(-4);
  return `${PREFIXO_ESPERADO}••••••••${fim}`;
}

export async function chaveMascarada(): Promise<string | null> {
  const c = await lerBruta();
  return c ? mascarar(c) : null;
}
