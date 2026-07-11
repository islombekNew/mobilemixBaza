import { logoutAction } from "@/app/login/actions";
import { getDict } from "@/lib/i18n/server";

export async function LogoutButton() {
  const t = await getDict();
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-white/5"
      >
        {t.nav.logout}
      </button>
    </form>
  );
}
