import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listCustomers, syncOverdueStatuses } from "@/lib/customers";
import { handleApiError } from "@/lib/api-errors";
import type { CustomerStatus } from "@prisma/client";

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
    await syncOverdueStatuses(user, branchId);
    const customers = await listCustomers(user, branchId, {
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as CustomerStatus) ?? undefined,
      overdueOnly: searchParams.get("overdueOnly") === "true",
    });
    return NextResponse.json({ customers });
  } catch (error) {
    return handleApiError(error);
  }
}
