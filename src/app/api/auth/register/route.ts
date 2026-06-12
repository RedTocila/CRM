import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  companyName: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const slug = slugify(body.companyName);

    const slugExists = await prisma.company.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now().toString(36)}` : slug;

    const starterPlan = await prisma.subscriptionPlan.findUnique({
      where: { slug: "starter" },
      include: { modules: true },
    });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
      },
    });

    const company = await prisma.company.create({
      data: {
        name: body.companyName,
        slug: finalSlug,
        displayName: body.companyName,
      },
    });

    if (starterPlan) {
      await prisma.companySubscription.create({
        data: {
          companyId: company.id,
          planId: starterPlan.id,
          status: "TRIAL",
          provider: "MANUAL",
        },
      });

      for (const pm of starterPlan.modules) {
        await prisma.companyModule.create({
          data: { companyId: company.id, moduleId: pm.moduleId, enabled: true },
        });
      }
    }

    const ownerRole = await prisma.role.create({
      data: {
        companyId: company.id,
        name: "Owner",
        slug: "owner",
        isSystem: true,
      },
    });

    const allPerms = await prisma.permission.findMany();
    await prisma.rolePermission.createMany({
      data: allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
    });

    await prisma.companyMember.create({
      data: { companyId: company.id, userId: user.id, roleId: ownerRole.id },
    });

    const pipeline = await prisma.pipeline.create({
      data: { companyId: company.id, name: "Sales Pipeline", isDefault: true },
    });

    const defaultStages = ["Qualification", "Proposal", "Negotiation", "Closed Won"];
    await prisma.pipelineStage.createMany({
      data: defaultStages.map((name, order) => ({
        pipelineId: pipeline.id,
        name,
        order,
        probability: (order + 1) * 25,
      })),
    });

    return NextResponse.json({ success: true, slug: finalSlug });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
