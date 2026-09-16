import { describe, it, expect } from "vitest";
import {
  listMedications,
  searchMedications,
  getMedicationStats,
  getMedicationById,
  getRecentUpdates,
} from "./csv-loader";

describe("csv-loader", () => {
  it("loads and normalizes rows from the CSV", () => {
    const { items, total } = listMedications(1, 1);
    expect(total).toBeGreaterThan(0);
    const med = items[0];
    expect(med).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      registrationNumber: expect.any(String),
      holder: expect.any(String),
      cnpj: expect.any(String),
      processNumber: expect.any(String),
      category: "medicamento",
      status: "ativo",
    });
    expect(med.publicationDate === null || typeof med.publicationDate === "string").toBe(true);
  });

  it("filters by numeroRegistro, razaoSocial and cnpj", () => {
    const sample = listMedications(1, 1).items[0];
    expect(listMedications(1, 10, { numeroRegistro: sample.registrationNumber }).total).toBeGreaterThan(0);
    expect(listMedications(1, 10, { razaoSocial: sample.holder }).total).toBeGreaterThan(0);
    expect(listMedications(1, 10, { cnpj: sample.cnpj }).total).toBeGreaterThan(0);
  });

  it("dateRange narrows the result", () => {
    const all = listMedications(1, 1).total;
    const recent = listMedications(1, 1, { dateRange: 7 }).total;
    expect(recent).toBeLessThanOrEqual(all);
  });

  it("searchMedications matches name or registration number", () => {
    const sample = listMedications(1, 1).items[0];
    const byNumber = searchMedications(sample.registrationNumber);
    expect(byNumber.some((m) => m.id === sample.id)).toBe(true);
  });

  it("getMedicationStats returns consistent counters", () => {
    const stats = getMedicationStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.updatedLast7Days).toBeLessThanOrEqual(stats.updatedLast90Days);
  });

  it("getMedicationById returns null for an unknown id", () => {
    expect(getMedicationById(-1)).toBeNull();
  });

  it("getRecentUpdates returns at most 50 items", () => {
    expect(getRecentUpdates(180).length).toBeLessThanOrEqual(50);
  });
});
