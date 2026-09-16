import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { nomeSecao, secaoId } from "@/lib/bulas-format";

interface Props {
  tipo: string;
  secoes: string[];
  declaradas?: string[];
  /** Página do diff para onde cada chip aponta; "" para âncora na própria página; ausente = só texto. */
  href?: string;
}

/** Chips de seção, na ordem em que o exportador entrega. As declaradas pela empresa levam destaque âmbar. */
export default function SecaoChips({ tipo, secoes, declaradas = [], href }: Props) {
  if (secoes.length === 0) return <span className="text-muted-foreground">sem alterações</span>;
  const declaradasSet = new Set(declaradas);
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {secoes.map((s) => {
        const declarada = declaradasSet.has(s);
        const title = nomeSecao(tipo, s) + (declarada ? " — declarada pela empresa" : "");
        const chip = (
          <Badge variant={declarada ? "default" : "secondary"} className={declarada ? "bg-amber-500 text-black hover:bg-amber-400" : ""} title={title}>
            {s}
          </Badge>
        );
        if (href === undefined) return <span key={s}>{chip}</span>;
        const to = `${href}#${secaoId(tipo, s)}`;
        return href === "" ? (
          <a key={s} href={to}>{chip}</a>
        ) : (
          <Link key={s} href={to}>{chip}</Link>
        );
      })}
    </span>
  );
}
