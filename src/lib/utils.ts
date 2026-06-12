import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCurrency(amount: number | string, currency = "USD"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

/** Safe label formatter for enums / status strings */
export function formatLabel(value: string | null | undefined, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return value.replace(/_/g, " ");
}

export function getModulePath(mod: { id?: string; routes?: { path: string }[] }): string {
  const path = mod.routes?.[0]?.path;
  if (path === "/" || path === "") return "";
  if (path) return path;
  if (!mod.id) return "";
  return `/${mod.id.replace(/_/g, "-")}`;
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (typeof error === "string") return error;
  return fallback;
}
