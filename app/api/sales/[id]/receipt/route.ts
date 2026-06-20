import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getSaleForReceipt } from "@/lib/sales";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { handleApiError } from "@/lib/api-errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const sale = await getSaleForReceipt(user, id);

    const pdfBytes = await generateReceiptPdf({
      id: sale.id,
      finalPrice: Number(sale.finalPrice),
      paymentType: sale.paymentType,
      saleDate: sale.saleDate,
      phone: sale.phone,
      seller: sale.seller,
      branch: sale.branch,
      customer: sale.customer
        ? {
            fullName: sale.customer.fullName,
            phoneNumber: sale.customer.phoneNumber,
            totalAmount: Number(sale.customer.totalAmount),
            paidAmount: Number(sale.customer.paidAmount),
            dueDate: sale.customer.dueDate,
          }
        : null,
    });

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="chek-${sale.id.slice(-8)}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
