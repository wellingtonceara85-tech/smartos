import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { OrdemServico } from "../types/ordemServico";
import type { Empresa } from "../types/empresa";
import { formatCurrency, formatDate } from "./format";
import { formatOsNumero } from "./osNumero";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler imagem"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function dataUrlFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

export async function generateOsPdf(ordem: OrdemServico, empresa: Empresa): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  let y = 18;

  const logoDataUrl = empresa.logoUrl ? await urlToDataUrl(empresa.logoUrl) : null;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, dataUrlFormat(logoDataUrl), marginX, y, 24, 24, undefined, "FAST");
    } catch {
      // logo em formato não suportado pelo jsPDF — segue sem ela
    }
  }

  const textX = logoDataUrl ? marginX + 30 : marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(26, 26, 46);
  doc.text(empresa.nome || "Empresa", textX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let infoY = y + 12;
  if (empresa.telefone) {
    doc.text(`Telefone / WhatsApp: ${empresa.telefone}`, textX, infoY);
    infoY += 5;
  }
  if (empresa.endereco) {
    doc.text(empresa.endereco, textX, infoY);
    infoY += 5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235);
  doc.text(formatOsNumero(ordem.numero), pageWidth - marginX, y + 6, { align: "right" });

  y = Math.max(y + 28, infoY + 4);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  function sectionTitle(title: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), marginX, y);
    y += 6;
  }

  function field(label: string, value: string | undefined) {
    if (!value) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(`${label}: ${value}`, pageWidth - marginX * 2);
    doc.text(lines, marginX, y);
    y += lines.length * 5 + 2;
  }

  sectionTitle("Cliente");
  field("Nome", ordem.clienteNome);
  field("Telefone", ordem.clienteTelefone);
  y += 2;

  sectionTitle("Equipamento");
  field("Tipo", ordem.equipamentoTipo);
  field("Marca / Modelo", `${ordem.equipamentoMarca} ${ordem.equipamentoModelo}`.trim());
  field("Número de série", ordem.equipamentoNumeroSerie);
  y += 2;

  sectionTitle("Serviço");
  field("Defeito relatado", ordem.defeitoRelatado);
  field("Diagnóstico / Serviço executado", ordem.diagnostico);
  if (ordem.pagamento) {
    field("Valor", formatCurrency(ordem.pagamento.valor));
    field("Forma de pagamento", ordem.pagamento.formaPagamento);
  } else if (ordem.valorOrcamento != null) {
    field("Valor do orçamento", formatCurrency(ordem.valorOrcamento));
  }
  y += 2;

  if (ordem.garantia) {
    sectionTitle("Garantia");
    field("Válida até", formatDate(ordem.garantia.dataValidade));
    field("Termos", empresa.garantiaTexto);
    y += 2;
  }

  if (ordem.fotos && ordem.fotos.length > 0) {
    sectionTitle("Fotos");
    const photoSize = 40;
    let x = marginX;
    for (const foto of ordem.fotos.slice(0, 3)) {
      const dataUrl = await urlToDataUrl(foto.url);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, dataUrlFormat(dataUrl), x, y, photoSize, photoSize, undefined, "FAST");
        } catch {
          // foto em formato não suportado — segue sem ela
        }
      }
      x += photoSize + 6;
    }
    y += photoSize + 8;
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 38;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  const trackUrl = `${window.location.origin}/track/${ordem.token}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(trackUrl, { margin: 1, width: 200 });
    doc.addImage(qrDataUrl, "PNG", marginX, footerY + 6, 24, 24);
  } catch {
    // segue sem QR code se a geração falhar
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Acompanhe sua Ordem de Serviço em:", marginX + 30, footerY + 14);
  doc.setTextColor(37, 99, 235);
  doc.text(trackUrl, marginX + 30, footerY + 19);

  return doc;
}
