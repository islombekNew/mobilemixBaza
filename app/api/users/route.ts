import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { listUsers, createUser } from "@/lib/users";
import { handleApiError } from "@/lib/api-errors";
import { userCreateSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();

  try {
    const users = await listUsers(user);
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();

  try {
    const body = await request.json();
    const input = userCreateSchema.parse(body);
    const created = await createUser(user, input);
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
