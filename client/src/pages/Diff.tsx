import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import SecaoChips from "@/components/bulas/SecaoChips";
import LegendaDeclarada from "@/components/bulas/LegendaDeclarada";
import DiffTexto from "@/components/bulas/DiffTexto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDetalhe, type DocumentoDiff } from "@/lib/buladiff-client";
import { anvisaUrl, dataBR, nomeSecao, produtoUrl, TIPO_NOME } from "@/lib/bulas-format";

const MODO_KEY = "diff-modo";
const ESTREITO = "(max-width: 48rem)";

/** Preferência de lado a lado: ?modo=lado na URL, senão o que ficou guardado no navegador. */
function modoInicial(): boolean {
  try {
    const daUrl = new URLSearchParams(window.location.search).get("modo");
    if (daUrl) return daUrl === "lado";
    return localStorage.getItem(MODO_KEY) === "lado";
  } catch {
    return false;
  }
}

function useEstreito(): boolean {
  const [estreito, setEstreito] = useState(() => window.matchMedia(ESTREITO).matches);
  useEffect(() => {
    const mq = window.matchMedia(ESTREITO);
    const on = () => setEstreito(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return estreito;
}

/** Seção completa sob demanda: só entra no DOM quando o usuário abre (a página tem MBs de HTML). */
function SecaoCompleta({ html, lado }: { html: string; lado: boolean }) {
  const [aberta, setAberta] = useState(false);
  return (
    <details onToggle={(e) => setAberta((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="text-sm text-muted-foreground cursor-pointer">ver a seção completa</summary>
      {aberta && <DiffTexto html={html} lado={lado} />}
    </details>
  );
}

function TituloApresentacao({ doc }: { doc: DocumentoDiff }) {
  return (
    <h3 className="doc-title text-lg font-semibold mt-8 pb-1 border-b-2">
      Apresentação {doc.indice}: <span className="text-muted-foreground font-normal">{doc.rotulo}</span>
    </h3>
  );
}

export default function Diff() {
  const { registro = "", slug = "" } = useParams<{ registro: string; slug: string }>();
  const { data, isLoading, error } = useDetalhe(registro);
  const [modoLado, setModoLado] = useState(modoInicial);
  const estreito = useEstreito();
  const lado = modoLado && !estreito; // em telas estreitas fica sempre unificado

  // âncora (#sec-vps-4) só existe depois que o HTML carrega; espera o layout da página assentar
  useEffect(() => {
    if (!data || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    const rolar = () => document.getElementById(id)?.scrollIntoView();
    // duas tentativas: logo após o commit e depois que fontes e layout da página assentam
    const t1 = setTimeout(rolar, 50);
    const t2 = setTimeout(rolar, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data]);

  function alternar() {
    const novo = !modoLado;
    setModoLado(novo);
    try {
      localStorage.setItem(MODO_KEY, novo ? "lado" : "unificado");
    } catch {
      /* sem localStorage: só não guarda */
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container flex justify-center py-24"><Loader2 className="animate-spin" /></div>
      </MainLayout>
    );
  }
  const diff = data?.diffs.find((d) => d.slug === slug);
  if (error || !data || !diff) {
    return (
      <MainLayout>
        <section className="container py-16">
          <h1 className="text-2xl font-bold mb-2">Registro {registro}</h1>
          <p className="text-muted-foreground">{error?.message ?? "Este diff não existe no arquivo."}</p>
          <p className="mt-4"><Link href={data ? produtoUrl(registro) : "/medicamentos"} className="underline">Voltar</Link></p>
        </section>
      </MainLayout>
    );
  }

  const { meta } = data;
  const multi = diff.documentos.length > 1;
  const docs = diff.documentos.map((doc) => ({ ...doc, alteradas: doc.secoes.filter((s) => s.alterada) }));
  const totalAlteradas = docs.reduce((n, d) => n + d.alteradas.length, 0);

  return (
    <MainLayout>
      <section className="w-full py-10 border-b">
        <div className="container">
          <p className="text-muted-foreground">
            <Link href={produtoUrl(meta.registro)} className="underline">{meta.nome}</Link> · {meta.empresa}
          </p>
          <h1 className="text-3xl font-bold">
            {TIPO_NOME[diff.tipo]}: {dataBR(diff.de_data)} → {dataBR(diff.para_data)}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            expediente {diff.de} → {diff.para} ·{" "}
            <a href={anvisaUrl(meta.idProduto)} target="_blank" rel="noopener noreferrer" className="underline font-sans">
              PDFs no Bulário da ANVISA
            </a>
          </p>
        </div>
      </section>

      <section className="py-6 border-b bg-card">
        <div className="container space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <strong>Seções alteradas:</strong>
            <SecaoChips tipo={diff.tipo} secoes={diff.alteradas} declaradas={diff.declarado} href="" />
          </div>
          <p className="text-sm text-muted-foreground">
            <LegendaDeclarada />
            {diff.declarado.length === 0 && " — este PDF não traz a tabela de histórico"}
            {multi && `. ${docs.length} apresentações no mesmo PDF, comparadas uma a uma`}.
          </p>
        </div>
      </section>

      <section className="py-8 diff">
        <div className="container">
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <h2 className="text-2xl font-semibold mr-auto">Alterações</h2>
            <span><del>removido</del></span>
            <span><ins>adicionado</ins></span>
            <Button
              size="sm"
              variant={modoLado ? "default" : "outline"}
              aria-pressed={modoLado}
              onClick={alternar}
              disabled={estreito}
              title={estreito ? "Lado a lado só em telas largas" : "Versão antiga à esquerda, nova à direita"}
            >
              {modoLado ? "unificado" : "lado a lado"}
            </Button>
          </div>
          {totalAlteradas === 0 && <p className="text-muted-foreground">O texto extraído das duas versões é idêntico.</p>}
          {docs.map((doc) => (
            <div key={doc.indice}>
              {multi && <TituloApresentacao doc={doc} />}
              {doc.alteradas.map((s) => (
                <section key={s.ancora} className="mt-6">
                  <h3 id={s.ancora} className="text-lg font-semibold flex flex-wrap items-center gap-2">
                    {multi && <span className="text-muted-foreground font-normal text-sm">Apresentação {doc.indice} ·</span>}
                    {nomeSecao(diff.tipo, s.secao)}
                    {s.declarada && <Badge className="bg-amber-500 text-black" title="declarada pela empresa">{s.secao}</Badge>}
                    <span className="text-muted-foreground font-normal text-sm">{s.palavras} palavras</span>
                  </h3>
                  {s.contexto ? (
                    <div className="trecho">
                      <DiffTexto html={s.contexto} lado={lado} className="contexto" />
                      <SecaoCompleta html={s.html} lado={lado} />
                    </div>
                  ) : (
                    <DiffTexto html={s.html} lado={lado} />
                  )}
                </section>
              ))}
              {multi && doc.alteradas.length === 0 && <p className="text-muted-foreground mt-2">Sem alterações nesta apresentação.</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="py-8 border-t">
        <div className="container">
          <h2 className="text-2xl font-semibold mb-4">Todas as seções</h2>
          {docs.map((doc) => (
            <div key={doc.indice}>
              {multi && <TituloApresentacao doc={doc} />}
              <div className="overflow-x-auto border rounded mt-3">
                <table className="w-full text-sm resumo">
                  <thead className="bg-blue-100 text-blue-900">
                    <tr>
                      <th className="p-2 text-left">Seção</th>
                      <th className="p-2 text-right">Palavras alteradas</th>
                      <th className="p-2 text-right hidden sm:table-cell">Semelhança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.secoes.map((s) => (
                      <tr key={s.ancora} className={`border-t ${s.alterada ? "" : "text-muted-foreground"}`}>
                        <td className="p-2">
                          {s.alterada ? <a href={`#${s.ancora}`}>{nomeSecao(diff.tipo, s.secao)}</a> : nomeSecao(diff.tipo, s.secao)}
                        </td>
                        <td className="p-2 text-right font-mono">{s.palavras || ""}</td>
                        <td className="p-2 text-right font-mono hidden sm:table-cell">{Math.round(s.ratio * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-sm text-muted-foreground mt-4">
            {diff.marcado
              ? "Texto extraído da estrutura do PDF (parágrafos e células de tabela); ainda assim, na dúvida, o PDF no Bulário é a fonte."
              : "PDF sem marcação de estrutura: o texto foi extraído linha a linha, sem parágrafos, e quebras de página ou tabelas podem gerar diferenças que não existem na bula. Na dúvida, o PDF no Bulário é a fonte."}
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
