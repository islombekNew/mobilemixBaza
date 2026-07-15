import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listAccessories, createAccessory } from "@/lib/accessories";
import { handleApiError } from "@/lib/api-errors";
import { accessoryCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);

  try {
    const accessories = await listAccessories(user, {
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json({ accessories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();

  try {
    const body = await request.json();
    const input = accessoryCreateSchema.parse(body);
    const result = await createAccessory(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
