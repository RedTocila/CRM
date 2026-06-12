"use server";

import { signOut as authSignOut } from "@/lib/auth/config";

export async function signOut() {
  await authSignOut({ redirectTo: "/login" });
}
