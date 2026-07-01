interface OrcamentoWhatsAppParams {
  clienteNome: string;
  numero: string;
  link: string;
  empresaNome: string;
  valor?: number;
  observacoes?: string;
  telefoneEmpresa?: string;
}

export function buildOrcamentoWhatsAppMessage({
  clienteNome,
  numero,
  link,
  empresaNome,
  valor,
  observacoes,
  telefoneEmpresa,
}: OrcamentoWhatsAppParams): string {
  const lines = [
    `Ola, ${clienteNome}!`,
    "",
    `O orcamento da sua Ordem de Servico *${numero}* esta pronto.`,
    "",
  ];

  if (valor) {
    lines.push(`Valor total: R$ ${valor.toFixed(2).replace(".", ",")}`, "");
  }

  if (observacoes) {
    lines.push("Detalhes:", observacoes, "");
  }

  lines.push(
    "Acompanhe em tempo real e responda ao orcamento pelo link:",
    link,
    "",
  );

  if (telefoneEmpresa) {
    lines.push(`Em caso de duvidas, entre em contato: ${telefoneEmpresa}`, "");
  }

  lines.push(`*${empresaNome}*`);

  return lines.join("\n");
}

interface WhatsAppMessageParams {
  clienteNome: string;
  numero: string;
  link: string;
  empresaNome: string;
  pdfUrl?: string;
}

export function buildOsConcluidaWhatsAppMessage({
  clienteNome,
  numero,
  link,
  empresaNome,
  pdfUrl,
}: WhatsAppMessageParams): string {
  const lines = [
    `Ola, ${clienteNome}!`,
    "",
    `Sua Ordem de Servico *${numero}* foi concluida.`,
    "",
    "Acompanhe em tempo real:",
    link,
  ];

  if (pdfUrl) {
    lines.push("", "Baixe sua OS em PDF:", pdfUrl);
  }

  lines.push("", "Obrigado pela preferencia!", `*${empresaNome}*`);

  return lines.join("\n");
}
