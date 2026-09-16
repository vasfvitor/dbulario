// Contrato dos JSON que o buladiff exporta (`bulario export`) e publica em
// https://vasfvitor.github.io/buladiff/data/. Cópia fiel de site/src/lib/data.ts do buladiff;
// o servidor lê produtos.json e recentes.json, o navegador lê produtos/<registro>.json.

export interface Produto {
  registro: string;
  idProduto: number;
  nome: string;
  empresa: string;
  cnpj: string;
  principio_ativo: string;
  classes: string[]; // classes terapêuticas
  categoria: string; // categoria regulatória (Genérico, Similar, Novo…)
  referencia: string; // medicamento de referência
  apresentacoes: string[];
  ultima_publicacao: string;
  n_versoes: number;
  diffs: string[]; // slugs, na ordem cronológica
}

export interface Versao {
  expediente: string;
  data: string;
  republicada: string[];
  situacao: string;
  declarado: Record<string, string[]>;
  repetida: boolean; // mesmos PDFs de uma versão anterior (expediente novo, texto igual)
}

export interface SecaoDiff {
  secao: string;
  alterada: boolean;
  declarada: boolean;
  palavras: number;
  ratio: number;
  html: string;
  contexto: string; // "" quando a seção é curta (html já é o contexto)
  ancora: string;
}

export interface DocumentoDiff {
  indice: number;
  rotulo: string;
  secoes: SecaoDiff[];
}

export type TipoBula = "vp" | "vps";

export interface Diff {
  slug: string;
  de: string;
  para: string;
  de_data: string;
  para_data: string;
  tipo: TipoBula;
  alteradas: string[];
  declarado: string[];
  marcado: boolean; // as duas versões vieram de PDF marcado (parágrafos preservados)
  documentos: DocumentoDiff[];
}

export interface Detalhe {
  meta: Produto;
  versoes: Versao[];
  diffs: Diff[];
}

export interface Recente {
  registro: string;
  nome: string;
  empresa: string;
  slug: string;
  tipo: TipoBula;
  para_data: string;
  alteradas: string[];
  declarado: string[];
}

/** Resumo que a listagem de medicamentos carrega por registro arquivado. */
export interface ResumoBulas {
  nVersoes: number;
  ultimaPublicacao: string;
  ultimoDiff: string | null; // slug
}
