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
const LABEL_GRAY: [number, number, number] = [100, 116, 139];
const BOX_BG: [number, number, number] = [248, 250, 252];
const BOX_BORDER: [number, number, number] = [226, 232, 240];

const MARGIN_X = 16;
const LOGO_MAX_W = 38;
const LOGO_MAX_H = 26;

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
  /** Campo de texto longo: ocupa a linha inteira em vez de dividir em 2 colunas. */
  full?: boolean;
}

export async function generateOsPdf(ordem: OrdemServico, empresa: Empresa): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const footerReserve = 36;
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - footerReserve) {
      doc.addPage();
      y = 16;
    }
  }

  function topBar() {
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageWidth, 3, "F");
  }

  topBar();
  y = 16;

  // ── Cabeçalho: logo (proporção original preservada) + dados da empresa ──
  const logoDataUrl = empresa.logoUrl ? await urlToDataUrl(empresa.logoUrl) : null;
  const headerTop = y;
  let logoDrawnWidth = 0;

  if (logoDataUrl) {
    try {
      const props = doc.getImageProperties(logoDataUrl);
      const ratio = props.width / props.height;
      let w = LOGO_MAX_W;
      let h = w / ratio;
      if (h > LOGO_MAX_H) {
        h = LOGO_MAX_H;
        w = h * ratio;
      }
      // Centraliza verticalmente o logo no bloco de cabeçalho (~22mm de altura útil).
      const logoY = headerTop + Math.max(0, (22 - h) / 2);
      doc.addImage(logoDataUrl, dataUrlFormat(logoDataUrl), MARGIN_X, logoY, w, h, undefined, "FAST");
      logoDrawnWidth = w;
    } catch {
      // logo em formato não suportado pelo jsPDF — segue exibindo só o nome da empresa
      logoDrawnWidth = 0;
    }
  }

  const textX = logoDrawnWidth > 0 ? MARGIN_X + logoDrawnWidth + 6 : MARGIN_X;
  const textMaxWidth = pageWidth * 0.55 - (textX - MARGIN_X);

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
    const enderecoLines = doc.splitTextToSize(empresa.endereco, textMaxWidth);
    doc.text(enderecoLines, textX, infoY);
    infoY += enderecoLines.length * 5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("ORDEM DE SERVIÇO", pageWidth - MARGIN_X, headerTop + 4, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ACCENT);
  doc.text(formatOsNumero(ordem.numero), pageWidth - MARGIN_X, headerTop + 13, { align: "right" });

  const statusColor = STATUS_COLORS[OS_STATUS_VARIANT[ordem.status]] ?? STATUS_COLORS.neutral;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const statusLabel = ordem.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusLabel) + 8;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - MARGIN_X - statusWidth, headerTop + 17, statusWidth, 6.5, 3.25, 3.25, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - MARGIN_X - statusWidth / 2, headerTop + 21.3, { align: "center" });

  y = Math.max(infoY, headerTop + 25, headerTop + 22) + 7;
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, pageWidth - MARGIN_X, y);
  y += 8;

  // ── Seções em caixas arredondadas, campos em grid de até 2 colunas ───
  const sectionPadX = 8;
  const labelLineH = 4;
  const valueLineH = 4.6;
  const fieldGapY = 4;
  const colGap = 8;

  function layoutRows(fields: FieldDef[]): FieldDef[][] {
    const usable = fields.filter((f) => !!f.value);
    const rows: FieldDef[][] = [];
    let pending: FieldDef | null = null;
    for (const f of usable) {
      if (f.full) {
        if (pending) {
          rows.push([pending]);
          pending = null;
        }
        rows.push([f]);
      } else if (pending) {
        rows.push([pending, f]);
        pending = null;
      } else {
        pending = f;
      }
    }
    if (pending) rows.push([pending]);
    return rows;
  }

  function renderSection(title: string, fields: FieldDef[]) {
    const rows = layoutRows(fields);
    if (rows.length === 0) return;

    const innerWidth = contentWidth - sectionPadX * 2;
    const halfWidth = (innerWidth - colGap) / 2;

    const rowsMeasured = rows.map((row) => {
      const cellWidth = row.length === 2 ? halfWidth : innerWidth;
      const cells = row.map((field) => ({
        field,
        lines: doc.splitTextToSize(field.value ?? "", cellWidth),
      }));
      const rowHeight = Math.max(...cells.map((c) => labelLineH + c.lines.length * valueLineH));
      return { cells, height: rowHeight, width: cellWidth };
    });

    const titleBlockHeight = 11;
    const paddingBottom = 6;
    const rowsHeight = rowsMeasured.reduce((sum, r) => sum + r.height + fieldGapY, 0) - fieldGapY;
    const boxHeight = titleBlockHeight + rowsHeight + paddingBottom;

    ensureSpace(boxHeight + 4);

    doc.setFillColor(...BOX_BG);
    doc.setDrawColor(...BOX_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_X, y, contentWidth, boxHeight, 2.5, 2.5, "FD");
    doc.setFillColor(...ACCENT);
    doc.roundedRect(MARGIN_X, y, 2.4, boxHeight, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT_DARK);
    doc.text(title.toUpperCase(), MARGIN_X + sectionPadX, y + 7.5);

    let cy = y + titleBlockHeight;
    for (const row of rowsMeasured) {
      let cx = MARGIN_X + sectionPadX;
      for (const cell of row.cells) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...LABEL_GRAY);
        doc.text(cell.field.label.toUpperCase(), cx, cy);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text(cell.lines, cx, cy + labelLineH);

        cx += row.width + colGap;
      }
      cy += row.height + fieldGapY;
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
    { label: "Cor", value: ordem.equipamentoCor },
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
    { label: "Defeito relatado", value: ordem.defeitoRelatado, full: true },
    { label: "Diagnóstico / Serviço executado", value: ordem.diagnostico, full: true },
    ...valorFields,
  ]);

  if (ordem.garantia) {
    renderSection("Garantia", [
      { label: "Válida até", value: formatDate(ordem.garantia.dataValidade), full: true },
      { label: "Termos", value: empresa.garantiaTexto, full: true },
    ]);
  }

  // ── Fotos ─────────────────────────────────────────────────────────
  if (ordem.fotos && ordem.fotos.length > 0) {
    const photoSize = 42;
    const gap = 6;
    ensureSpace(photoSize + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...ACCENT_DARK);
    doc.text("FOTOS", MARGIN_X, y + 4);
    y += 9;

    let x = MARGIN_X;
    for (const foto of ordem.fotos.slice(0, 3)) {
      const dataUrl = await urlToDataUrl(foto.url);
      doc.setDrawColor(...BOX_BORDER);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, photoSize, photoSize, 2, 2, "S");
      if (dataUrl) {
        try {
          doc.addImage(
            dataUrl,
            dataUrlFormat(dataUrl),
            x + 0.8,
            y + 0.8,
            photoSize - 1.6,
            photoSize - 1.6,
            undefined,
            "FAST",
          );
        } catch {
          // foto em formato não suportado — segue sem ela
        }
      }
      x += photoSize + gap;
    }
    y += photoSize + 10;
  }

  // ── Rodapé: QR Code + link de acompanhamento ─────────────────────
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const trackUrl = `${window.location.origin}${base}/track/${ordem.token}`;
  const footerHeight = 28;
  const bottomFooterY = pageHeight - footerHeight - 10;
  let footerY: number;

  if (y + footerHeight + 6 <= pageHeight - 10) {
    // Cabe na página atual: ancora logo abaixo do conteúdo (nunca deixa um vão enorme),
    // mas nunca acima da posição padrão do rodapé.
    footerY = Math.max(y + 6, bottomFooterY);
  } else {
    doc.addPage();
    topBar();
    y = 16;
    footerY = bottomFooterY;
  }

  doc.setFillColor(...BOX_BG);
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN_X, footerY, contentWidth, footerHeight, 3, 3, "FD");

  try {
    const qrDataUrl = await QRCode.toDataURL(trackUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    });
    doc.addImage(qrDataUrl, "PNG", MARGIN_X + 6, footerY + 4, 20, 20);
  } catch {
    // segue sem QR code se a geração falhar
  }

  const footerTextX = MARGIN_X + 32;
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

  // ── Numeração de página (só quando o documento tiver mais de 1 página) ──
  const totalPages = doc.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - MARGIN_X, pageHeight - 6, { align: "right" });
    }
  }

  return doc;
}

export async function generateReciboPdf(ordem: OrdemServico, empresa: Empresa): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const cw = pw - MARGIN_X * 2;
  let y = 10;

  // Logo + cabeçalho
  const logoData = empresa.logoUrl ? await urlToDataUrl(empresa.logoUrl) : null;
  if (logoData) {
    const props = doc.getImageProperties(logoData);
    const ratio = props.width / props.height;
    let lw = LOGO_MAX_W, lh = LOGO_MAX_H;
    if (ratio > lw / lh) lh = lw / ratio; else lw = lh * ratio;
    const lx = pw / 2 - lw / 2;
    doc.addImage(logoData, dataUrlFormat(logoData), lx, y, lw, lh);
    y += lh + 4;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(empresa.nome, pw / 2, y, { align: "center" });
  y += 5;
  if (empresa.cnpj) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`CNPJ: ${empresa.cnpj}`, pw / 2, y, { align: "center" });
    y += 4;
  }
  if (empresa.telefone) {
    doc.setFontSize(8);
    doc.text(empresa.telefone, pw / 2, y, { align: "center" });
    y += 4;
  }
  y += 2;

  // Linha divisória
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, pw - MARGIN_X, y);
  y += 5;

  // Título RECIBO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...ACCENT);
  doc.text("RECIBO DE PAGAMENTO", pw / 2, y, { align: "center" });
  y += 8;

  // Box com dados da OS
  doc.setFillColor(...BOX_BG);
  doc.setDrawColor(...BOX_BORDER);
  doc.roundedRect(MARGIN_X, y, cw, 22, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("OS", MARGIN_X + 4, y + 6);
  doc.text("Cliente", MARGIN_X + 4, y + 13);
  doc.text("Equipamento", MARGIN_X + 4, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text(formatOsNumero(ordem.numero), MARGIN_X + 28, y + 6);
  doc.text(ordem.clienteNome, MARGIN_X + 28, y + 13);
  doc.text(`${ordem.equipamentoMarca} ${ordem.equipamentoModelo}`, MARGIN_X + 28, y + 20);
  y += 28;

  // Box financeiro
  const pagamento = ordem.pagamento;
  if (pagamento) {
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(MARGIN_X, y, cw, 30, 2, 2, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL RECEBIDO", MARGIN_X + 4, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(formatCurrency(pagamento.totalPago ?? pagamento.valor), pw / 2, y + 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`via ${pagamento.formaPagamento}  ·  ${formatDate(pagamento.data)}`, pw / 2, y + 25, { align: "center" });
    y += 36;

    // Detalhamento se houver acréscimo/desconto
    if (pagamento.acrescimo || pagamento.desconto) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      if (pagamento.valor !== pagamento.totalPago) {
        doc.text(`Valor cobrado: ${formatCurrency(pagamento.valor)}`, MARGIN_X + 4, y);
        y += 4;
      }
      if (pagamento.acrescimo) {
        doc.text(`Acréscimo: + ${formatCurrency(pagamento.acrescimo)}`, MARGIN_X + 4, y);
        y += 4;
      }
      if (pagamento.desconto) {
        doc.text(`Desconto: - ${formatCurrency(pagamento.desconto)}`, MARGIN_X + 4, y);
        y += 4;
      }
      y += 2;
    }
  }

  // Serviços do orçamento
  if (ordem.orcamento) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text("SERVIÇOS REALIZADOS", MARGIN_X, y);
    y += 5;
    doc.setLineWidth(0.2);
    doc.setDrawColor(...BOX_BORDER);
    doc.line(MARGIN_X, y, pw - MARGIN_X, y);
    y += 4;

    if (ordem.orcamento.descricaoServicos) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK);
      const lines = doc.splitTextToSize(ordem.orcamento.descricaoServicos, cw);
      doc.text(lines, MARGIN_X, y);
      y += lines.length * 4 + 2;
    }

    for (const peca of ordem.orcamento.pecas ?? []) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...LABEL_GRAY);
      doc.text(`· ${peca.descricao}`, MARGIN_X + 3, y);
      doc.setTextColor(...INK);
      doc.text(formatCurrency(peca.valor), pw - MARGIN_X, y, { align: "right" });
      y += 4;
    }
    if (ordem.orcamento.maoDeObra > 0) {
      doc.setTextColor(...LABEL_GRAY);
      doc.text("Mão de obra", MARGIN_X + 3, y);
      doc.setTextColor(...INK);
      doc.text(formatCurrency(ordem.orcamento.maoDeObra), pw - MARGIN_X, y, { align: "right" });
      y += 4;
    }
    if (ordem.orcamento.garantia) {
      y += 3;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(`Garantia: ${ordem.orcamento.garantia}`, MARGIN_X, y);
      y += 4;
    }
  }

  // Nota fiscal
  if (ordem.nfEmitida && ordem.nfNumero) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`NF-e emitida: ${ordem.nfNumero}`, MARGIN_X, y);
    y += 5;
  }

  // Linha e rodapé
  y += 4;
  doc.setDrawColor(...BOX_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, y, pw - MARGIN_X, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} · SmartOS`, pw / 2, y, { align: "center" });

  return doc;
}
