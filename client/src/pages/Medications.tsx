import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  exportAsCSV,
  exportAsJSON,
  exportAsExcel,
  getExportFilename,
} from "@/lib/export";
import { toast } from "sonner";
import { trpc, type MedicationRow } from "@/lib/trpc";
import { Link } from "wouter";
import { produtoUrl } from "@/lib/bulas-format";


function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

export default function Medications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("todos");
  const [onlyReferencia, setOnlyReferencia] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Listagem de medicamentos
  const { data, isLoading, error } = trpc.medications.list.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    dateRange: selectedDateRange === "todos" ? undefined : parseInt(selectedDateRange),
    referencia: onlyReferencia || undefined,
  });

  // Estatísticas para painel superior
  const { data: stats } = trpc.medications.stats.useQuery();

  const utils = trpc.useUtils();

  const handleExport = useCallback(
    async (format: "excel" | "csv" | "json") => {
      try {
        // a API limita a 100 por página: percorre todas as páginas do filtro atual
        const filtros = {
          search: searchQuery || undefined,
          dateRange: selectedDateRange === "todos" ? undefined : parseInt(selectedDateRange),
          referencia: onlyReferencia || undefined,
        };
        const items: MedicationRow[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await utils.medications.list.fetch({ ...filtros, page, limit: 100 });
          items.push(...res.items);
          totalPages = res.totalPages;
          page++;
        } while (page <= totalPages);

        const filename = getExportFilename(format);

        if (format === "csv") exportAsCSV(items, filename);
        if (format === "json") exportAsJSON(items, filename);
        if (format === "excel") exportAsExcel(items, filename);

        toast.success("Exportação concluída", {
          description: `${items.length} registros exportados`,
        });
      } catch {
        toast.error("Erro ao exportar");
      }
    },
    [searchQuery, selectedDateRange, onlyReferencia, utils]
  );

  const medications: MedicationRow[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <MainLayout>
      {/* HEADER */}
      <section className="w-full py-10 border-b">
        <div className="container">
          <h1 className="text-3xl font-bold">Base de Dados - DBULÁRIO</h1>
          <p className="text-muted-foreground">Base com todos os medicamentos publicados no Bulário ANVISA.</p>
        </div>
      </section>

    {/* PAINEL SUPERIOR COM TOTAL E CARDS DE ATUALIZAÇÃO */}
{stats && (
  <section className="py-6 bg-blue-50 border-b">
    <div className="container grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* TOTAL DE MEDICAMENTOS */}
      <div className="bg-white shadow rounded p-4 flex flex-col items-center border-l-4 border-gray-500">
        <span className="text-2xl font-bold">{stats.total}</span>
        <span className="text-sm text-gray-600">Medicamentos monitorados</span>
      </div>

      {/* 7 dias */}
      <div className="bg-white shadow rounded p-4 flex flex-col items-center border-l-4 border-blue-500">
        <span className="text-2xl font-bold">{stats.updatedLast7Days}</span>
        <span className="text-sm text-gray-600">Bulas atualizadas nos últimos 7 dias</span>
      </div>

      {/* 30 dias */}
      <div className="bg-white shadow rounded p-4 flex flex-col items-center border-l-4 border-blue-500">
        <span className="text-2xl font-bold">{stats.updatedLast30Days}</span>
        <span className="text-sm text-gray-600">Bulas atualizadas nos últimos 30 dias</span>
      </div>

      {/* 90 dias */}
      <div className="bg-white shadow rounded p-4 flex flex-col items-center border-l-4 border-blue-500">
        <span className="text-2xl font-bold">{stats.updatedLast90Days}</span>
        <span className="text-sm text-gray-600">Bulas atualizadas nos últimos 90 dias</span>
      </div>
    </div>
  </section>
)}


      {/* BUSCA E FILTROS */}
      <section className="py-6 border-b">
        <div className="container space-y-4">
          <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5" />
              <Input
                className="pl-10"
                placeholder="Buscar por nome, registro ou titular"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <Select
              value={selectedDateRange}
              onValueChange={(v) => {
                setSelectedDateRange(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Atualização do bulário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer data</SelectItem>
                <SelectItem value="3">Últimos 3 dias</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={onlyReferencia ? "referencia" : "todos"}
              onValueChange={(v) => {
                setOnlyReferencia(v === "referencia");
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-64" title="Categoria regulatória 'Novo' no detalhe da ANVISA; cobre só os registros com histórico arquivado">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as categorias</SelectItem>
                <SelectItem value="referencia">Só medicamentos de referência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {onlyReferencia && (
            <p className="text-sm text-muted-foreground">
              O filtro usa a categoria regulatória do detalhe da ANVISA, coletada pelo buladiff. Por enquanto só
              cobre os registros com histórico de versões arquivado.
            </p>
          )}
        </div>
      </section>

       {/* TABELA */}
      <section className="py-4">
        <div className="container">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-600">{error.message}</div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100 text-blue-900">
                    <tr>
                      <th className="p-3 text-center">Produto</th>
                      <th className="p-3 text-center">Registro</th>
                      <th className="p-3 text-center">Titular</th>
                      <th className="p-3 text-center">Processo</th>
                      <th className="p-3 text-center">Atualização do bulário</th>
                      <th className="p-3 text-center">Inclusão na plataforma</th>
                      <th className="p-3 text-center">Consultas ANVISA</th>
                      <th className="p-3 text-center">Versões</th>

                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((m) => (
                      <tr key={m.id} className="border-t">
                        <td className="p-3 text-center">{m.name}</td>
                        <td className="p-3 font-mono text-xs text-center">{m.registrationNumber}</td>
                        <td className="p-3 text-center">{m.holder ?? "-"}</td>
                        <td className="p-3 font-mono text-xs text-center">{m.processNumber ?? "-"}</td>
                        <td className="p-3 text-center">{formatDate(m.publicationDate)}</td>
                        <td className="p-3 text-center">{formatDate(m.lastUpdate)}</td>
                      <td className="p-3 text-center">
                      <a
                        href={`https://consultas.anvisa.gov.br/#/bulario/q/?numeroRegistro=${m.registrationNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button 
                          size="sm" 
                          className="bg-blue-100 text-blue-900 hover:bg-blue-200"
                        >
                          Acessar
                        </Button>
                      </a>
                    </td>
                        <td className="p-3 text-center">
                          {m.bulas ? (
                            <Link href={produtoUrl(m.registrationNumber)}>
                              <Button size="sm" variant="outline" title={`${m.bulas.nVersoes} versões arquivadas`}>
                                Ver versões ({m.bulas.nVersoes})
                              </Button>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground" title="Histórico ainda não arquivado">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO E ITENS POR PÁGINA */}
              <div className="flex flex-col md:flex-row md:justify-between mt-4 gap-2">
                <div className="flex gap-2 items-center">
                  <span>Página {currentPage} de {totalPages}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Itens por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      
    </MainLayout>
  );
}
