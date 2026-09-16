// Lado a lado derivado do mesmo HTML do diff: à esquerda o texto sem <ins> (versão antiga), à direita
// sem <del> (versão nova), um par por parágrafo. Função pura sobre a string, sem DOM, para ser
// testável; o HTML vem do exportador do buladiff (diff.py) e tem só <del>, <ins>, o marcador de
// parágrafo `.pbr` e o `.omit` de contexto, nunca aninhados entre si (uma quebra pode estar DENTRO
// de um <del>/<ins>; essa não separa parágrafo).

export const PBR = '<span class="pbr"></span>';

export interface ParLado {
  old: string;
  new: string;
  oldVazio: boolean;
  newVazio: boolean;
}

const SEGMENTO = /<del>[\s\S]*?<\/del>|<ins>[\s\S]*?<\/ins>|<span class="pbr"><\/span>/g;

function vazio(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim() === "";
}

export function ladoALado(html: string): ParLado[] {
  const paragrafos: string[][] = [[]];
  let ultimo = 0;
  const re = new RegExp(SEGMENTO.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const antes = html.slice(ultimo, m.index);
    if (antes) paragrafos[paragrafos.length - 1].push(antes);
    if (m[0] === PBR) paragrafos.push([]);
    else paragrafos[paragrafos.length - 1].push(m[0]);
    ultimo = m.index + m[0].length;
  }
  const resto = html.slice(ultimo);
  if (resto) paragrafos[paragrafos.length - 1].push(resto);

  return paragrafos.map((segs) => {
    const old = segs.filter((s) => !s.startsWith("<ins>")).join("");
    const nov = segs.filter((s) => !s.startsWith("<del>")).join("");
    return { old, new: nov, oldVazio: vazio(old), newVazio: vazio(nov) };
  });
}
