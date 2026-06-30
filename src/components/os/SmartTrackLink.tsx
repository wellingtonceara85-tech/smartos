import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { Button } from "../ui/Button";

interface SmartTrackLinkProps {
  token: string;
  clienteNome: string;
}

export function SmartTrackLink({ token, clienteNome }: SmartTrackLinkProps) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/track/${token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    const mensagem = encodeURIComponent(
      `Olá, ${clienteNome}! Acompanhe o andamento do seu equipamento por aqui: ${link}`,
    );
    window.open(`https://wa.me/?text=${mensagem}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="truncate text-sm text-slate-600">{link}</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={handleCopy}>
          <Copy size={16} />
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
        <Button variant="ghost" onClick={handleShare}>
          <MessageCircle size={16} />
          Compartilhar via WhatsApp
        </Button>
      </div>
    </div>
  );
}
