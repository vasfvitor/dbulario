import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc.js";
import {
  listMedications,
  searchMedications,
  getMedicationStats,
  getMedicationById,
  getRecentUpdates,
} from "../lib/csv-loader.js";
import { getIndice, resumo } from "../lib/buladiff.js";

export const medicationsRouter = router({
  /* -------------------- LISTAGEM PRINCIPAL -------------------- */
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),

        /**
         * Busca textual:
         * - aceita múltiplos termos separados por vírgula ou espaço
         * - nomeProduto, numeroRegistro, razaoSocial, cnpj, numProcesso
         */
        search: z.string().optional(),

        // Filtros diretos (opcionais)
        numeroRegistro: z.string().optional(),
        razaoSocial: z.string().optional(),
        cnpj: z.string().optional(),

        /**
         * Intervalo em dias
         * baseado em `data` (data de atualização)
         */
        dateRange: z.number().int().min(0).max(180).optional(),

        /**
         * Só medicamentos de referência (categoria regulatória "Novo" no detalhe da ANVISA).
         * A categoria vem do buladiff, então cobre só os registros arquivados lá.
         */
        referencia: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const indice = await getIndice();
      if (input.referencia && !indice) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            "O filtro de medicamentos de referência depende dos dados do buladiff, indisponíveis agora. Tente de novo em instantes.",
        });
      }
      const referencia =
        input.referencia && indice
          ? new Set(Array.from(indice.values()).filter((p) => p.categoria === "Novo").map((p) => p.registro))
        : undefined;
      const page = listMedications(input.page, input.limit, {
        search: input.search,
        numeroRegistro: input.numeroRegistro,
        razaoSocial: input.razaoSocial,
        cnpj: input.cnpj,
        dateRange: input.dateRange,
        registros: referencia,
      });
      // registros arquivados no buladiff ganham o resumo das versões; os demais, null
      return {
        ...page,
        items: page.items.map((m) => {
          const p = indice?.get(m.registrationNumber);
          return { ...m, bulas: p ? resumo(p) : null };
        }),
      };
    }),

  /* -------------------- BUSCA RÁPIDA -------------------- */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(20).default(10),
      })
    )
    .query(({ input }) => {
      return searchMedications(input.query, {
        limit: input.limit,
      });
    }),

  /* -------------------- ESTATÍSTICAS -------------------- */
  stats: publicProcedure.query(() => {
    return getMedicationStats();
  }),

  /* -------------------- ATUALIZAÇÕES RECENTES -------------------- */
  recentUpdates: publicProcedure
    .input(
      z.object({
        days: z.number().int().positive().max(180).default(7),
      })
    )
    .query(({ input }) => {
      return getRecentUpdates(input.days);
    }),

  /* -------------------- DETALHE POR ID -------------------- */
  getById: publicProcedure
    .input(
      z.object({
        idProduto: z.number().int().positive(),
      })
    )
    .query(({ input }) => {
      return getMedicationById(input.idProduto);
    }),
});
