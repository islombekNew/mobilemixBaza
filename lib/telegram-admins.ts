/**
 * Dinamik admin boshqaruvi.
 *
 * Rollar:
 *  - EGA (owner): TELEGRAM_ADMIN_CHAT_ID env'dagi ID'lar (hozir 7802923308).
 *    Doimiy — bot orqali o'chirib bo'lmaydi. Faqat ega yangi admin
 *    qo'sha oladi / o'chira oladi (/adminqosh, /adminochir).
 *  - ADMIN: telegram_admins jadvalidagi ID'lar. Ikkala botda ham admin
 *    huquqiga ega (telefon qo'shish, hisobotlar) va barcha
 *    bildirishnomalarni oladi.
 */

import prisma from "@/lib/prisma";
import { getAdminChatIds } from "@/lib/telegram";

/** EGA'mi (env'dagi doimiy ID'lar). */
export function isOwnerChat(chatId: string): boolean {
  return getAdminChatIds().includes(chatId);
}

/** Barcha faol admin ID'lari: env (ega) + baza (qo'shilganlar). */
export async function getEffectiveAdminChatIds(): Promise<string[]> {
  const envIds = getAdminChatIds();
  try {
    const dbAdmins = await prisma.telegramAdmin.findMany({ select: { chatId: true } });
    const all = new Set([...envIds, ...dbAdmins.map((a) => a.chatId)]);
    return Array.from(all);
  } catch (error) {
    // Baza vaqtincha ishlamasa ham ega har doim admin bo'lib qoladi
    console.error("[telegram-admins] Admin ro'yxatini o'qishda xatolik:", error);
    return envIds;
  }
}

/** Shu chat admin(yoki ega)mi. */
export async function isAdminChat(chatId: string): Promise<boolean> {
  if (isOwnerChat(chatId)) return true;
  try {
    const found = await prisma.telegramAdmin.findUnique({ where: { chatId } });
    return Boolean(found);
  } catch {
    return false;
  }
}

/** Yangi admin qo'shadi (faqat ega chaqirishi kerak — chaqiruvchi tekshiradi). */
export async function addAdmin(chatId: string, name: string | null, addedBy: string) {
  return prisma.telegramAdmin.upsert({
    where: { chatId },
    create: { chatId, name, addedBy },
    update: { name: name ?? undefined },
  });
}

/** Adminni o'chiradi. Ega (env) o'chirilmaydi — chaqiruvchi tekshiradi. */
export async function removeAdmin(chatId: string): Promise<boolean> {
  try {
    await prisma.telegramAdmin.delete({ where: { chatId } });
    return true;
  } catch {
    return false; // topilmadi
  }
}

/** Adminlar ro'yxati (ega + qo'shilganlar) — /adminlar buyrug'i uchun. */
export async function listAdmins(): Promise<
  { chatId: string; name: string | null; isOwner: boolean }[]
> {
  const owners = getAdminChatIds().map((id) => ({
    chatId: id,
    name: "Ega" as string | null,
    isOwner: true,
  }));
  const dbAdmins = await prisma.telegramAdmin.findMany({ orderBy: { createdAt: "asc" } });
  return [
    ...owners,
    ...dbAdmins
      .filter((a) => !getAdminChatIds().includes(a.chatId))
      .map((a) => ({ chatId: a.chatId, name: a.name, isOwner: false })),
  ];
}
