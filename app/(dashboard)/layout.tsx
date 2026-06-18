import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { MixMobileLogo } from "@/components/MixMobileLogo";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { DashboardNav } from "@/components/DashboardNav";
import { LogoutButton } from "@/components/LogoutButton";

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
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-white/10 bg-black/30 p-4">
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

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
