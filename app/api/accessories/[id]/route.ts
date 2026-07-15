import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { updateAccessory, deleteAccessory } from "@/lib/accessories";
import { handleApiError } from "@/lib/api-errors";
import { accessoryUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = accessoryUpdateSchema.parse(body);
    const accessory = await updateAccessory(user, id, input);
    return NextResponse.json({ accessory });
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
    await deleteAccessory(user, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
