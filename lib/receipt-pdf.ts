import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ReceiptSaleData {
  id: string;
  finalPrice: number;
  paymentType: "CASH" | "CARD" | "CREDIT";
  saleDate: Date;
  phone: { model: string; brand: string; imei: string; color: string; storageGB: number };
  seller: { name: string };
  branch: { name: string; address: string; phoneNumber: string };
  customer: {
    fullName: string;
    phoneNumber: string;
    totalAmount: number;
    paidAmount: number;
    dueDate: Date;
  } | null;
}

const paymentTypeLabels: Record<ReceiptSaleData["paymentType"], string> = {
  CASH: "Naqd pul",
  CARD: "Karta",
  CREDIT: "Kredit (bo'lib to'lash)",
};

function formatSum(value: number): string {
  return `${Math.round(value).toLocaleString("uz-UZ").replace(/,/g, " ")} so'm`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Sotuv chekini PDF sifatida yaratadi (tor, do'kon chekiga o'xshash format —
 * istalgan printerda yaxshi chiqadi, ekranda ham qulay o'qiladi).
 *
 * Uzbek lotin alifbosi (apostrof bilan o', g') standart Helvetica/WinAnsi
 * kodlashga to'liq mos keladi, shuning uchun maxsus shrift kerak emas.
 */
export async function generateReceiptPdf(sale: ReceiptSaleData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([280, 520]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 18;
  const contentWidth = 280 - margin * 2;
  let y = 500;

  const brandPink = rgb(1, 0.31, 0.85); // #ff4fd8
  const textDark = rgb(0.1, 0.1, 0.12);
  const textGray = rgb(0.45, 0.45, 0.48);

  function drawCenteredText(text: string, size: number, useFont = font, color = textDark) {
    const width = useFont.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (280 - width) / 2, y, size, font: useFont, color });
    y -= size + 6;
  }

  function drawRow(label: string, value: string, opts?: { bold?: boolean }) {
    const labelFont = font;
    const valueFont = opts?.bold ? fontBold : font;
    const size = 9.5;

    page.drawText(label, { x: margin, y, size, font: labelFont, color: textGray });

    const valueWidth = valueFont.widthOfTextAtSize(value, size);
    page.drawText(value, {
      x: margin + contentWidth - valueWidth,
      y,
      size,
      font: valueFont,
      color: opts?.bold ? brandPink : textDark,
    });
    y -= size + 8;
  }

  function drawDivider() {
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: margin + contentWidth, y: y + 4 },
      thickness: 0.75,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  }

  // --- Sarlavha ---
  drawCenteredText("MIX MOBILE", 18, fontBold, brandPink);
  drawCenteredText(sale.branch.name, 10, font, textGray);
  drawCenteredText(sale.branch.address, 8.5, font, textGray);
  drawCenteredText(sale.branch.phoneNumber, 8.5, font, textGray);
  y -= 6;
  drawDivider();

  drawRow("Chek raqami:", `#${sale.id.slice(-8).toUpperCase()}`);
  drawRow("Sana:", formatDate(sale.saleDate));
  drawRow("Sotuvchi:", sale.seller.name);
  drawDivider();

  // --- Telefon ma'lumotlari ---
  drawCenteredText(`${sale.phone.brand} ${sale.phone.model}`, 11, fontBold);
  drawRow("Rang / Xotira:", `${sale.phone.color}, ${sale.phone.storageGB}GB`);
  drawRow("IMEI:", sale.phone.imei);
  drawDivider();

  // --- To'lov ---
  drawRow("To'lov turi:", paymentTypeLabels[sale.paymentType]);
  drawRow("Jami summa:", formatSum(sale.finalPrice), { bold: true });

  // --- Kredit bo'lsa, qo'shimcha ma'lumot ---
  if (sale.customer) {
    const remaining = sale.customer.totalAmount - sale.customer.paidAmount;
    drawDivider();
    drawCenteredText("Bo'lib to'lash ma'lumotlari", 9.5, fontBold, textGray);
    drawRow("Mijoz:", sale.customer.fullName);
    drawRow("Telefon:", sale.customer.phoneNumber);
    drawRow("Boshlang'ich to'lov:", formatSum(sale.customer.paidAmount));
    drawRow("Qolgan qarz:", formatSum(remaining), { bold: true });
    drawRow("To'lov muddati:", formatDate(sale.customer.dueDate));
  }

  drawDivider();
  y -= 4;
  drawCenteredText("Xaridingiz uchun rahmat!", 10, fontBold);
  drawCenteredText("Savollar uchun do'konga murojaat qiling", 8, font, textGray);

  return doc.save();
}
