import { signIn } from "@/lib/auth/config";
import { getDemoTemplate, TEMPLATE_PASSWORD } from "@/lib/crm-templates";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const template = getDemoTemplate(slug);

  if (!template) {
    return NextResponse.redirect(new URL("/templates", _req.url));
  }

  return signIn("credentials", {
    email: template.ownerEmail,
    password: TEMPLATE_PASSWORD,
    redirectTo: `/app/${slug}`,
  });
}
