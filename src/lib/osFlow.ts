import type { OsStatus } from "../types/ordemServico";
import type { UserRole } from "../contexts/EmpresaContext";

const LEGACY_STATUS_MAP: Record<string, OsStatus> = {
  "Aguardando Avaliação": "Recebida",
  "Aguardando Retirada": "Pronto para Retirada",
  "Em Andamento": "Em Reparo",
};

export function normalizeStatus(raw: string): OsStatus {
  return (LEGACY_STATUS_MAP[raw] as OsStatus | undefined) ?? (raw as OsStatus);
}

export const STATUS_ORDER: OsStatus[] = [
  "Recebida",
  "Em Avaliação",
  "Orçamento Enviado",
  "Orçamento Aprovado",
  "Em Reparo",
  "Pronto para Retirada",
  "Recebimento",
  "Entregue",
  "Concluída",
];

export function getNextStatus(current: OsStatus): OsStatus | null {
  const index = STATUS_ORDER.indexOf(current);
  if (index === -1 || index === STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[index + 1];
}

export interface OsPermissions {
  canAdvance: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canRegisterPayment: boolean;
  canAddObservation: boolean;
  canManagePhotos: boolean;
}

const ADMIN_PERMISSIONS: Record<OsStatus, OsPermissions> = {
  "Recebida":               base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Em Avaliação":           base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Orçamento Enviado":      base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Orçamento Aprovado":     base({ canAdvance: true, canEdit: true, canManagePhotos: true }),
  "Em Reparo":              base({ canAdvance: true, canEdit: true, canManagePhotos: true }),
  "Pronto para Retirada":   base({ canRegisterPayment: true }),
  "Recebimento":            base({ canAddObservation: true }),
  "Entregue":               base({ canAdvance: true }),
  "Concluída":              base({}),
  "Cancelada":              base({}),
};

const ANALISTA_PERMISSIONS: Record<OsStatus, OsPermissions> = {
  "Recebida":               base({ canAdvance: true, canAddObservation: true }),
  "Em Avaliação":           base({ canAdvance: true, canAddObservation: true }),
  "Orçamento Enviado":      base({}),
  "Orçamento Aprovado":     base({ canAdvance: true, canAddObservation: true }),
  "Em Reparo":              base({ canAdvance: true, canAddObservation: true, canManagePhotos: true }),
  "Pronto para Retirada":   base({}),
  "Recebimento":            base({}),
  "Entregue":               base({}),
  "Concluída":              base({}),
  "Cancelada":              base({}),
};

function base(overrides: Partial<OsPermissions>): OsPermissions {
  return {
    canAdvance: false,
    canEdit: false,
    canCancel: false,
    canRegisterPayment: false,
    canAddObservation: false,
    canManagePhotos: false,
    ...overrides,
  };
}

export function getOsPermissions(status: OsStatus, role: UserRole | null): OsPermissions {
  if (role === "admin") return ADMIN_PERMISSIONS[status] ?? base({});
  if (role === "analista") return ANALISTA_PERMISSIONS[status] ?? base({});
  return base({});
}
