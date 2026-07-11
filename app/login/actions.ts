"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { normalizeLogin } from "@/lib/login-format";

export type LoginResult = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const rawLogin = formData.get("login");
  const password = formData.get("password");

  // Xato xabarlari KOD sifatida qaytariladi ("required" | "invalid") —
  // client tomoni joriy tilга tarjima qiladi (app/login/page.tsx).
  if (!rawLogin || !password) {
    return { error: "required" };
  }

  // Telefon raqamli login uchun "+998" prefiksini kafolatlaymiz (client
  // tomonida ham qo'yiladi, bu esa oxirgi, ishonchli qatlam).
  const login = normalizeLogin(String(rawLogin));

  try {
    await signIn("credentials", {
      login,
      password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalid" };
    }
    // NextAuth muvaffaqiyatli signIn paytida NEXT_REDIRECT xatosini tashlaydi —
    // bu kutilgan holat, qayta tashlaymiz.
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
