import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

type Outputs = inferRouterOutputs<AppRouter>;
/** Uma linha de `medications.list`, exatamente como o servidor devolve. */
export type MedicationRow = Outputs["medications"]["list"]["items"][number];
