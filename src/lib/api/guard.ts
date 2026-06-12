import { can } from "@/lib/permissions/check";
import { jsonError } from "@/lib/api/response";
import type { SessionUser } from "@/types/auth";
import type { NextResponse } from "next/server";

export function requirePerm(
  user: SessionUser,
  permission: string
): NextResponse | null {
  if (!can(user, permission)) {
    return jsonError("Insufficient permissions", 403);
  }
  return null;
}
