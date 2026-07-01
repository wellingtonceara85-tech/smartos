import type { Timestamp } from "firebase/firestore";

export type OsStatus =
  | "Recebida"
  | "Em Avaliação"
  | "Orçamento Enviado"
  | "Orçamento Aprovado"
  | "Em Reparo"
  | "Pronto para Retirada"
  | "Recebimento"
  | "Entregue"
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
  acrescimo: number;
  desconto: number;
  totalPago: number;
  formaPagamento: string;
  data: Timestamp;
}

export interface Garantia {
  dataValidade: Timestamp;
}

export type ClienteRespostaTipo = "aprovado" | "reprovado" | "duvida";

export interface ClienteResposta {
  tipo: ClienteRespostaTipo;
  mensagem?: string;
  criadoEm: Timestamp;
}

export interface PecaOrcamento {
  descricao: string;
  valor: number;
}

export interface Orcamento {
  maoDeObra: number;
  pecas: PecaOrcamento[];
  outrasDespesas: number;
  desconto: number;
  total: number;
  prazoExecucao: string;
  garantia: string;
  descricaoServicos: string;
  observacoes: string;
  fotos: FotoOS[];
  criadoEm: Timestamp;
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
  clienteResposta?: ClienteResposta;
  orcamento?: Orcamento;
  nfEmitida?: boolean;
  nfNumero?: string;
  updatedAt: Timestamp;
}
