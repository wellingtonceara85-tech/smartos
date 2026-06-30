import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { OrdemServico } from "../types/ordemServico";
import type { Empresa } from "../types/empresa";
import { OS_STATUS_VARIANT } from "./osStatus";
import { formatCurrency, formatDate } from "./format";
import { formatOsNumero } from "./osNumero";

const STATUS_COLORS: Record<string, [number, number, number]> = {
  success: [22, 163, 74],
  warning: [217, 119, 6],
  error: [220, 38, 38],
  info: [2, 132, 199],
  neutral: [100, 116, 139],
};

const ACCENT: [number, number, number] = [37, 99, 235];
const ACCENT_DARK: [number, number, number] = [29, 78, 216];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const BOX_BG: [number, number, number] = [248, 250, 252];
const BOX_BORDER: [number, number, number] = [226, 232, 240];

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

interface FieldDef {
  label: string;
  value: string | undefined;
}

export async function generateOsPdf(ordem: OrdemServico, empresa: Empresa): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const footerReserve = 34;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - footerReserve) {
      doc.addPage();
      y = 14;
    }
  }

  // ── Faixa de destaque no topo ────────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageWidth, 3, "F");
  y = 14;

  // ── Cabeçalho: logo + dados da empresa | número da OS + status ──────
  const logoDataUrl = empresa.logoUrl ? await urlToDataUrl(empresa.logoUrl) : null;
  const headerTop = y;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, dataUrlFormat(logoDataUrl), marginX, headerTop, 22, 22, undefined, "FAST");
    } catch {
      // logo em formato não suportado pelo jsPDF — segue sem ela
    }
  }

  const textX = logoDataUrl ? marginX + 28 : marginX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(empresa.nome || "Empresa", textX, headerTop + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let infoY = headerTop + 12;
  if (empresa.telefone) {
    doc.text(`Tel/WhatsApp: ${empresa.telefone}`, textX, infoY);
    infoY += 5;
  }
  if (empresa.endereco) {
    const enderecoLines = doc.splitTextToSize(empresa.endereco, contentWidth * 0.5);
    doc.text(enderecoLines, textX, infoY);
    infoY += enderecoLines.length * 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("ORDEM DE SERVIÇO", pageWidth - marginX, headerTop + 4, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ACCENT);
  doc.text(formatOsNumero(ordem.numero), pageWidth - marginX, headerTop + 13, { align: "right" });

  const statusColor = STATUS_COLORS[OS_STATUS_VARIANT[ordem.status]] ?? STATUS_COLORS.neutral;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const statusLabel = ordem.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusLabel) + 8;
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - marginX - statusWidth, headerTop + 17, statusWidth, 6, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - marginX - statusWidth / 2, headerTop + 21, { align: "center" });

  y = Math.max(infoY, headerTop + 25) + 6;
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // ── Seções em caixas arredondadas com barra de destaque lateral ─────
  function measureField(field: FieldDef, maxWidth: number) {
    if (!field.value) return { lines: [] as string[], height: 0 };
    const lines = doc.splitTextToSize(`${field.label}: ${field.value}`, maxWidth);
    return { lines, height: lines.length * 5 + 1.5 };
  }

  function renderSection(title: string, fields: FieldDef[]) {
    const innerMaxWidth = contentWidth - 14;
    const measured = fields.map((f) => measureField(f, innerMaxWidth));
    const totalTextHeight = measured.reduce((sum, m) => sum + m.height, 0);
    if (totalTextHeight === 0) return;

    const paddingTop = 10;
    const paddingBottom = 6;
    const boxHeight = paddingTop + totalTextHeight + paddingBottom;

    ensureSpace(boxHeight + 4);

    doc.setFillColor(...BOX_BG);
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 2.5, 2.5, "FD");
    doc.setFillColor(...ACCENT);
    doc.roundedRect(marginX, y, 2.4, boxHeight, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT_DARK);
    doc.text(title.toUpperCase(), marginX + 8, y + 7);

    let cy = y + paddingTop + 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    for (const m of measured) {
      if (m.lines.length === 0) continue;
      doc.text(m.lines, marginX + 8, cy);
      cy += m.height;
    }

    y += boxHeight + 6;
  }

  renderSection("Cliente", [
    { label: "Nome", value: ordem.clienteNome },
    { label: "Telefone", value: ordem.clienteTelefone },
  ]);

  renderSection("Equipamento", [
    { label: "Tipo", value: ordem.equipamentoTipo },
    { label: "Marca / Modelo", value: `${ordem.equipamentoMarca} ${ordem.equipamentoModelo}`.trim() },
    { label: "Número de série", value: ordem.equipamentoNumeroSerie },
  ]);

  const valorFields: FieldDef[] = [];
  if (ordem.pagamento) {
    valorFields.push(
      { label: "Valor", value: formatCurrency(ordem.pagamento.valor) },
      { label: "Forma de pagamento", value: ordem.pagamento.formaPagamento },
    );
  } else if (ordem.valorOrcamento != null) {
    valorFields.push({ label: "Valor do orçamento", value: formatCurrency(ordem.valorOrcamento) });
  }

  renderSection("Serviço", [
    { label: "Defeito relatado", value: ordem.defeitoRelatado },
    { label: "Diagnóstico / Serviço executado", value: ordem.diagnostico },
    ...valorFields,
  ]);

  if (ordem.garantia) {
    renderSection("Garantia", [
      { label: "Válida até", value: formatDate(ordem.garantia.dataValidade) },
      { label: "Termos", value: empresa.garantiaTexto },
    ]);
  }

  // ── Fotos ─────────────────────────────────────────────────────────
  if (ordem.fotos && ordem.fotos.length > 0) {
    const photoSize = 42;
    const gap = 6;
    ensureSpace(photoSize + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT_DARK);
    doc.text("FOTOS", marginX, y + 4);
    y += 8;

    let x = marginX;
    for (const foto of ordem.fotos.slice(0, 3)) {
      const dataUrl = await urlToDataUrl(foto.url);
      doc.setDrawColor(...BOX_BORDER);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, photoSize, photoSize, 2, 2, "S");
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, dataUrlFormat(dataUrl), x + 0.8, y + 0.8, photoSize - 1.6, photoSize - 1.6, undefined, "FAST");
        } catch {
          // foto em formato não suportado — segue sem ela
        }
      }
      x += photoSize + gap;
    }
    y += photoSize + 10;
  }

  // ── Rodapé: QR Code + link de acompanhamento ─────────────────────
  const trackUrl = `${window.location.origin}/track/${ordem.token}`;
  const footerHeight = 28;
  const footerY = pageHeight - footerHeight - 10;

  if (y > footerY - 4) {
    doc.addPage();
  }

  doc.setFillColor(...BOX_BG);
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, footerY, contentWidth, footerHeight, 3, 3, "FD");

  try {
    const qrDataUrl = await QRCode.toDataURL(trackUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    });
    doc.addImage(qrDataUrl, "PNG", marginX + 6, footerY + 4, 20, 20);
  } catch {
    // segue sem QR code se a geração falhar
  }

  const footerTextX = marginX + 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text("Acompanhe sua Ordem de Serviço em tempo real", footerTextX, footerY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text(trackUrl, footerTextX, footerY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · SmartOS`, footerTextX, footerY + 22);

  return doc;
}
