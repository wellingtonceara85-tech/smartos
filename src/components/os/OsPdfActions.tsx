import { useState } from "react";
import { Download, Eye, Share2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { Button } from "../ui/Button";
import { ShareOsModal } from "./ShareOsModal";
import { generateOsPdf } from "../../lib/pdfGenerator";
import { formatOsNumero } from "../../lib/osNumero";
import type { OrdemServico } from "../../types/ordemServico";
import type { Empresa } from "../../types/empresa";

interface PdfResult {
  blob: Blob;
  url: string;
}

interface OsPdfActionsProps {
  ordem: OrdemServico;
}

export function OsPdfActions({ ordem }: OsPdfActionsProps) {
  const [pdf, setPdf] = useState<PdfResult | null>(null);
  const [empresaNome, setEmpresaNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  async function ensurePdf(): Promise<PdfResult | null> {
    if (pdf) return pdf;
    setLoading(true);
    setError("");
    try {
      const empresaSnap = await getDoc(doc(db, "empresas", ordem.empresaId));
      const empresa = { id: empresaSnap.id, ...(empresaSnap.data() as Omit<Empresa, "id">) };
      setEmpresaNome(empresa.nome ?? "");

      const pdfDoc = await generateOsPdf(ordem, empresa);
      const blob = pdfDoc.output("blob");
      const path = `empresas/${ordem.empresaId}/ordens/${ordem.id}/ordem-${ordem.numero}.pdf`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "application/pdf" });
      const url = await getDownloadURL(storageRef);

      const result = { blob, url };
      setPdf(result);
      return result;
    } catch {
      setError("Não foi possível gerar o PDF. Tente novamente.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleView() {
    const result = await ensurePdf();
    if (result) window.open(result.url, "_blank");
  }

  async function handleDownload() {
    const result = await ensurePdf();
    if (!result) return;
    const objectUrl = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${formatOsNumero(ordem.numero)}.pdf`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={handleView} loading={loading}>
          <Eye size={16} />
          Visualizar PDF
        </Button>
        <Button variant="ghost" onClick={handleDownload} loading={loading}>
          <Download size={16} />
          Baixar PDF
        </Button>
        <Button onClick={() => setShowShareModal(true)}>
          <Share2 size={16} />
          Compartilhar
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-[#DC2626]">{error}</p>}

      {showShareModal && (
        <ShareOsModal
          ordem={ordem}
          empresaNome={empresaNome}
          ensurePdf={ensurePdf}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
