import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { createSale, listSales } from "@/lib/sales";
import { handleApiError } from "@/lib/api-errors";
import { saleCreateSchema } from "@/lib/validation";

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
    const sales = await listSales(user, branchId);
    return NextResponse.json({ sales });
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

    const input = saleCreateSchema.parse({ ...body, branchId });
    const result = await createSale(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
