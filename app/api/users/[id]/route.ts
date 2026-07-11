import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { updateUser, setUserBlocked } from "@/lib/users";
import { handleApiError } from "@/lib/api-errors";
import { userUpdateSchema } from "@/lib/validation";

/**
 * Xodimni tahrirlash yoki bloklash/blokdan chiqarish (faqat OWNER —
 * lib/users.ts ichida tekshiriladi).
 *
 * PATCH body:
 *  - { name?, login?, password?, role?, branchId? } — tahrirlash
 *  - { blocked: true|false } — bloklash/blokdan chiqarish
 * Ikkalasini bitta so'rovda ham yuborish mumkin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = userUpdateSchema.parse(body);

    const { blocked, ...fields } = input;

    let updated = null;
    const hasFieldChanges = Object.values(fields).some((v) => v !== undefined);
    if (hasFieldChanges) {
      updated = await updateUser(user, id, fields);
    }
    if (blocked !== undefined) {
      updated = await setUserBlocked(user, id, blocked);
    }

    if (!updated) {
      return NextResponse.json(
        { error: "O'zgartirish uchun hech narsa yuborilmadi" },
        { status: 400 }
      );
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
