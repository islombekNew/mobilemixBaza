import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { updateBranch, deleteOrArchiveBranch } from "@/lib/branches";
import { handleApiError } from "@/lib/api-errors";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().min(1).optional(),
  phoneNumber: z.string().trim().min(5).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const body = await request.json();
    const input = updateSchema.parse(body);
    const branch = await updateBranch(user, id, input);
    return NextResponse.json({ branch });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Filialni o'chirish/arxivlash: bo'sh filial butunlay o'chadi, ma'lumoti
 * bori esa arxivlanadi (tarix saqlanadi) — lib/branches.ts.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  try {
    const result = await deleteOrArchiveBranch(user, id);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
