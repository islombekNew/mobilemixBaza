import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { returnSale } from "@/lib/sales";
import { handleApiError } from "@/lib/api-errors";
import { saleReturnSchema } from "@/lib/validation";

/**
 * Sotuvni qaytarish (bekor qilish): telefon omborga qaytadi, sotuv
 * hisobotlardan chiqadi, kredit qarzi bekor bo'ladi. Yozuv o'chirilmaydi.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { reason } = saleReturnSchema.parse(body);
    const sale = await returnSale(user, id, reason);
    return NextResponse.json({ sale });
  } catch (error) {
    return handleApiError(error);
  }
}
