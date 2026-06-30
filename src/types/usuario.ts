import type { Timestamp } from "firebase/firestore";

export type UsuarioRole = "admin" | "analista";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UsuarioRole;
  empresaId: string;
  ativo: boolean;
  criadoEm: Timestamp;
}
