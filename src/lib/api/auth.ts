import type { Role, User } from "@/types";
import { delay } from "./_mock";

const DEMO_USERS: Record<Role, User> = {
  admin: { id: "u-admin", name: "Mr. Vinod", email: "admin@demo.in", role: "admin" },
  manager: { id: "u-mgr", name: "Regional Mgr", email: "mgr@demo.in", role: "manager" },
  faculty: {
    id: "f-shashi",
    name: "Shashi Karel",
    email: "shashi@demo.in",
    role: "faculty",
    collegeCode: "001",
  },
  student: { id: "s-101", name: "Rahul Verma", email: "rahul@demo.in", role: "student" },
};

export async function login(role: Role): Promise<User> {
  return delay(DEMO_USERS[role], 200);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("osm.user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function storeUser(u: User | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem("osm.user", JSON.stringify(u));
  else localStorage.removeItem("osm.user");
}