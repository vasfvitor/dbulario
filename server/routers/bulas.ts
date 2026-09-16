import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc.js";
import { getProduto, getRecentes } from "../lib/buladiff.js";

// Versões e diffs das bulas, vindos do buladiff. As listas leves passam por aqui; o detalhe de um
// produto (MBs de HTML) o navegador busca direto em `${dataUrl}/produtos/<registro>.json`.
export const bulasRouter = router({
  /** Entrada do produto em produtos.json, ou null se o registro não está arquivado. */
  produto: publicProcedure
    .input(z.object({ registro: z.string().regex(/^\d{9,13}$/) }))
    .query(({ input }) => getProduto(input.registro)),

  /** Últimos diffs publicados, já ordenados do mais novo para o mais antigo. */
  recentes: publicProcedure.query(() => getRecentes()),
});
