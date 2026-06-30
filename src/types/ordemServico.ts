import type { Timestamp } from "firebase/firestore";

export type OsStatus =
  | "Aguardando Avaliação"
  | "Em Avaliação"
  | "Orçamento Enviado"
  | "Orçamento Aprovado"
  | "Em Reparo"
  | "Aguardando Retirada"
  | "Concluída"
  | "Cancelada";

export interface FotoOS {
  url: string;
  path: string;
}

export interface HistoricoItem {
  tipo: "status" | "observacao";
  texto: string;
  autor: string;
  criadoEm: Timestamp;
  statusNovo?: OsStatus;
}

export interface Pagamento {
  valor: number;
  formaPagamento: string;
  data: Timestamp;
}

export interface Garantia {
  dataValidade: Timestamp;
}

export interface OrdemServico {
  id: string;
  empresaId: string;
  numero: number;
  token: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  equipamentoTipo: string;
  equipamentoMarca: string;
  equipamentoModelo: string;
  equipamentoNumeroSerie?: string;
  equipamentoCor?: string;
  defeitoRelatado: string;
  diagnostico?: string;
  observacoesInternas?: string;
  status: OsStatus;
  motivoCancelamento?: string;
  dataAbertura: Timestamp;
  prazoPrevisto?: Timestamp;
  dataConclusao?: Timestamp;
  pagamento?: Pagamento;
  valorOrcamento?: number;
  fotos?: FotoOS[];
  historico?: HistoricoItem[];
  garantia?: Garantia;
  updatedAt: Timestamp;
}
