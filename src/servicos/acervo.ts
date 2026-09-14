// Acervo publicado (public/acervo.json, embutido no build) e cópia local editável.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import type { Norma } from '../dominio/tipos';
import { gerarId, normalizarNorma, ordenarNormas } from '../dominio/hierarquia';
import { NATIVO } from './plataforma';

const ARQUIVO = 'acervo.json';
const CHAVE_LOCAL_WEB = 'tce-normas';
const CHAVE_RASCUNHO = 'tce-acervo-rascunho';
const CHAVE_HASH_PUBLICADO = 'tce-acervo-hash-publicado';

export interface EstadoAcervo {
  normas: Norma[];
  rascunhoLocal: boolean;
  atualizadoAutomaticamente: boolean;
}

function normalizarLista(dados: unknown): Norma[] {
  const lista = Array.isArray(dados) ? dados : (dados as { normas?: unknown })?.normas;
  if (!Array.isArray(lista)) return [];
  return lista
    .map((d) => (d && typeof d === 'object' ? normalizarNorma(d as Record<string, unknown>, gerarId) : null))
    .filter((n): n is Norma => n !== null);
}

async function hash(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function carregarPublicado(): Promise<{ normas: Norma[]; hash: string }> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}acervo.json`, { cache: 'no-store' });
    if (!r.ok) return { normas: [], hash: '' };
    const texto = await r.text();
    return { normas: normalizarLista(JSON.parse(texto)), hash: await hash(texto) };
  } catch {
    return { normas: [], hash: '' };
  }
}

async function lerLocal(): Promise<Norma[] | null> {
  try {
    if (NATIVO) {
      const r = await Filesystem.readFile({ path: ARQUIVO, directory: Directory.Data, encoding: Encoding.UTF8 });
      return normalizarLista(JSON.parse(typeof r.data === 'string' ? r.data : ''));
    }
    const v = localStorage.getItem(CHAVE_LOCAL_WEB);
    return v ? normalizarLista(JSON.parse(v)) : null;
  } catch {
    return null;
  }
}

async function gravarLocal(normas: Norma[]): Promise<void> {
  const json = JSON.stringify(normas);
  if (NATIVO) {
    await Filesystem.writeFile({ path: ARQUIVO, directory: Directory.Data, data: json, encoding: Encoding.UTF8 });
  } else {
    localStorage.setItem(CHAVE_LOCAL_WEB, json);
  }
}

async function marcarRascunho(valor: boolean): Promise<void> {
  await Preferences.set({ key: CHAVE_RASCUNHO, value: valor ? '1' : '0' });
}

async function ehRascunho(): Promise<boolean> {
  const { value } = await Preferences.get({ key: CHAVE_RASCUNHO });
  return value === '1';
}

export async function carregarAcervo(): Promise<EstadoAcervo> {
  const local = await lerLocal();
  const rascunho = await ehRascunho();
  const publicado = await carregarPublicado();
  const { value: hashAnterior } = await Preferences.get({ key: CHAVE_HASH_PUBLICADO });

  // Primeira abertura: semeia com o acervo publicado.
  if (local === null) {
    await gravarLocal(publicado.normas);
    await marcarRascunho(false);
    await Preferences.set({ key: CHAVE_HASH_PUBLICADO, value: publicado.hash });
    return { normas: ordenarNormas(publicado.normas), rascunhoLocal: false, atualizadoAutomaticamente: false };
  }

  // Build novo com acervo publicado diferente e sem rascunho local: substitui.
  const publicadoMudou = publicado.hash !== '' && publicado.hash !== hashAnterior;
  if (publicadoMudou && !rascunho && publicado.normas.length > 0) {
    await gravarLocal(publicado.normas);
    await Preferences.set({ key: CHAVE_HASH_PUBLICADO, value: publicado.hash });
    return { normas: ordenarNormas(publicado.normas), rascunhoLocal: false, atualizadoAutomaticamente: true };
  }

  return { normas: ordenarNormas(local), rascunhoLocal: rascunho, atualizadoAutomaticamente: false };
}

export async function salvarAcervo(normas: Norma[]): Promise<void> {
  await gravarLocal(normas);
  await marcarRascunho(true);
}

export async function restaurarPublicado(): Promise<Norma[]> {
  const publicado = await carregarPublicado();
  await gravarLocal(publicado.normas);
  await marcarRascunho(false);
  await Preferences.set({ key: CHAVE_HASH_PUBLICADO, value: publicado.hash });
  return ordenarNormas(publicado.normas);
}

export function importarJSON(texto: string): Norma[] {
  const dados = JSON.parse(texto);
  const lista = normalizarLista(dados);
  if (lista.length === 0) throw new Error('Nenhuma norma válida no arquivo.');
  return lista;
}

export function mesclar(atuais: Norma[], novas: Norma[]): Norma[] {
  const mapa = new Map(atuais.map((n) => [n.id, n]));
  for (const n of novas) mapa.set(n.id, n);
  return ordenarNormas(Array.from(mapa.values()));
}

export async function exportarJSON(normas: Norma[]): Promise<void> {
  const nome = `acervo-tceba-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify(ordenarNormas(normas), null, 2);
  if (NATIVO) {
    const r = await Filesystem.writeFile({ path: nome, directory: Directory.Cache, data: json, encoding: Encoding.UTF8 });
    await Share.share({ title: nome, url: r.uri, dialogTitle: 'Exportar acervo' });
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}
