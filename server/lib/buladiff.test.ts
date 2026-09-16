import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getIndice,
  getProduto,
  getProdutos,
  getRecentes,
  resetCache,
  resumo,
  TTL_FALHA_MS,
  TTL_MS,
} from "./buladiff";
import type { Produto, Recente } from "./buladiff-types";

const produto: Produto = {
  registro: "100430911",
  idProduto: 374550,
  nome: "losartana potássica",
  empresa: "EUROFARMA LABORATORIOS S.A.",
  cnpj: "61190096000192",
  principio_ativo: "losartana potássica",
  classes: ["ANTAGONISTAS DA ANGIOTENSINA II"],
  categoria: "Genérico",
  referencia: "COZAAR",
  apresentacoes: ["50 MG COM REV CT BL AL PLAS INC X 30"],
  ultima_publicacao: "2025-12-18",
  n_versoes: 4,
  diffs: ["0457269251-0773629254-vp", "0773629254-1620249251-vps"],
};

const recente: Recente = {
  registro: "100430911",
  nome: "losartana potássica",
  empresa: "EUROFARMA LABORATORIOS S.A.",
  slug: "0773629254-1620249251-vps",
  tipo: "vps",
  para_data: "2025-12-18",
  alteradas: ["4", "9"],
  declarado: ["4"],
};

type Handler = (url: string) => Response | Promise<Response>;

function mockFetch(handler: Handler) {
  const fn = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    void init;
    return Promise.resolve(handler(String(input)));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const t0 = 1_000_000;

describe("buladiff", () => {
  beforeEach(() => resetCache());
  afterEach(() => vi.unstubAllGlobals());

  it("lê produtos.json e monta o índice por registro", async () => {
    const fetch = mockFetch((url) => (url.endsWith("/produtos.json") ? json([produto]) : json([])));
    expect(await getProdutos()).toEqual([produto]);
    expect((await getIndice())?.get("100430911")).toEqual(produto);
    expect(await getProduto("100430911")).toEqual(produto);
    expect(await getProduto("000000000")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe("https://vasfvitor.github.io/buladiff/data/produtos.json");
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("reaproveita o cache dentro do TTL e recarrega depois", async () => {
    const fetch = mockFetch(() => json([produto]));
    await getProdutos(t0);
    await getProdutos(t0 + TTL_MS / 2);
    expect(fetch).toHaveBeenCalledTimes(1);
    await getProdutos(t0 + TTL_MS + 1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sem dado nenhum: devolve vazio, índice nulo, e não tenta de novo antes do TTL de falha", async () => {
    const fetch = mockFetch(() => {
      throw new Error("rede");
    });
    expect(await getProdutos(t0)).toEqual([]);
    expect(await getIndice(t0)).toBeNull();
    expect(await getProdutos(t0 + TTL_FALHA_MS / 2)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await getProdutos(t0 + TTL_FALHA_MS + 1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("falha depois de um dado bom: mantém o dado antigo e tenta de novo no TTL de falha", async () => {
    let ok = true;
    const fetch = mockFetch(() => (ok ? json([produto]) : new Response("x", { status: 503 })));
    await getProdutos(t0);
    ok = false;
    const t1 = t0 + TTL_MS + 1;
    expect(await getProdutos(t1)).toEqual([produto]);
    expect((await getIndice(t1))?.size).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await getProdutos(t1 + TTL_FALHA_MS + 1);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("chamadas concorrentes com cache frio disparam um único fetch", async () => {
    let resolve!: (r: Response) => void;
    const fetch = mockFetch(() => new Promise<Response>((r) => (resolve = r)));
    const p = Promise.all([getIndice(t0), getIndice(t0), getProdutos(t0)]);
    resolve(json([produto]));
    const [i1, i2, lista] = await p;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(i1).toBe(i2);
    expect(lista).toEqual([produto]);
  });

  it("devolve vazio em resposta HTTP de erro", async () => {
    mockFetch(() => new Response("nope", { status: 404 }));
    expect(await getRecentes()).toEqual([]);
  });

  it("lê recentes.json", async () => {
    mockFetch((url) => (url.endsWith("/recentes.json") ? json([recente]) : json([])));
    expect(await getRecentes()).toEqual([recente]);
  });

  it("resumo pega o último diff", () => {
    expect(resumo(produto)).toEqual({
      nVersoes: 4,
      ultimaPublicacao: "2025-12-18",
      ultimoDiff: "0773629254-1620249251-vps",
    });
    expect(resumo({ ...produto, diffs: [] }).ultimoDiff).toBeNull();
  });
});
