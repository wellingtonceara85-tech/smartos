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

interface ReciboWhatsAppParams {
  clienteNome: string;
  numero: string;
  totalPago: number;
  formaPagamento: string;
  empresaNome: string;
  pdfUrl?: string;
}

export function buildReciboWhatsAppMessage({
  clienteNome,
  numero,
  totalPago,
  formaPagamento,
  empresaNome,
  pdfUrl,
}: ReciboWhatsAppParams): string {
  const valorFormatado = `R$ ${totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const lines = [
    `Ola, ${clienteNome}!`,
    "",
    `Confirmamos o recebimento de ${valorFormatado} via ${formaPagamento} referente a Ordem de Servico ${numero}.`,
    "",
    "Obrigado pela preferencia!",
  ];
  if (pdfUrl) {
    lines.push("", "Acesse seu recibo em PDF:", pdfUrl);
  }
  lines.push("", empresaNome);
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
