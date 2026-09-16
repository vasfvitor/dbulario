// Detalhe de um produto (versões e diffs, MBs de HTML) buscado direto do GitHub Pages do buladiff,
// sem passar pela função serverless (limite de 4,5 MB por resposta na Vercel).
import { useQuery } from "@tanstack/react-query";
import type { Detalhe } from "../../../server/lib/buladiff-types";

export type { Detalhe, Diff, DocumentoDiff, Produto, Recente, SecaoDiff, Versao } from "../../../server/lib/buladiff-types";

const DEFAULT_DATA_URL = "https://vasfvitor.github.io/buladiff/data";

export function dataUrl(): string {
  return (import.meta.env.VITE_BULADIFF_DATA_URL || DEFAULT_DATA_URL).replace(/\/+$/, "");
}

export function detalheUrl(registro: string): string {
  return `${dataUrl()}/produtos/${registro}.json`;
}

export function useDetalhe(registro: string) {
  return useQuery({
    queryKey: ["buladiff", "detalhe", registro],
    queryFn: async (): Promise<Detalhe> => {
      const res = await fetch(detalheUrl(registro));
      if (res.status === 404) throw new Error("Este registro ainda não está arquivado.");
      if (!res.ok) throw new Error(`Falha ao carregar o histórico (${res.status}).`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: (count, error) => count < 2 && !/não está arquivado/.test(error.message),
  });
}
