import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listBranches, createBranch } from "@/lib/branches";
import { handleApiError } from "@/lib/api-errors";
import { branchCreateSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  const branches = await listBranches(user);
  return NextResponse.json({ branches });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();

  try {
    const body = await request.json();
    const input = branchCreateSchema.parse(body);
    const branch = await createBranch(user, input);
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
