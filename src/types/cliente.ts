export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  telefone: string;
  email?: string;
  cpfCnpj?: string;
  endereco?: string;
  observacoes?: string;
}
