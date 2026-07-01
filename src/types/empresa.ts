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
  pixChave?: string;
  pixTipo?: string;
  pixFavorecido?: string;
  pixBanco?: string;
  nfEmissorUrl?: string;
  criadoEm: Timestamp;
}
