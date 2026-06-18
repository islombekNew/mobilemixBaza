import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { addDebtPayment } from "@/lib/customers";
import { handleApiError } from "@/lib/api-errors";
import { debtPaymentCreateSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = debtPaymentCreateSchema.parse(body);

    const result = await addDebtPayment(user, id, input.amount, input.note);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
