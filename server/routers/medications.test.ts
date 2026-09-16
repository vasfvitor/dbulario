import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

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
