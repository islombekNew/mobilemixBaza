import { requireUser } from "@/lib/session";
import { listUsers, getMonthlySellerStats } from "@/lib/users";
import { listBranches } from "@/lib/branches";
import { redirect } from "next/navigation";
import { UserTable } from "@/components/UserTable";
import { AddUserButton } from "@/components/AddUserButton";

export default async function XodimlarPage() {
  const user = await requireUser();

  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const [users, branches, stats] = await Promise.all([
    listUsers(user),
    listBranches(user),
    getMonthlySellerStats(user),
  ]);

  // Map'ni client komponentga uzatish uchun oddiy obyektga aylantiramiz
  const monthlyStats = Object.fromEntries(stats);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Xodimlar</h1>
        <AddUserButton branches={branches} />
      </div>

      <UserTable
        users={users}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        monthlyStats={monthlyStats}
        currentUserId={user.id}
      />
    </div>
  );
}
