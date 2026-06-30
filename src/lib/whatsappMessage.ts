interface WhatsAppMessageParams {
  clienteNome: string;
  numero: string;
  link: string;
  empresaNome: string;
}

export function buildOsConcluidaWhatsAppMessage({
  clienteNome,
  numero,
  link,
  empresaNome,
}: WhatsAppMessageParams): string {
  return [
    `Olá ${clienteNome}!`,
    "",
    `Sua Ordem de Serviço ${numero} foi concluída.`,
    "",
    "Segue o acompanhamento:",
    link,
    "",
    "Em anexo encontra-se sua Ordem de Serviço em PDF.",
    "",
    "Obrigado pela preferência!",
    empresaNome,
  ].join("\n");
}
