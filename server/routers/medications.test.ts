import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { resetCache } from "../lib/buladiff";
import type { Produto } from "../lib/buladiff-types";

function createTestContext(): TrpcContext {
  return {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("medications router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller(createTestContext());
  });

  // sem rede nos testes: o buladiff responde vazio, salvo onde o teste diz o contrário
  beforeEach(() => {
    resetCache();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("[]", { status: 200 }))));
  });
  afterEach(() => vi.unstubAllGlobals());

  describe("list", () => {
    it("returns a page with the pagination envelope", async () => {
      const result = await caller.medications.list({ page: 1, limit: 10 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBeGreaterThan(0);
      expect(result.totalPages).toBeGreaterThan(0);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it("filters by search term", async () => {
      const result = await caller.medications.list({ page: 1, limit: 10, search: "dipirona" });
      expect(result.total).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.name.toLowerCase()).toContain("dipirona");
      }
    });

    it("marks archived registrations with the buladiff summary", async () => {
      const sample = (await caller.medications.list({ page: 1, limit: 2 })).items;
      const arquivado: Produto = {
        registro: sample[0].registrationNumber,
        idProduto: sample[0].id,
        nome: sample[0].name,
        empresa: sample[0].holder,
        cnpj: sample[0].cnpj,
        principio_ativo: "",
        classes: [],
        categoria: "",
        referencia: "",
        apresentacoes: [],
        ultima_publicacao: "2026-01-01",
        n_versoes: 3,
        diffs: ["a-b-vp", "a-b-vps"],
      };
      resetCache();
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(new Response(JSON.stringify([arquivado]), { status: 200 })))
      );
      const result = await caller.medications.list({ page: 1, limit: 2 });
      expect(result.items[0].bulas).toEqual({
        nVersoes: 3,
        ultimaPublicacao: "2026-01-01",
        ultimoDiff: "a-b-vps",
      });
      expect(result.items[1].bulas).toBeNull();
    });

    it("pages do not overlap", async () => {
      const page1 = await caller.medications.list({ page: 1, limit: 5 });
      const page2 = await caller.medications.list({ page: 2, limit: 5 });
      const ids1 = new Set(page1.items.map((m) => m.id));
      for (const item of page2.items) expect(ids1.has(item.id)).toBe(false);
    });
  });

  describe("search", () => {
    it("caps results at the requested limit", async () => {
      const result = await caller.medications.search({ query: "a", limit: 10 });
      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe("stats", () => {
    it("returns the 7/30/90 day counters", async () => {
      const result = await caller.medications.stats();
      expect(result.total).toBeGreaterThan(0);
      expect(result.updatedLast7Days).toBeLessThanOrEqual(result.updatedLast30Days);
      expect(result.updatedLast30Days).toBeLessThanOrEqual(result.updatedLast90Days);
      expect(result.updatedLast90Days).toBeLessThanOrEqual(result.total);
    });
  });

  describe("recentUpdates", () => {
    it("returns at most 50 items sorted by publication date", async () => {
      const result = await caller.medications.recentUpdates({ days: 90 });
      expect(result.length).toBeLessThanOrEqual(50);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].publicationDate!.getTime()).toBeGreaterThanOrEqual(
          result[i].publicationDate!.getTime()
        );
      }
    });
  });

  describe("getById", () => {
    it("finds a medication by idProduto", async () => {
      const first = (await caller.medications.list({ page: 1, limit: 1 })).items[0];
      const result = await caller.medications.getById({ idProduto: first.id });
      expect(result?.id).toBe(first.id);
      expect(result?.registrationNumber).toBe(first.registrationNumber);
    });

    it("returns null for an unknown id", async () => {
      expect(await caller.medications.getById({ idProduto: 1 })).toBeNull();
    });
  });
});

describe("medications.list com o buladiff fora", () => {
  const caller = appRouter.createCaller(createTestContext());

  beforeEach(() => {
    resetCache();
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("rede"))));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("a listagem continua, sem resumo de bulas", async () => {
    const result = await caller.medications.list({ page: 1, limit: 3 });
    expect(result.total).toBeGreaterThan(0);
    for (const item of result.items) expect(item.bulas).toBeNull();
  });
});

describe("bulas router", () => {
  const caller = appRouter.createCaller(createTestContext());

  beforeEach(() => resetCache());
  afterEach(() => vi.unstubAllGlobals());

  it("produto returns null when the registration is not archived", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("[]", { status: 200 }))));
    expect(await caller.bulas.produto({ registro: "100430911" })).toBeNull();
  });

  it("produto rejects a malformed registration", async () => {
    await expect(caller.bulas.produto({ registro: "abc" })).rejects.toThrow();
  });
});
