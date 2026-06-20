import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { setPhonePhoto, removePhonePhoto } from "@/lib/phones";
import { handleApiError } from "@/lib/api-errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Rasm fayli topilmadi" }, { status: 400 });
    }

    const phone = await setPhonePhoto(user, id, file);
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
    const phone = await removePhonePhoto(user, id);
    return NextResponse.json({ phone });
  } catch (error) {
    return handleApiError(error);
  }
}
