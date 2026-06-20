import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { MixMobileLogo } from "@/components/MixMobileLogo";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { DashboardNav } from "@/components/DashboardNav";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const roleLabels: Record<string, string> = {
  OWNER: "Egasi",
  SELLER: "Sotuvchi",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const branches = await listBranches(user);

  return (
    <>
      <div className="flex min-h-screen">
        {/* Desktop sidebar — mobilda yashirin */}
        <aside className="hidden w-60 flex-col border-r border-white/10 bg-black/30 p-4 md:flex">
          <MixMobileLogo className="mb-6 h-10 w-auto" />

          {user.role === "OWNER" && (
            <BranchSwitcher branches={branches} className="mb-6" />
          )}

          <DashboardNav role={user.role} />

          <div className="mt-auto space-y-3 pt-4">
            <p className="px-1 text-xs text-gray-500">
              {roleLabels[user.role] ?? user.role}
            </p>
            <LogoutButton />
          </div>
        </aside>

        {/* O'ng tomon: mobil header + kontent */}
        <div className="flex flex-1 flex-col">

          {/* Mobil yuqori header — desktopda yashirin */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0d0517]/95 px-4 py-3 backdrop-blur-sm md:hidden">
            <MixMobileLogo className="h-7 w-auto flex-shrink-0" />

            <div className="flex flex-1 items-center justify-end gap-2">
              {user.role === "OWNER" && (
                <BranchSwitcher
                  branches={branches}
                  showLabel={false}
                  className="flex-1 max-w-[160px]"
                />
              )}
              <LogoutButton />
            </div>
          </header>

          {/* Asosiy kontent */}
          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobil pastki navigatsiya — desktopda yashirin */}
      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[#0d0517]/95 backdrop-blur-sm md:hidden">
        <MobileBottomNav role={user.role} />
      </nav>
    </>
  );
}
