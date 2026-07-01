interface OrcamentoWhatsAppParams {
  clienteNome: string;
  numero: string;
  link: string;
  empresaNome: string;
  valor?: number;
}

export function buildOrcamentoWhatsAppMessage({
  clienteNome,
  numero,
  link,
  empresaNome,
  valor,
}: OrcamentoWhatsAppParams): string {
  const lines = [
    `Olá, ${clienteNome}! 👋`,
    "",
    `O orçamento da sua Ordem de Serviço *${numero}* está pronto.`,
    "",
  ];

  if (valor) {
    lines.push(`💰 Valor: R$ ${valor.toFixed(2).replace(".", ",")}`, "");
  }

  lines.push(
    "📍 Acompanhe em tempo real:",
    link,
    "",
    "Para aprovar o orçamento, basta responder esta mensagem.",
    "",
    `*${empresaNome}*`,
  );

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
    `Olá, ${clienteNome}! 👋`,
    "",
    `Sua Ordem de Serviço *${numero}* foi concluída. ✅`,
    "",
    "📍 Acompanhe em tempo real:",
    link,
  ];

  if (pdfUrl) {
    lines.push("", "📄 Baixe sua OS em PDF:", pdfUrl);
  }

  lines.push("", "Obrigado pela preferência!", `*${empresaNome}*`);

  return lines.join("\n");
}
