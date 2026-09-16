// Leitura dos índices do buladiff (produtos.json e recentes.json) com cache em memória.
// Mesmo padrão preguiçoso do csv-loader: a primeira chamada carrega, as seguintes reaproveitam
// até o TTL vencer. Falha de rede não derruba a listagem: devolve vazio e loga.

import type { Produto, Recente, ResumoBulas } from "./buladiff-types.js";

export const DEFAULT_DATA_URL = "https://vasfvitor.github.io/buladiff/data";
const TTL_MS = 60 * 60 * 1000;

export function dataUrl(): string {
  return (process.env.VITE_BULADIFF_DATA_URL || DEFAULT_DATA_URL).replace(/\/+$/, "");
}

type Cache<T> = { value: T; loadedAt: number } | null;

let produtosCache: Cache<Produto[]> = null;
let recentesCache: Cache<Recente[]> = null;
let indiceCache: Map<string, Produto> | null = null;

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  const url = `${dataUrl()}/${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[buladiff] ${url} respondeu ${res.status}`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[buladiff] falha ao buscar ${url}:`, error);
    return fallback;
  }
}

function fresh<T>(cache: Cache<T>, now: number): cache is { value: T; loadedAt: number } {
  return cache !== null && now - cache.loadedAt < TTL_MS;
}

export async function getProdutos(now = Date.now()): Promise<Produto[]> {
  if (fresh(produtosCache, now)) return produtosCache.value;
  const value = await fetchJson<Produto[]>("produtos.json", []);
  // só guarda respostas com conteúdo: uma falha transitória não deve ficar cacheada por 1 h
  if (value.length > 0) {
    produtosCache = { value, loadedAt: now };
    indiceCache = new Map(value.map((p) => [p.registro, p]));
  }
  return value;
}

export async function getRecentes(now = Date.now()): Promise<Recente[]> {
  if (fresh(recentesCache, now)) return recentesCache.value;
  const value = await fetchJson<Recente[]>("recentes.json", []);
  if (value.length > 0) recentesCache = { value, loadedAt: now };
  return value;
}

/** Índice registro → produto arquivado. */
export async function getIndice(now = Date.now()): Promise<Map<string, Produto>> {
  await getProdutos(now);
  return indiceCache ?? new Map();
}

export async function getProduto(registro: string, now = Date.now()): Promise<Produto | null> {
  return (await getIndice(now)).get(registro) ?? null;
}

export function resumo(p: Produto): ResumoBulas {
  return {
    nVersoes: p.n_versoes,
    ultimaPublicacao: p.ultima_publicacao,
    ultimoDiff: p.diffs.length > 0 ? p.diffs[p.diffs.length - 1] : null,
  };
}

/** Só para os testes: esquece o que está em memória. */
export function resetCache() {
  produtosCache = null;
  recentesCache = null;
  indiceCache = null;
}
