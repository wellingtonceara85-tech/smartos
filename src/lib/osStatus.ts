import type { BadgeVariant } from "../components/ui/Badge";
import type { OsStatus } from "../types/ordemServico";

export const OS_STATUS_VARIANT: Record<OsStatus, BadgeVariant> = {
  "Recebida":             "warning",
  "Em Avaliação":         "info",
  "Orçamento Enviado":    "warning",
  "Orçamento Aprovado":   "info",
  "Em Reparo":            "info",
  "Pronto para Retirada": "warning",
  "Recebimento":          "info",
  "Entregue":             "success",
  "Concluída":            "success",
  "Cancelada":            "error",
};
