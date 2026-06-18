interface UserRow {
  id: string;
  name: string;
  login: string;
  role: string;
  createdAt: string | Date;
  branch: { id: string; name: string } | null;
}

interface UserTableProps {
  users: UserRow[];
}

const roleLabels: Record<string, string> = {
  OWNER: "Egasi",
  SELLER: "Sotuvchi",
};

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
        Hali xodim qo&apos;shilmagan
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/5 text-left text-gray-400">
            <th className="px-4 py-3 font-medium">Ism-familiya</th>
            <th className="px-4 py-3 font-medium">Login</th>
            <th className="px-4 py-3 font-medium">Roli</th>
            <th className="px-4 py-3 font-medium">Filial</th>
            <th className="px-4 py-3 font-medium">Qo&apos;shilgan sana</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-white/5 text-gray-200 last:border-0"
            >
              <td className="px-4 py-3 font-medium text-white">{u.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{u.login}</td>
              <td className="px-4 py-3">{roleLabels[u.role] ?? u.role}</td>
              <td className="px-4 py-3 text-gray-400">
                {u.branch?.name ?? "— (barcha filiallar)"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {new Date(u.createdAt).toLocaleDateString("uz-UZ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
