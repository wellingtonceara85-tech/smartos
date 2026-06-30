import { useState } from "react";
import { Copy, Download, ExternalLink, Link as LinkIcon, MessageCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { buildOsConcluidaWhatsAppMessage } from "../../lib/whatsappMessage";
import { formatOsNumero } from "../../lib/osNumero";
import type { OrdemServico } from "../../types/ordemServico";

interface PdfResult {
  blob: Blob;
  url: string;
}

interface ShareOsModalProps {
  ordem: OrdemServico;
  empresaNome: string;
  ensurePdf: () => Promise<PdfResult | null>;
  onClose: () => void;
}

export function ShareOsModal({ ordem, empresaNome, ensurePdf, onClose }: ShareOsModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPdf, setCopiedPdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const link = `${window.location.origin}/track/${ordem.token}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleOpenSmartTrack() {
    window.open(link, "_blank");
  }

  function handleWhatsApp() {
    const mensagem = buildOsConcluidaWhatsAppMessage({
      clienteNome: ordem.clienteNome,
      numero: formatOsNumero(ordem.numero),
      link,
      empresaNome,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  async function handleDownloadPdf() {
    setBusy(true);
    setError("");
    const result = await ensurePdf();
    setBusy(false);
    if (!result) {
      setError("Não foi possível gerar o PDF. Tente novamente.");
      return;
    }
    const objectUrl = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${formatOsNumero(ordem.numero)}.pdf`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleCopyPdfLink() {
    setBusy(true);
    setError("");
    const result = await ensurePdf();
    setBusy(false);
    if (!result) {
      setError("Não foi possível gerar o PDF. Tente novamente.");
      return;
    }
    await navigator.clipboard.writeText(result.url);
    setCopiedPdf(true);
    setTimeout(() => setCopiedPdf(false), 2000);
  }

  return (
    <Modal
      title="Compartilhar Ordem de Serviço"
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-2">
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <Button variant="ghost" className="w-full justify-start" onClick={handleCopyLink}>
          <LinkIcon size={16} />
          {copiedLink ? "Link copiado!" : "Copiar Link SmartTrack"}
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={handleOpenSmartTrack}>
          <ExternalLink size={16} />
          Abrir SmartTrack
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={handleWhatsApp}>
          <MessageCircle size={16} />
          Enviar WhatsApp
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={handleDownloadPdf} loading={busy}>
          <Download size={16} />
          Baixar PDF
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={handleCopyPdfLink} loading={busy}>
          <Copy size={16} />
          {copiedPdf ? "Link copiado!" : "Copiar Link do PDF"}
        </Button>
      </div>
    </Modal>
  );
}
