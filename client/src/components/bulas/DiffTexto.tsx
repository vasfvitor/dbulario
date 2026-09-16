import { useMemo } from "react";
import { ladoALado } from "@/lib/lado-a-lado";

interface Props {
  html: string;
  lado: boolean;
  className?: string;
}

/** Texto de uma seção do diff: unificado (<del>/<ins> inline) ou em duas colunas, uma por parágrafo. */
export default function DiffTexto({ html, lado, className = "" }: Props) {
  const pares = useMemo(() => (lado ? ladoALado(html) : []), [html, lado]);
  if (!lado) return <div className={`texto ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <div className={`texto lado ${className}`}>
      <div className="split">
        {pares.map((p, i) => (
          <>
            <div key={`o${i}`} className={`old${p.oldVazio ? " vazio" : ""}`} dangerouslySetInnerHTML={{ __html: p.old }} />
            <div key={`n${i}`} className={`new${p.newVazio ? " vazio" : ""}`} dangerouslySetInnerHTML={{ __html: p.new }} />
          </>
        ))}
      </div>
    </div>
  );
}
