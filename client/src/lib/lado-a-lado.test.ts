import { describe, expect, it } from "vitest";
import { ladoALado, PBR } from "./lado-a-lado";

describe("ladoALado", () => {
  it("separa parágrafos e remove ins de um lado e del do outro", () => {
    const html = `a <del>b</del> <ins>c</ins> d${PBR}e`;
    expect(ladoALado(html)).toEqual([
      { old: "a <del>b</del>  d", new: "a  <ins>c</ins> d", oldVazio: false, newVazio: false },
      { old: "e", new: "e", oldVazio: false, newVazio: false },
    ]);
  });

  it("marca o lado vazio quando o parágrafo inteiro foi inserido ou removido", () => {
    const html = `x${PBR}<ins>novo parágrafo</ins>${PBR}<del>velho</del>`;
    const pares = ladoALado(html);
    expect(pares).toHaveLength(3);
    expect(pares[1]).toMatchObject({ oldVazio: true, newVazio: false });
    expect(pares[2]).toMatchObject({ oldVazio: false, newVazio: true });
  });

  it("não separa parágrafo numa quebra dentro de del ou ins", () => {
    const html = `a <del>b ${PBR} c</del> d`;
    const pares = ladoALado(html);
    expect(pares).toHaveLength(1);
    expect(pares[0].old).toBe(`a <del>b ${PBR} c</del> d`);
    expect(pares[0].new).toBe("a  d");
  });

  it("preserva o marcador de omissão do contexto", () => {
    const html = `<del>a</del> <span class="omit">[… 12 palavras iguais …]</span> <ins>b</ins>`;
    const [p] = ladoALado(html);
    expect(p.old).toContain("omit");
    expect(p.new).toContain("omit");
  });

  it("texto sem mudanças vira um par idêntico", () => {
    expect(ladoALado("só texto")).toEqual([{ old: "só texto", new: "só texto", oldVazio: false, newVazio: false }]);
  });
});
