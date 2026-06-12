import bcrypt from "bcryptjs";
import { seedTemplateCrms } from "./seed-templates";
import { createSeedPrismaClient } from "./seed-client";

const prisma = createSeedPrismaClient();

const MODULES = [
  { id: "dashboard", name: "Dashboard", description: "Overview and metrics", icon: "LayoutDashboard", category: "main", sortOrder: 1 },
  { id: "leads", name: "Leads", description: "Lead inbox and management", icon: "UserPlus", category: "main", sortOrder: 2 },
  { id: "agents", name: "Agents", description: "Sales agent accounts", icon: "UserCog", category: "main", sortOrder: 3 },
  { id: "pipeline", name: "Pipeline", description: "Lead pipeline board", icon: "Kanban", category: "main", sortOrder: 4 },
  { id: "marketing", name: "Marketing", description: "Marketing campaigns", icon: "Megaphone", category: "growth", sortOrder: 5 },
  { id: "email_campaigns", name: "Email Campaigns", description: "Email sequences", icon: "Mail", category: "growth", sortOrder: 6 },
  { id: "forms", name: "Forms", description: "Lead capture forms", icon: "FormInput", category: "growth", sortOrder: 7 },
  { id: "ai_assistant", name: "AI Assistant", description: "AI-powered insights", icon: "Bot", category: "ai", sortOrder: 8 },
  { id: "team", name: "Team", description: "Team members and roles", icon: "UsersRound", category: "admin", sortOrder: 9 },
  { id: "reports", name: "Reports", description: "Analytics and reports", icon: "BarChart3", category: "analytics", sortOrder: 10 },
];

const ACTIVE_MODULE_IDS = MODULES.map((m) => m.id);

const ACTIONS = ["create", "read", "update", "delete", "export"] as const;

function modulePermissions(moduleId: string, resource: string) {
  return ACTIONS.map((action) => ({
    key: `${moduleId}.${resource}.${action}`,
    moduleId,
    resource,
    action,
    description: `${action} ${resource}`,
  }));
}

const ALL_PERMISSIONS = [
  ...modulePermissions("leads", "lead"),
  ...modulePermissions("team", "member"),
  { key: "team.member.manage_users", moduleId: "team", resource: "member", action: "manage_users", description: "Manage team members" },
  ...modulePermissions("pipeline", "pipeline"),
  ...modulePermissions("marketing", "campaign"),
  ...modulePermissions("email_campaigns", "sequence"),
  ...modulePermissions("forms", "form"),
  { key: "ai_assistant.chat.use", moduleId: "ai_assistant", resource: "chat", action: "use", description: "Use AI assistant" },
  ...modulePermissions("reports", "report"),
  { key: "settings.company.manage_settings", moduleId: "settings", resource: "company", action: "manage_settings", description: "Manage company settings" },
  { key: "settings.users.manage_users", moduleId: "settings", resource: "users", action: "manage_users", description: "Manage users" },
  { key: "settings.roles.manage_settings", moduleId: "settings", resource: "roles", action: "manage_settings", description: "Manage roles" },
  { key: "settings.custom_fields.manage_settings", moduleId: "settings", resource: "custom_fields", action: "manage_settings", description: "Manage custom fields" },
  { key: "settings.billing.manage_settings", moduleId: "settings", resource: "billing", action: "manage_settings", description: "Manage billing" },
  { key: "settings.automations.manage_settings", moduleId: "settings", resource: "automations", action: "manage_settings", description: "Manage automations" },
];

const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  owner: "*",
  admin: "*",
  manager: ALL_PERMISSIONS.filter((p) => !p.key.startsWith("settings.")).map((p) => p.key),
  sales: ALL_PERMISSIONS.filter((p) => {
    if (p.key.startsWith("pipeline.")) return p.key.endsWith(".read");
    if (p.key.startsWith("team.")) return p.key.endsWith(".read");
    if (p.key.startsWith("email_campaigns.")) return p.key.endsWith(".read");
    if (p.key.startsWith("reports.")) return p.key.endsWith(".read");
    if (p.key.startsWith("leads.")) return !p.key.endsWith(".delete");
    return false;
  }).map((p) => p.key),
  support: ALL_PERMISSIONS.filter((p) => p.key.startsWith("reports")).map((p) => p.key),
  marketing: ALL_PERMISSIONS.filter((p) =>
    ["marketing", "email_campaigns", "forms", "leads"].some((m) => p.key.startsWith(m))
  ).map((p) => p.key),
};

async function main() {
  console.log("Seeding database...");

  for (const mod of MODULES) {
    await prisma.moduleDefinition.upsert({
      where: { id: mod.id },
      create: { ...mod, isCore: ["dashboard", "leads", "agents"].includes(mod.id) },
      update: mod,
    });
  }

  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: perm,
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.key, p.id]));

  const plans = [
    {
      slug: "starter",
      name: "Starter",
      description: "For small teams",
      priceMonthly: 29,
      priceYearly: 290,
      limits: { users: 5, contacts: 1000, leads: 500, storage_mb: 1024 },
      modules: ["dashboard", "leads", "agents", "pipeline", "reports"],
    },
    {
      slug: "professional",
      name: "Professional",
      description: "For growing businesses",
      priceMonthly: 79,
      priceYearly: 790,
      limits: { users: 25, contacts: 10000, leads: 5000, storage_mb: 10240 },
      modules: ACTIVE_MODULE_IDS.filter((id) => id !== "ai_assistant"),
    },
    {
      slug: "enterprise",
      name: "Enterprise",
      description: "Full platform access",
      priceMonthly: 199,
      priceYearly: 1990,
      limits: { users: 100, contacts: 100000, leads: 50000, storage_mb: 102400 },
      modules: ACTIVE_MODULE_IDS,
    },
  ];

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      create: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
      },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
      },
    });

    for (const [key, value] of Object.entries(plan.limits)) {
      await prisma.planLimit.upsert({
        where: { planId_key: { planId: created.id, key } },
        create: { planId: created.id, key, value },
        update: { value },
      });
    }

    for (const moduleId of plan.modules) {
      await prisma.planModule.upsert({
        where: { planId_moduleId: { planId: created.id, moduleId } },
        create: { planId: created.id, moduleId },
        update: {},
      });
    }
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  const ownerPasswordHash = await bcrypt.hash(
    process.env.OWNER_PASSWORD ?? "Komardarja_1",
    12
  );

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@crm.local" },
    create: {
      email: "admin@crm.local",
      name: "Super Admin",
      passwordHash,
      isSuperAdmin: true,
    },
    update: { passwordHash, isSuperAdmin: true },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: "redtocila@gmail.com" },
    create: {
      email: "redtocila@gmail.com",
      name: "RedTocila",
      passwordHash: ownerPasswordHash,
      isSuperAdmin: true,
      status: "ACTIVE",
    },
    update: { isSuperAdmin: true, name: "RedTocila", status: "ACTIVE" },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@acme.local" },
    create: {
      email: "demo@acme.local",
      name: "Demo User",
      passwordHash,
    },
    update: { passwordHash },
  });

  const enterprisePlan = await prisma.subscriptionPlan.findUnique({
    where: { slug: "enterprise" },
  });

  const company = await prisma.company.upsert({
    where: { slug: "acme" },
    create: {
      name: "Acme Corp",
      slug: "acme",
      displayName: "Acme CRM",
      primaryColor: "#2563eb",
    },
    update: {},
  });

  if (enterprisePlan) {
    await prisma.companySubscription.upsert({
      where: { companyId: company.id },
      create: {
        companyId: company.id,
        planId: enterprisePlan.id,
        status: "ACTIVE",
        provider: "MANUAL",
      },
      update: { status: "ACTIVE" },
    });
  }

  for (const mod of MODULES) {
    await prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId: company.id, moduleId: mod.id } },
      create: { companyId: company.id, moduleId: mod.id, enabled: true },
      update: { enabled: true },
    });
  }

  const legacyModules = await prisma.moduleDefinition.findMany({
    where: { id: { notIn: ACTIVE_MODULE_IDS } },
    select: { id: true },
  });
  for (const legacy of legacyModules) {
    await prisma.companyModule.upsert({
      where: { companyId_moduleId: { companyId: company.id, moduleId: legacy.id } },
      create: { companyId: company.id, moduleId: legacy.id, enabled: false },
      update: { enabled: false },
    });
  }

  const systemRoles = [
    { slug: "owner", name: "Owner", isSystem: true },
    { slug: "admin", name: "Admin", isSystem: true },
    { slug: "manager", name: "Manager", isSystem: true },
    { slug: "sales", name: "Sales", isSystem: true },
    { slug: "support", name: "Support", isSystem: true },
    { slug: "marketing", name: "Marketing", isSystem: true },
  ];

  for (const roleDef of systemRoles) {
    const role = await prisma.role.upsert({
      where: { companyId_slug: { companyId: company.id, slug: roleDef.slug } },
      create: { ...roleDef, companyId: company.id },
      update: { name: roleDef.name },
    });

    const permKeys = ROLE_PERMISSIONS[roleDef.slug];
    const keys = permKeys === "*" ? allPerms.map((p) => p.key) : permKeys;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const key of keys) {
      const permId = permMap.get(key);
      if (permId) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permId },
        });
      }
    }
  }

  const ownerRole = await prisma.role.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: "owner" } },
  });

  const salesRole = await prisma.role.findUnique({
    where: { companyId_slug: { companyId: company.id, slug: "sales" } },
  });

  const demoAgent = await prisma.user.upsert({
    where: { email: "agent@acme.local" },
    create: {
      email: "agent@acme.local",
      name: "Alex Agent",
      passwordHash,
    },
    update: { passwordHash },
  });

  if (ownerRole) {
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: demoUser.id } },
      create: { companyId: company.id, userId: demoUser.id, roleId: ownerRole.id, memberTag: "ADMIN" },
      update: { roleId: ownerRole.id, memberTag: "ADMIN" },
    });
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: superAdmin.id } },
      create: { companyId: company.id, userId: superAdmin.id, roleId: ownerRole.id, memberTag: "ADMIN" },
      update: { roleId: ownerRole.id, memberTag: "ADMIN" },
    });
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: ownerUser.id } },
      create: { companyId: company.id, userId: ownerUser.id, roleId: ownerRole.id, memberTag: "ADMIN" },
      update: { roleId: ownerRole.id, memberTag: "ADMIN" },
    });
  }

  if (salesRole) {
    await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId: company.id, userId: demoAgent.id } },
      create: {
        companyId: company.id,
        userId: demoAgent.id,
        roleId: salesRole.id,
        memberTag: "AGENT",
      },
      update: { roleId: salesRole.id, memberTag: "AGENT" },
    });
  }

  const emailTemplates = [
    {
      slug: "intro-cold-outreach",
      name: "Cold introduction",
      category: "INTRODUCTION" as const,
      subject: "Quick intro — {{company_name}}",
      body: `Hi {{first_name}},

I came across {{company}} and thought our solution might help with {{pain_point}}.

Would you be open to a 15-minute call this week?

Best,
{{agent_name}}`,
    },
    {
      slug: "follow-up-no-response",
      name: "Follow-up (no response)",
      category: "FOLLOW_UP" as const,
      subject: "Re: Following up",
      body: `Hi {{first_name}},

Just bumping this to the top of your inbox — happy to share a quick overview if timing is better now.

Thanks,
{{agent_name}}`,
    },
    {
      slug: "proposal-sent",
      name: "Proposal sent",
      category: "PROPOSAL" as const,
      subject: "Your proposal from {{company_name}}",
      body: `Hi {{first_name}},

As discussed, I've attached our proposal for {{project_name}}.

Key highlights:
- {{highlight_1}}
- {{highlight_2}}

Let me know if you have questions or want to walk through it together.

Best,
{{agent_name}}`,
    },
    {
      slug: "meeting-confirmation",
      name: "Meeting confirmation",
      category: "MEETING" as const,
      subject: "Confirmed: {{meeting_date}}",
      body: `Hi {{first_name}},

Looking forward to our call on {{meeting_date}} at {{meeting_time}}.

Agenda:
{{agenda}}

Talk soon,
{{agent_name}}`,
    },
    {
      slug: "thank-you-post-call",
      name: "Thank you after call",
      category: "THANK_YOU" as const,
      subject: "Great speaking with you",
      body: `Hi {{first_name}},

Thanks for your time today. As promised, here are the next steps:
{{next_steps}}

Reach out anytime.

Best,
{{agent_name}}`,
    },
    {
      slug: "objection-price",
      name: "Price objection",
      category: "OBJECTION" as const,
      subject: "Re: Budget considerations",
      body: `Hi {{first_name}},

I understand budget is a factor. Many clients in similar situations found value in {{value_prop}} — often offsetting cost within {{timeframe}}.

Happy to explore flexible options that fit your timeline.

Best,
{{agent_name}}`,
    },
    {
      slug: "closing-ready",
      name: "Ready to close",
      category: "CLOSING" as const,
      subject: "Ready to get started?",
      body: `Hi {{first_name}},

Based on our conversations, it sounds like we're aligned. I can send the agreement today so we can kick off {{start_date}}.

Shall I proceed?

Best,
{{agent_name}}`,
    },
    {
      slug: "greeting-welcome",
      name: "Welcome new client",
      category: "GREETING" as const,
      subject: "Welcome to {{company_name}}!",
      body: `Hi {{first_name}},

Welcome aboard! We're thrilled to have you with {{company_name}}.

Your dedicated contact is {{agent_name}} — reach out anytime at {{agent_email}}.

Here's what happens next:
{{next_steps}}

Warm regards,
{{agent_name}}`,
    },
    {
      slug: "greeting-holiday",
      name: "Holiday greeting",
      category: "GREETING" as const,
      subject: "Happy {{holiday}} from {{company_name}}",
      body: `Hi {{first_name}},

Wishing you and your team a wonderful {{holiday}}!

Thank you for being a valued part of our community.

Best wishes,
{{agent_name}}
{{company_name}}`,
    },
    {
      slug: "greeting-check-in",
      name: "Friendly check-in",
      category: "GREETING" as const,
      subject: "Just checking in, {{first_name}}",
      body: `Hi {{first_name}},

Hope you're doing well! I wanted to reach out and see how things are going on your end.

Is there anything we can help with this week?

Cheers,
{{agent_name}}`,
    },
    {
      slug: "billing-invoice-sent",
      name: "Invoice sent",
      category: "BILLING" as const,
      subject: "Invoice #{{invoice_number}} from {{company_name}}",
      body: `Hi {{first_name}},

Please find your invoice attached for {{amount}} due on {{due_date}}.

Invoice #: {{invoice_number}}
Payment link: {{payment_link}}

If you have any questions about this invoice, reply to this email.

Thank you,
{{company_name}} Billing`,
    },
    {
      slug: "billing-payment-reminder",
      name: "Payment reminder",
      category: "BILLING" as const,
      subject: "Reminder: Invoice #{{invoice_number}} due {{due_date}}",
      body: `Hi {{first_name}},

This is a friendly reminder that invoice #{{invoice_number}} for {{amount}} is due on {{due_date}}.

Pay now: {{payment_link}}

If you've already sent payment, please disregard this message.

Best,
{{company_name}} Billing`,
    },
    {
      slug: "billing-payment-received",
      name: "Payment received",
      category: "BILLING" as const,
      subject: "Payment received — thank you!",
      body: `Hi {{first_name}},

We've received your payment of {{amount}} for invoice #{{invoice_number}}.

Thank you for your business!

Best regards,
{{company_name}}`,
    },
    {
      slug: "review-google-request",
      name: "Google review request",
      category: "REVIEW" as const,
      subject: "We'd love your feedback, {{first_name}}",
      body: `Hi {{first_name}},

Thank you for choosing {{company_name}}! If you had a great experience, would you mind leaving us a quick Google review?

It only takes a minute: {{review_link}}

Your feedback helps us serve you and others better.

Thanks so much,
{{agent_name}}`,
    },
    {
      slug: "review-post-purchase",
      name: "Post-purchase review",
      category: "REVIEW" as const,
      subject: "How was your experience with {{product_name}}?",
      body: `Hi {{first_name}},

We hope you're enjoying {{product_name}}!

We'd love to hear how it's going. Your honest review helps us improve and helps others make informed decisions.

Share your thoughts: {{review_link}}

Thank you,
{{agent_name}}`,
    },
    {
      slug: "review-testimonial",
      name: "Testimonial request",
      category: "REVIEW" as const,
      subject: "Would you share a quick testimonial?",
      body: `Hi {{first_name}},

We're putting together success stories from clients like you. Would you be willing to share a short testimonial about your experience with {{company_name}}?

A few sentences about {{highlight}} would be perfect.

You can reply directly to this email — we'll only publish with your approval.

Thanks,
{{agent_name}}`,
    },
  ];

  for (const tpl of emailTemplates) {
    await prisma.emailTemplate.upsert({
      where: { companyId_slug: { companyId: company.id, slug: tpl.slug } },
      create: { ...tpl, companyId: company.id },
      update: { name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category },
    });
  }

  const pipeline = await prisma.pipeline.upsert({
    where: { id: "seed-pipeline-acme" },
    create: {
      id: "seed-pipeline-acme",
      companyId: company.id,
      name: "Sales Pipeline",
      isDefault: true,
    },
    update: {},
  });

  const stages = [
    { name: "Qualification", order: 0, probability: 10 },
    { name: "Proposal", order: 1, probability: 40 },
    { name: "Negotiation", order: 2, probability: 70 },
    { name: "Closed Won", order: 3, probability: 100 },
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.upsert({
      where: { id: `seed-stage-${stage.order}-acme` },
      create: {
        id: `seed-stage-${stage.order}-acme`,
        pipelineId: pipeline.id,
        ...stage,
      },
      update: stage,
    });
  }

  const defaultTags = [
    { name: "Hot Lead", color: "#ef4444" },
    { name: "Qualified", color: "#22c55e" },
    { name: "VIP", color: "#8b5cf6" },
    { name: "Follow Up", color: "#f59e0b" },
  ];
  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { companyId_name: { companyId: company.id, name: tag.name } },
      create: { companyId: company.id, ...tag },
      update: { color: tag.color },
    });
  }

  const featureFlags = [
    "email_tracking",
    "call_tracking",
    "pipelines",
    "automations",
    "advanced_analytics",
    "api_access",
  ];
  for (const feature of featureFlags) {
    await prisma.companyFeatureFlag.upsert({
      where: { companyId_feature: { companyId: company.id, feature } },
      create: { companyId: company.id, feature, enabled: true },
      update: { enabled: true },
    });
  }

  await prisma.lead.createMany({
    data: [
      {
        companyId: company.id,
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        source: "WEBSITE",
        status: "NEW",
        priority: "HIGH",
        country: "USA",
        city: "New York",
        expectedRevenue: 15000,
        conversionProbability: 40,
        createdById: demoUser.id,
        score: 75,
      },
      {
        companyId: company.id,
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@example.com",
        source: "REFERRAL",
        status: "QUALIFIED",
        priority: "URGENT",
        country: "UK",
        city: "London",
        expectedRevenue: 45000,
        conversionProbability: 75,
        createdById: demoUser.id,
        score: 90,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.dashboard.createMany({
    data: [
      { companyId: company.id, name: "Executive Dashboard", type: "executive", isDefault: true },
      { companyId: company.id, name: "Sales Dashboard", type: "sales", isDefault: true },
      { companyId: company.id, name: "Support Dashboard", type: "support", isDefault: true },
    ],
    skipDuplicates: true,
  });

  const templates = await seedTemplateCrms(prisma, passwordHash, permMap, allPerms.map((p) => p.key));

  console.log("Seed complete!");
  console.log(`Super Admin: admin@crm.local / admin123`);
  console.log(`Demo User: demo@acme.local / admin123`);
  console.log(`Demo Agent: agent@acme.local / admin123`);
  console.log(`Demo Company: /app/acme`);
  console.log("\n--- Industry Template CRMs ---");
  for (const t of templates) {
    console.log(`[${t.industry}] ${t.name}: /app/${t.slug}`);
    console.log(`  Login: ${t.email} / ${t.password}`);
    console.log(`  ${t.description}`);
  }
  void superAdmin;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
