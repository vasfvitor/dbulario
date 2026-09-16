import { Badge } from "@/components/ui/badge";

/** Explica o chip âmbar uma única vez, com o mesmo texto em todas as páginas. */
export default function LegendaDeclarada() {
  return (
    <span>
      <Badge className="bg-amber-500 text-black">4</Badge> = seção declarada pela empresa na tabela de histórico do PDF
    </span>
  );
}
