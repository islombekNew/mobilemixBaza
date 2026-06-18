import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { updatePhone, deletePhone } from "@/lib/phones";
import { handleApiError } from "@/lib/api-errors";
import { phoneUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = phoneUpdateSchema.parse(body);
    const phone = await updatePhone(user, id, input);
    return NextResponse.json({ phone });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    await deletePhone(user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
