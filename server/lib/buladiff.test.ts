import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIndice, getProduto, getProdutos, getRecentes, resetCache, resumo } from "./buladiff";
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

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const fn = vi.fn((input: string | URL | Request) => Promise.resolve(handler(String(input))));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("buladiff", () => {
  beforeEach(() => resetCache());
  afterEach(() => vi.unstubAllGlobals());

  it("lê produtos.json e monta o índice por registro", async () => {
    const fetch = mockFetch((url) => (url.endsWith("/produtos.json") ? json([produto]) : json([])));
    expect(await getProdutos()).toEqual([produto]);
    expect((await getIndice()).get("100430911")).toEqual(produto);
    expect(await getProduto("100430911")).toEqual(produto);
    expect(await getProduto("000000000")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe("https://vasfvitor.github.io/buladiff/data/produtos.json");
  });

  it("reaproveita o cache dentro do TTL e recarrega depois", async () => {
    const fetch = mockFetch(() => json([produto]));
    const t0 = 1_000_000;
    await getProdutos(t0);
    await getProdutos(t0 + 30 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await getProdutos(t0 + 2 * 60 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("devolve vazio quando a rede falha e não guarda a falha no cache", async () => {
    let falhas = 0;
    const fetch = mockFetch(() => {
      falhas++;
      if (falhas === 1) throw new Error("rede");
      return json([produto]);
    });
    expect(await getProdutos()).toEqual([]);
    // a falha não ficou cacheada: a próxima chamada tenta de novo e acha os dados
    expect((await getIndice()).size).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
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
