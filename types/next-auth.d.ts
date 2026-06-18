import type { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      branchId: string | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    branchId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    branchId: string | null;
  }
}
