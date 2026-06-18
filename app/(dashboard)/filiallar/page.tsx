import { requireUser } from "@/lib/session";
import { listBranches } from "@/lib/branches";
import { redirect } from "next/navigation";
import { AddBranchButton } from "@/components/AddBranchButton";
import type { Branch } from "@prisma/client";

export default async function FiliallarPage() {
  const user = await requireUser();

  if (user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const branches: Branch[] = await listBranches(user);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Filiallar</h1>
        <AddBranchButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h3 className="font-medium text-white">{branch.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{branch.address}</p>
            <p className="mt-1 text-sm text-gray-500">{branch.phoneNumber}</p>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
          Hali filial qo&apos;shilmagan
        </div>
      )}
    </div>
  );
}
