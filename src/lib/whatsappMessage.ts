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
