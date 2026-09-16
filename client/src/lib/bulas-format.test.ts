import { describe, expect, it } from "vitest";
import { dataBR, diffUrl, formatCnpj, nomeSecao, produtoUrl, secaoId } from "./bulas-format";

describe("bulas-format", () => {
  it("nomeSecao numera as seções numéricas e usa travessão nas romanas", () => {
    expect(nomeSecao("vp", "4")).toBe("4. O que devo saber antes de usar este medicamento?");
    expect(nomeSecao("vps", "III")).toBe("III – Dizeres legais");
    expect(nomeSecao("vps", "99")).toBe("99");
  });

  it("dataBR e formatCnpj", () => {
    expect(dataBR("2025-12-18")).toBe("18/12/2025");
    expect(dataBR("2025-12-18T11:36:17.000-0200")).toBe("18/12/2025");
    expect(formatCnpj("61190096000192")).toBe("61.190.096/0001-92");
    expect(formatCnpj("1190096000192")).toBe("01.190.096/0001-92");
  });

  it("rotas e âncoras", () => {
    expect(produtoUrl("100430911")).toBe("/bulas/100430911");
    expect(diffUrl("100430911", "a-b-vp")).toBe("/bulas/100430911/a-b-vp");
    expect(secaoId("vps", "4")).toBe("sec-vps-4");
  });
});
