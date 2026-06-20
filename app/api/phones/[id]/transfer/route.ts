import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { transferPhone } from "@/lib/phones";
import { handleApiError } from "@/lib/api-errors";
import { phoneTransferSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = phoneTransferSchema.parse(body);
    const phone = await transferPhone(user, id, input.targetBranchId);
    return NextResponse.json({ phone });
  } catch (error) {
    return handleApiError(error);
  }
}
