import type { BadgeVariant } from "../components/ui/Badge";
import type { OsStatus } from "../types/ordemServico";

export const OS_STATUS_VARIANT: Record<OsStatus, BadgeVariant> = {
  "Aguardando Avaliação": "warning",
  "Em Avaliação": "info",
  "Orçamento Enviado": "warning",
  "Orçamento Aprovado": "info",
  "Em Reparo": "info",
  "Aguardando Retirada": "warning",
  Concluída: "success",
  Cancelada: "error",
};
