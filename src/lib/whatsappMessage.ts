interface OrcamentoWhatsAppParams {
  clienteNome: string;
  numero: string;
  link: string;
  empresaNome: string;
}

export function buildOrcamentoWhatsAppMessage({
  clienteNome,
  numero,
  link,
  empresaNome,
}: OrcamentoWhatsAppParams): string {
  return [
    `Ola, ${clienteNome}!`,
    "",
    `O orcamento da sua Ordem de Servico ${numero} esta pronto.`,
    "",
    `Acesse para ver os detalhes e responder:`,
    link,
    "",
    empresaNome,
  ].join("\n");
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
    `Sua Ordem de Servico ${numero} foi concluida.`,
    "",
    "Acompanhe pelo link:",
    link,
  ];

  if (pdfUrl) {
    lines.push("", "Baixe sua OS em PDF:", pdfUrl);
  }

  lines.push("", `Obrigado pela preferencia!`, empresaNome);

  return lines.join("\n");
}
