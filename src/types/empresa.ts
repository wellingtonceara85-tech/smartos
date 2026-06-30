import type { Timestamp } from "firebase/firestore";

export interface Empresa {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  endereco?: string;
  logoUrl?: string;
  prazoGarantiaDias?: number;
  garantiaTexto?: string;
  tiposEquipamento?: string[];
  criadoEm: Timestamp;
}
