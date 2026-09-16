import { Link, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import SecaoChips from "@/components/bulas/SecaoChips";
import LegendaDeclarada from "@/components/bulas/LegendaDeclarada";
import { useDetalhe, type Diff } from "@/lib/buladiff-client";
import { anvisaUrl, dataBR, diffUrl, formatCnpj, TIPO_CURTO, TIPO_NOME } from "@/lib/bulas-format";

const SITUACAO_PADRAO = "Aditado ao processo"; // situação de quase toda versão; só vale mostrar as outras

export default function Produto() {
  const { registro = "" } = useParams<{ registro: string }>();
  const { data, isLoading, error } = useDetalhe(registro);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container flex justify-center py-24"><Loader2 className="animate-spin" /></div>
      </MainLayout>
    );
  }
  if (error || !data) {
    return (
      <MainLayout>
        <section className="container py-16">
          <h1 className="text-2xl font-bold mb-2">Registro {registro}</h1>
          <p className="text-muted-foreground">{error?.message ?? "Não foi possível carregar o histórico."}</p>
          <p className="mt-4"><Link href="/medicamentos" className="underline">Voltar para a base de medicamentos</Link></p>
        </section>
      </MainLayout>
    );
  }

  const { meta, versoes, diffs } = data;
  // diffs que chegam em cada versão (a versão "para"), na ordem paciente → profissional
  const chegando = new Map<string, Diff[]>();
  for (const d of diffs) chegando.set(d.para, [...(chegando.get(d.para) ?? []), d]);
  const ordemTipo = (d: Diff) => (d.tipo === "vp" ? 0 : 1);

  return (
    <MainLayout>
      <section className="w-full py-10 border-b">
        <div className="container">
          <h1 className="text-3xl font-bold">{meta.nome}</h1>
          <p className="text-muted-foreground">
            {meta.empresa} · CNPJ {formatCnpj(meta.cnpj)} · registro {meta.registro} ·{" "}
            <a href={anvisaUrl(meta.idProduto)} target="_blank" rel="noopener noreferrer" className="underline">
              ver no Bulário da ANVISA
            </a>
          </p>
          {meta.principio_ativo && (
            <p className="text-muted-foreground">
              {meta.principio_ativo.toLowerCase()}
              {meta.categoria && <span> · {meta.categoria.toLowerCase()}</span>}
              {meta.referencia && meta.referencia.toUpperCase() !== meta.nome.toUpperCase() && (
                <span> · referência: {meta.referencia}</span>
              )}
              {meta.classes.length > 0 && <span> · {meta.classes.map((c) => c.toLowerCase()).join(", ")}</span>}
            </p>
          )}
          {meta.apresentacoes.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {meta.apresentacoes.length} {meta.apresentacoes.length === 1 ? "apresentação registrada" : "apresentações registradas"}
              </summary>
              <ul className="list-disc pl-6 mt-1 text-muted-foreground">
                {meta.apresentacoes.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </details>
          )}
        </div>
      </section>

      <section className="py-8">
        <div className="container">
          <h2 className="text-2xl font-semibold mb-1">Versões</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Seções alteradas em relação à versão anterior; <LegendaDeclarada />
          </p>
          <ol className="relative border-l border-border ml-2 space-y-6">
            {[...versoes].reverse().map((v) => {
              const lista = [...(chegando.get(v.expediente) ?? [])].sort((a, b) => ordemTipo(a) - ordemTipo(b));
              return (
                <li key={v.expediente} className="pl-6 relative">
                  <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-primary" />
                  <div className="font-semibold">{dataBR(v.data)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    expediente {v.expediente}
                    {v.situacao && v.situacao !== SITUACAO_PADRAO && <span> · {v.situacao}</span>}
                    {v.republicada.length > 0 && <span> · relistada em {v.republicada.map(dataBR).join(", ")}</span>}
                  </div>
                  {lista.length === 0 ? (
                    <div className="text-muted-foreground text-sm mt-1">
                      {v.repetida ? "mesmos PDFs da versão anterior" : "primeira versão arquivada"}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {lista.map((x) => (
                        <div key={x.slug} className="flex flex-wrap items-center gap-2 text-sm">
                          <Link href={diffUrl(meta.registro, x.slug)} title={TIPO_NOME[x.tipo]} className="font-medium underline min-w-24">
                            {TIPO_CURTO[x.tipo]}
                          </Link>
                          <SecaoChips tipo={x.tipo} secoes={x.alteradas} declaradas={x.declarado} href={diffUrl(meta.registro, x.slug)} />
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </MainLayout>
  );
}
