// Leitura dos índices do buladiff (produtos.json e recentes.json) com cache em memória.
// Mesmo padrão preguiçoso do csv-loader: a primeira chamada carrega, as seguintes reaproveitam
// até o TTL vencer. Falha de rede não derruba a listagem: devolve vazio, loga e guarda a falha por
// pouco tempo (para não bater na origem a cada requisição enquanto ela estiver fora).

import { normalizeDataUrl, type Produto, type Recente, type ResumoBulas } from "./buladiff-types.js";

export const TTL_MS = 60 * 60 * 1000; // dado bom
export const TTL_FALHA_MS = 60 * 1000; // resposta de erro ou rede fora
export const TIMEOUT_MS = 8 * 1000;

export function dataUrl(): string {
  return normalizeDataUrl(process.env.VITE_BULADIFF_DATA_URL);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const url = `${dataUrl()}/${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.warn(`[buladiff] ${url} respondeu ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[buladiff] falha ao buscar ${url}:`, error);
    return null;
  }
}

interface Entrada<T> {
  value: T | null; // null = nunca carregou, ou a última tentativa falhou sem dado anterior
  loadedAt: number;
  falhou?: boolean; // a última tentativa falhou (o dado, se houver, é o anterior)
  pending?: Promise<T | null>; // carga em andamento, para não duplicar fetches concorrentes
}

function fresca<T>(e: Entrada<T>, now: number): boolean {
  const ttl = e.falhou || e.value === null ? TTL_FALHA_MS : TTL_MS;
  return e.loadedAt > 0 && now - e.loadedAt < ttl;
}

/** Um recurso JSON com cache: devolve o dado, ou `null` se não há dado e a última tentativa falhou. */
function recurso<T>(path: string) {
  let e: Entrada<T> = { value: null, loadedAt: 0 };
  return {
    async get(now: number): Promise<T | null> {
      if (fresca(e, now)) return e.value;
      if (e.pending) return e.pending;
      const anterior = e.value;
      const pending = fetchJson<T>(path).then((value) => {
        // falha depois de um dado bom: mantém o dado antigo por mais um TTL de falha
        e = { value: value ?? anterior, loadedAt: now, falhou: value === null };
        return e.value;
      });
      e = { ...e, pending };
      return pending;
    },
    reset() {
      e = { value: null, loadedAt: 0 };
    },
  };
}

const produtos = recurso<Produto[]>("produtos.json");
const recentes = recurso<Recente[]>("recentes.json");
let indice: { de: Produto[]; mapa: Map<string, Produto> } | null = null;

export async function getProdutos(now = Date.now()): Promise<Produto[]> {
  return (await produtos.get(now)) ?? [];
}

export async function getRecentes(now = Date.now()): Promise<Recente[]> {
  return (await recentes.get(now)) ?? [];
}

/** Índice registro → produto arquivado, ou `null` quando o buladiff está indisponível. */
export async function getIndice(now = Date.now()): Promise<Map<string, Produto> | null> {
  const lista = await produtos.get(now);
  if (!lista) return null;
  if (indice?.de !== lista) indice = { de: lista, mapa: new Map(lista.map((p) => [p.registro, p])) };
  return indice.mapa;
}

export async function getProduto(registro: string, now = Date.now()): Promise<Produto | null> {
  return (await getIndice(now))?.get(registro) ?? null;
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
  produtos.reset();
  recentes.reset();
  indice = null;
}
