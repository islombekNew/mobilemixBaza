import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/access-control";

/**
 * Sahifa/API route'larda ishlatiladi: agar foydalanuvchi login qilmagan
 * bo'lsa /login ga yo'naltiradi, aks holda SessionUser qaytaradi.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return {
    id: session.user.id,
    role: session.user.role,
    branchId: session.user.branchId,
  };
}
