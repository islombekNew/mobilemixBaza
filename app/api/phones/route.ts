import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listPhones, createPhone } from "@/lib/phones";
import { handleApiError } from "@/lib/api-errors";
import { phoneCreateSchema } from "@/lib/validation";
import type { PhoneCondition, PhoneStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);

  const branchId = searchParams.get("branchId") ?? user.branchId;
  if (!branchId) {
    return NextResponse.json(
      { error: "branchId ko'rsatilishi kerak" },
      { status: 400 }
    );
  }

  try {
    const phones = await listPhones(user, branchId, {
      search: searchParams.get("search") ?? undefined,
      brand: searchParams.get("brand") ?? undefined,
      condition: (searchParams.get("condition") as PhoneCondition) ?? undefined,
      status: (searchParams.get("status") as PhoneStatus) ?? undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
    });
    return NextResponse.json({ phones });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();

  try {
    const body = await request.json();
    const branchId = body.branchId ?? user.branchId;
    if (!branchId) {
      return NextResponse.json(
        { error: "branchId ko'rsatilishi kerak" },
        { status: 400 }
      );
    }

    const input = phoneCreateSchema.parse({ ...body, branchId });
    const phone = await createPhone(user, input);
    return NextResponse.json({ phone }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
