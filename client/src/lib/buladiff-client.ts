// Detalhe de um produto (versões e diffs, MBs de HTML) buscado direto do GitHub Pages do buladiff,
// sem passar pela função serverless (limite de 4,5 MB por resposta na Vercel).
import { useQuery } from "@tanstack/react-query";
import { normalizeDataUrl, type Detalhe } from "../../../server/lib/buladiff-types";

export type { Detalhe, Diff, DocumentoDiff, Produto, Recente, SecaoDiff, Versao } from "../../../server/lib/buladiff-types";

export function dataUrl(): string {
  return normalizeDataUrl(import.meta.env.VITE_BULADIFF_DATA_URL);
}

export function detalheUrl(registro: string): string {
  return `${dataUrl()}/produtos/${registro}.json`;
}

export function useDetalhe(registro: string) {
  return useQuery({
    queryKey: ["buladiff", "detalhe", registro],
    queryFn: async (): Promise<Detalhe> => {
      let res: Response;
      try {
        res = await fetch(detalheUrl(registro));
      } catch {
        // rede fora, ou origem sem CORS (servidor estático local sem o header)
        throw new Error("Não foi possível acessar o arquivo de versões. Verifique a conexão ou a origem dos dados (VITE_BULADIFF_DATA_URL).");
      }
      if (res.status === 404) throw new Error("Este registro ainda não está arquivado.");
      if (!res.ok) throw new Error(`Falha ao carregar o histórico (${res.status}).`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: (count, error) => count < 2 && !/não está arquivado/.test(error.message),
  });
}
