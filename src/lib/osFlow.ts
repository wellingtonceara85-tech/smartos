import type { OsStatus } from "../types/ordemServico";
import type { UserRole } from "../contexts/EmpresaContext";

export const STATUS_ORDER: OsStatus[] = [
  "Aguardando Avaliação",
  "Em Avaliação",
  "Orçamento Enviado",
  "Orçamento Aprovado",
  "Em Reparo",
  "Aguardando Retirada",
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
  "Aguardando Avaliação": base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Em Avaliação": base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Orçamento Enviado": base({ canAdvance: true, canEdit: true, canCancel: true }),
  "Orçamento Aprovado": base({ canAdvance: true, canEdit: true, canManagePhotos: true }),
  "Em Reparo": base({ canAdvance: true, canEdit: true, canManagePhotos: true }),
  "Aguardando Retirada": base({ canAdvance: true, canRegisterPayment: true }),
  Concluída: base({}),
  Cancelada: base({}),
};

const ANALISTA_PERMISSIONS: Record<OsStatus, OsPermissions> = {
  "Aguardando Avaliação": base({ canAdvance: true, canAddObservation: true }),
  "Em Avaliação": base({ canAdvance: true, canAddObservation: true }),
  "Orçamento Enviado": base({}),
  "Orçamento Aprovado": base({ canAdvance: true, canAddObservation: true }),
  "Em Reparo": base({ canAdvance: true, canAddObservation: true, canManagePhotos: true }),
  "Aguardando Retirada": base({}),
  Concluída: base({}),
  Cancelada: base({}),
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
  if (role === "admin") return ADMIN_PERMISSIONS[status];
  if (role === "analista") return ANALISTA_PERMISSIONS[status];
  return base({});
}
