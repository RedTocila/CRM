import type { PrismaClient } from "@prisma/client";
import { CRM_TEMPLATES, TEMPLATE_PASSWORD } from "../src/lib/crm-templates";

const TENANT_NAV_MODULES = [
  "dashboard",
  "leads",
  "agents",
  "pipeline",
  "marketing",
  "email_campaigns",
  "forms",
  "ai_assistant",
  "team",
  "reports",
] as const;

export interface TemplateSeedResult {
  slug: string;
  name: string;
  industry: string;
  email: string;
  password: string;
  description: string;
}

interface TemplateConfig {
  slug: string;
  name: string;
  displayName: string;
  primaryColor: string;
  description: string;
  industry: string;
  planSlug: "professional" | "enterprise";
  moduleIds: string[];
  ownerEmail: string;
  ownerName: string;
  pipelineName: string;
  stages: string[];
  seedData: (ctx: {
    prisma: PrismaClient;
    companyId: string;
    userId: string;
    pipelineId: string;
    stageIds: string[];
  }) => Promise<void>;
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000);

const TEMPLATE_CONFIGS: TemplateConfig[] = [
  {
    slug: CRM_TEMPLATES[0].slug,
    name: "Smile Abroad",
    displayName: CRM_TEMPLATES[0].name,
    primaryColor: CRM_TEMPLATES[0].primaryColor,
    description: CRM_TEMPLATES[0].description,
    industry: CRM_TEMPLATES[0].industry,
    planSlug: "enterprise",
    ownerEmail: CRM_TEMPLATES[0].ownerEmail,
    ownerName: "Dr. Elena Vasquez",
    pipelineName: "Patient Journey",
    stages: [
      "Inquiry",
      "Consultation",
      "Treatment Plan",
      "Travel Booked",
      "In Treatment",
      "Completed",
    ],
    moduleIds: [...TENANT_NAV_MODULES],
    seedData: async ({ prisma, companyId, userId, pipelineId, stageIds }) => {
      const patients = await Promise.all([
        prisma.contact.create({
          data: {
            companyId,
            firstName: "James",
            lastName: "Mitchell",
            email: "j.mitchell@email.co.uk",
            phone: "+44 7700 900123",
            company: "London, UK",
            title: "Patient — Full mouth implants",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Sophie",
            lastName: "Weber",
            email: "sophie.weber@gmail.de",
            phone: "+49 151 2345678",
            company: "Munich, Germany",
            title: "Patient — Veneers package",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Michael",
            lastName: "Torres",
            email: "mtorres@yahoo.com",
            phone: "+1 305 555 0198",
            company: "Miami, USA",
            title: "Patient — All-on-4 consultation",
            createdById: userId,
          },
        }),
      ]);

      await prisma.lead.createMany({
        data: [
          {
            companyId,
            firstName: "Anna",
            lastName: "Kowalski",
            email: "anna.k@wp.pl",
            phone: "+48 600 111 222",
            company: "Warsaw, Poland",
            source: "GOOGLE_ADS",
            status: "NEW",
            score: 70,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Robert",
            lastName: "Hansen",
            email: "r.hansen@live.dk",
            phone: "+45 20 12 34 56",
            company: "Copenhagen, Denmark",
            source: "INSTAGRAM_ADS",
            status: "CONTACTED",
            score: 55,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Yuki",
            lastName: "Tanaka",
            email: "y.tanaka@outlook.jp",
            company: "Osaka, Japan",
            source: "REFERRAL",
            status: "QUALIFIED",
            score: 92,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Claire",
            lastName: "Dubois",
            email: "claire.dubois@orange.fr",
            phone: "+33 6 12 34 56 78",
            company: "Lyon, France",
            source: "WEBSITE",
            status: "NEW",
            score: 48,
            createdById: userId,
          },
        ],
      });

      await prisma.deal.createMany({
        data: [
          {
            companyId,
            title: "Full Mouth Implants — James Mitchell",
            value: 18500,
            stageId: stageIds[3],
            pipelineId,
            contactId: patients[0].id,
            status: "OPEN",
            expectedCloseDate: daysFromNow(14),
            createdById: userId,
          },
          {
            companyId,
            title: "Premium Veneers — Sophie Weber",
            value: 9200,
            stageId: stageIds[2],
            pipelineId,
            contactId: patients[1].id,
            status: "OPEN",
            expectedCloseDate: daysFromNow(21),
            createdById: userId,
          },
          {
            companyId,
            title: "All-on-4 Package — Michael Torres",
            value: 24000,
            stageId: stageIds[1],
            pipelineId,
            contactId: patients[2].id,
            status: "OPEN",
            createdById: userId,
          },
          {
            companyId,
            title: "Smile Makeover — Yuki Tanaka",
            value: 14500,
            stageId: stageIds[0],
            pipelineId,
            status: "OPEN",
            createdById: userId,
          },
        ],
      });

      await prisma.task.createMany({
        data: [
          {
            companyId,
            title: "Send treatment plan PDF to James Mitchell",
            description: "Include hotel partner options and airport pickup details",
            priority: "HIGH",
            status: "TODO",
            dueDate: daysFromNow(1),
            createdById: userId,
          },
          {
            companyId,
            title: "Book video consultation with Michael Torres",
            priority: "HIGH",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(2),
            createdById: userId,
          },
          {
            companyId,
            title: "Confirm Sophie Weber travel dates",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: daysFromNow(5),
            createdById: userId,
          },
          {
            companyId,
            title: "Post-treatment follow-up call — completed patients",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: daysFromNow(7),
            createdById: userId,
          },
        ],
      });

      await prisma.calendarEvent.createMany({
        data: [
          {
            companyId,
            title: "Video Consultation — Michael Torres",
            description: "All-on-4 candidacy review + X-ray review",
            location: "Zoom",
            startAt: daysFromNow(2),
            endAt: new Date(daysFromNow(2).getTime() + 3600000),
            createdById: userId,
          },
          {
            companyId,
            title: "Treatment Day — James Mitchell",
            description: "Full mouth implant surgery — Clinic Room 2",
            location: "Main Clinic",
            startAt: daysFromNow(10),
            endAt: daysFromNow(10),
            allDay: true,
            createdById: userId,
          },
          {
            companyId,
            title: "Pre-arrival Call — Sophie Weber",
            location: "Phone",
            startAt: daysFromNow(4),
            endAt: new Date(daysFromNow(4).getTime() + 1800000),
            createdById: userId,
          },
        ],
      });

      await prisma.quote.createMany({
        data: [
          {
            companyId,
            number: "DT-Q-001",
            contactName: "James Mitchell",
            total: 18500,
            status: "SENT",
          },
          {
            companyId,
            number: "DT-Q-002",
            contactName: "Sophie Weber",
            total: 9200,
            status: "SENT",
          },
          {
            companyId,
            number: "DT-Q-003",
            contactName: "Michael Torres",
            total: 24000,
            status: "DRAFT",
          },
        ],
      });

      await prisma.invoice.createMany({
        data: [
          {
            companyId,
            number: "DT-INV-042",
            contactName: "James Mitchell",
            total: 5000,
            status: "PAID",
          },
          {
            companyId,
            number: "DT-INV-043",
            contactName: "Sophie Weber",
            total: 2500,
            status: "SENT",
          },
        ],
      });

      await prisma.kBArticle.createMany({
        data: [
          {
            companyId,
            title: "What to expect during dental implant treatment abroad",
            slug: "implant-treatment-guide",
            content:
              "A complete guide covering consultation, surgery day, recovery timeline, and follow-up care for international patients.",
            published: true,
          },
          {
            companyId,
            title: "Travel & accommodation packages",
            slug: "travel-packages",
            content:
              "Overview of partner hotels, airport transfers, and recommended stay duration per procedure type.",
            published: true,
          },
        ],
      });

      await prisma.campaign.create({
        data: {
          companyId,
          name: "Summer Smile Campaign — UK & Ireland",
          type: "social",
          status: "ACTIVE",
          budget: 3500,
          startDate: daysFromNow(-30),
          endDate: daysFromNow(60),
        },
      });
    },
  },
  {
    slug: CRM_TEMPLATES[1].slug,
    name: "PrimeNest",
    displayName: CRM_TEMPLATES[1].name,
    primaryColor: CRM_TEMPLATES[1].primaryColor,
    description: CRM_TEMPLATES[1].description,
    industry: CRM_TEMPLATES[1].industry,
    planSlug: "professional",
    ownerEmail: CRM_TEMPLATES[1].ownerEmail,
    ownerName: "Marcus Chen",
    pipelineName: "Property Sales Pipeline",
    stages: [
      "New Lead",
      "Viewing Scheduled",
      "Offer Made",
      "Under Contract",
      "Closed Won",
    ],
    moduleIds: [...TENANT_NAV_MODULES],
    seedData: async ({ prisma, companyId, userId, pipelineId, stageIds }) => {
      const buyers = await Promise.all([
        prisma.contact.create({
          data: {
            companyId,
            firstName: "David",
            lastName: "Ramirez",
            email: "david.ramirez@email.com",
            phone: "+1 415 555 0142",
            company: "Buyer",
            title: "Looking for 3BR — Pacific Heights",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Jennifer",
            lastName: "Walsh",
            email: "jwalsh@corp.com",
            phone: "+1 212 555 0199",
            company: "Seller",
            title: "Listing — 88 Oak Street",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Ahmed",
            lastName: "Hassan",
            email: "ahmed.h@invest.com",
            phone: "+971 50 123 4567",
            company: "Investor",
            title: "Commercial portfolio buyer",
            createdById: userId,
          },
        }),
      ]);

      await prisma.lead.createMany({
        data: [
          {
            companyId,
            firstName: "Lisa",
            lastName: "Park",
            email: "lisa.park@gmail.com",
            phone: "+1 650 555 0187",
            source: "WEBSITE",
            status: "NEW",
            score: 60,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Tom",
            lastName: "Anderson",
            email: "t.anderson@outlook.com",
            source: "OTHER",
            status: "CONTACTED",
            score: 75,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Nina",
            lastName: "Petrova",
            email: "nina.p@mail.ru",
            source: "REFERRAL",
            status: "QUALIFIED",
            score: 88,
            createdById: userId,
          },
          {
            companyId,
            firstName: "Carlos",
            lastName: "Mendez",
            email: "cmendez@yahoo.com",
            phone: "+1 305 555 0234",
            source: "FACEBOOK_ADS",
            status: "NEW",
            score: 45,
            createdById: userId,
          },
        ],
      });

      await prisma.deal.createMany({
        data: [
          {
            companyId,
            title: "88 Oak Street — 4BR Victorian",
            value: 1250000,
            stageId: stageIds[3],
            pipelineId,
            contactId: buyers[1].id,
            status: "OPEN",
            expectedCloseDate: daysFromNow(30),
            createdById: userId,
          },
          {
            companyId,
            title: "Pacific Heights Condo — 3BR",
            value: 890000,
            stageId: stageIds[2],
            pipelineId,
            contactId: buyers[0].id,
            status: "OPEN",
            expectedCloseDate: daysFromNow(14),
            createdById: userId,
          },
          {
            companyId,
            title: "Downtown Retail Unit — 2,400 sqft",
            value: 2100000,
            stageId: stageIds[1],
            pipelineId,
            contactId: buyers[2].id,
            status: "OPEN",
            createdById: userId,
          },
          {
            companyId,
            title: "Marina View Apartment — 2BR",
            value: 675000,
            stageId: stageIds[0],
            pipelineId,
            status: "OPEN",
            createdById: userId,
          },
        ],
      });

      await prisma.task.createMany({
        data: [
          {
            companyId,
            title: "Schedule viewing — Pacific Heights condo",
            description: "Coordinate with David Ramirez for Saturday 2pm",
            priority: "HIGH",
            status: "TODO",
            dueDate: daysFromNow(1),
            createdById: userId,
          },
          {
            companyId,
            title: "Prepare CMA for 88 Oak Street",
            priority: "HIGH",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(2),
            createdById: userId,
          },
          {
            companyId,
            title: "Send offer documents to buyer attorney",
            priority: "URGENT",
            status: "TODO",
            dueDate: daysFromNow(1),
            createdById: userId,
          },
          {
            companyId,
            title: "Follow up with Nina Petrova — pre-approval status",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: daysFromNow(3),
            createdById: userId,
          },
        ],
      });

      await prisma.calendarEvent.createMany({
        data: [
          {
            companyId,
            title: "Property Viewing — Pacific Heights 3BR",
            location: "1840 Pacific Ave, Unit 12",
            startAt: daysFromNow(3),
            endAt: new Date(daysFromNow(3).getTime() + 3600000),
            createdById: userId,
          },
          {
            companyId,
            title: "Open House — 88 Oak Street",
            location: "88 Oak Street",
            startAt: daysFromNow(6),
            endAt: new Date(daysFromNow(6).getTime() + 10800000),
            createdById: userId,
          },
          {
            companyId,
            title: "Closing — 88 Oak Street",
            location: "Title Company — 200 Market St",
            startAt: daysFromNow(28),
            endAt: new Date(daysFromNow(28).getTime() + 7200000),
            createdById: userId,
          },
        ],
      });

      await prisma.invoice.create({
        data: {
          companyId,
          number: "RE-COM-088",
          contactName: "Jennifer Walsh",
          total: 37500,
          status: "SENT",
        },
      });

      await prisma.campaign.create({
        data: {
          companyId,
          name: "Spring Listings — Social & Email",
          type: "multi-channel",
          status: "ACTIVE",
          budget: 5000,
          startDate: daysFromNow(-14),
          endDate: daysFromNow(45),
        },
      });
    },
  },
  {
    slug: CRM_TEMPLATES[2].slug,
    name: "ResolveDesk",
    displayName: CRM_TEMPLATES[2].name,
    primaryColor: CRM_TEMPLATES[2].primaryColor,
    description: CRM_TEMPLATES[2].description,
    industry: CRM_TEMPLATES[2].industry,
    planSlug: "professional",
    ownerEmail: CRM_TEMPLATES[2].ownerEmail,
    ownerName: "Jordan Lee",
    pipelineName: "Escalation Pipeline",
    stages: ["New", "Triaged", "In Progress", "Waiting on Customer", "Resolved"],
    moduleIds: [...TENANT_NAV_MODULES],
    seedData: async ({ prisma, companyId, userId }) => {
      const customers = await Promise.all([
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Sarah",
            lastName: "Kim",
            email: "sarah.kim@acmecorp.com",
            phone: "+1 408 555 0101",
            company: "Acme Corp",
            title: "Account Admin",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Daniel",
            lastName: "Brooks",
            email: "d.brooks@startup.io",
            phone: "+1 512 555 0188",
            company: "Startup.io",
            title: "CTO",
            createdById: userId,
          },
        }),
        prisma.contact.create({
          data: {
            companyId,
            firstName: "Maria",
            lastName: "Santos",
            email: "maria@shoplocal.com",
            phone: "+1 646 555 0177",
            company: "ShopLocal",
            title: "Store Manager",
            createdById: userId,
          },
        }),
      ]);

      await prisma.ticket.createMany({
        data: [
          {
            companyId,
            subject: "Cannot access dashboard after password reset",
            description:
              "User reset password but still gets 'invalid session' error on login. Browser: Chrome 124.",
            priority: "HIGH",
            status: "OPEN",
            contactId: customers[0].id,
          },
          {
            companyId,
            subject: "Double charged on annual subscription",
            description:
              "Invoice shows two charges of $999 on the same day. Need refund for duplicate payment.",
            priority: "URGENT",
            status: "IN_PROGRESS",
            contactId: customers[1].id,
          },
          {
            companyId,
            subject: "API webhook returning 503 errors",
            description:
              "Production webhooks failing intermittently since yesterday 3pm UTC. Affecting order sync.",
            priority: "URGENT",
            status: "IN_PROGRESS",
            contactId: customers[1].id,
          },
          {
            companyId,
            subject: "How to export customer list to CSV?",
            description: "Need step-by-step instructions for bulk export with custom fields.",
            priority: "LOW",
            status: "OPEN",
            contactId: customers[2].id,
          },
          {
            companyId,
            subject: "Mobile app crashes on iOS 18",
            description: "App closes immediately after opening on iPhone 15 Pro, iOS 18.1.",
            priority: "HIGH",
            status: "WAITING",
            contactId: customers[0].id,
          },
          {
            companyId,
            subject: "Request: multi-language support for help center",
            description: "Feature request for Spanish and Portuguese KB articles.",
            priority: "LOW",
            status: "OPEN",
          },
        ],
      });

      await prisma.kBArticle.createMany({
        data: [
          {
            companyId,
            title: "How to reset your password",
            slug: "password-reset-guide",
            content:
              "1. Go to login page\n2. Click 'Forgot password'\n3. Enter your email\n4. Check inbox for reset link\n5. Create a new password (min 8 characters)",
            published: true,
          },
          {
            companyId,
            title: "Understanding billing and invoices",
            slug: "billing-faq",
            content:
              "Common questions about subscription billing, refunds, prorated charges, and updating payment methods.",
            published: true,
          },
          {
            companyId,
            title: "API webhook troubleshooting",
            slug: "webhook-troubleshooting",
            content:
              "Check endpoint URL, verify SSL certificate, review retry logs, and ensure 200 response within 30 seconds.",
            published: true,
          },
          {
            companyId,
            title: "Exporting data to CSV",
            slug: "csv-export-guide",
            content:
              "Navigate to Contacts → Export → Select fields → Choose CSV format → Download.",
            published: true,
          },
        ],
      });

      await prisma.task.createMany({
        data: [
          {
            companyId,
            title: "Process refund for Daniel Brooks — duplicate charge",
            priority: "URGENT",
            status: "IN_PROGRESS",
            dueDate: daysFromNow(1),
            createdById: userId,
          },
          {
            companyId,
            title: "Escalate API 503 issue to engineering",
            priority: "URGENT",
            status: "TODO",
            dueDate: daysFromNow(0),
            createdById: userId,
          },
          {
            companyId,
            title: "Follow up with Sarah Kim — session fix deployed",
            priority: "HIGH",
            status: "TODO",
            dueDate: daysFromNow(2),
            createdById: userId,
          },
          {
            companyId,
            title: "Update KB article for iOS 18 known issue",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: daysFromNow(3),
            createdById: userId,
          },
        ],
      });

      await prisma.calendarEvent.create({
        data: {
          companyId,
          title: "Support team standup",
          location: "Slack Huddle",
          startAt: daysFromNow(1),
          endAt: new Date(daysFromNow(1).getTime() + 1800000),
          createdById: userId,
        },
      });
    },
  },
];

async function grantSuperAdminsOwnerAccess(prisma: PrismaClient, companyIds: string[]) {
  const superAdmins = await prisma.user.findMany({ where: { isSuperAdmin: true } });
  if (superAdmins.length === 0) return;

  for (const companyId of companyIds) {
    const ownerRole = await prisma.role.findFirst({
      where: { companyId, slug: "owner" },
    });
    if (!ownerRole) continue;

    for (const admin of superAdmins) {
      await prisma.companyMember.upsert({
        where: { companyId_userId: { companyId, userId: admin.id } },
        create: { companyId, userId: admin.id, roleId: ownerRole.id },
        update: { roleId: ownerRole.id },
      });
    }
  }
}

export async function seedTemplateCrms(
  prisma: PrismaClient,
  passwordHash: string,
  permMap: Map<string, string>,
  allPermKeys: string[]
): Promise<TemplateSeedResult[]> {
  const results: TemplateSeedResult[] = [];
  const companyIds: string[] = [];

  for (const template of TEMPLATE_CONFIGS) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: template.planSlug } });
    if (!plan) continue;

    const owner = await prisma.user.upsert({
      where: { email: template.ownerEmail },
      create: {
        email: template.ownerEmail,
        name: template.ownerName,
        passwordHash,
      },
      update: { passwordHash, name: template.ownerName },
    });

    const company = await prisma.company.upsert({
      where: { slug: template.slug },
      create: {
        name: template.name,
        slug: template.slug,
        displayName: template.displayName,
        primaryColor: template.primaryColor,
      },
      update: {
        name: template.name,
        displayName: template.displayName,
        primaryColor: template.primaryColor,
      },
    });

    await prisma.companySubscription.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, planId: plan.id, status: "ACTIVE", provider: "MANUAL" },
      update: { status: "ACTIVE", planId: plan.id },
    });

    for (const mod of await prisma.moduleDefinition.findMany()) {
      const enabled = template.moduleIds.includes(mod.id);
      await prisma.companyModule.upsert({
        where: { companyId_moduleId: { companyId: company.id, moduleId: mod.id } },
        create: { companyId: company.id, moduleId: mod.id, enabled },
        update: { enabled },
      });
    }

    const systemRoles = [
      { slug: "owner", name: "Owner" },
      { slug: "admin", name: "Admin" },
      { slug: "manager", name: "Manager" },
      { slug: "sales", name: "Sales" },
      { slug: "support", name: "Support" },
      { slug: "marketing", name: "Marketing" },
    ];

    for (const roleDef of systemRoles) {
      const role = await prisma.role.upsert({
        where: { companyId_slug: { companyId: company.id, slug: roleDef.slug } },
        create: { ...roleDef, companyId: company.id, isSystem: true },
        update: { name: roleDef.name },
      });

      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const key of allPermKeys) {
        const permId = permMap.get(key);
        if (permId) {
          await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permId } });
        }
      }
    }

    const ownerRole = await prisma.role.findUnique({
      where: { companyId_slug: { companyId: company.id, slug: "owner" } },
    });

    if (ownerRole) {
      await prisma.companyMember.upsert({
        where: { companyId_userId: { companyId: company.id, userId: owner.id } },
        create: { companyId: company.id, userId: owner.id, roleId: ownerRole.id },
        update: { roleId: ownerRole.id },
      });
    }

    const pipeline = await prisma.pipeline.upsert({
      where: { id: `seed-pipeline-${template.slug}` },
      create: {
        id: `seed-pipeline-${template.slug}`,
        companyId: company.id,
        name: template.pipelineName,
        isDefault: true,
      },
      update: { name: template.pipelineName },
    });

    const stageIds: string[] = [];
    for (let i = 0; i < template.stages.length; i++) {
      const stageId = `seed-stage-${i}-${template.slug}`;
      stageIds.push(stageId);
      await prisma.pipelineStage.upsert({
        where: { id: stageId },
        create: {
          id: stageId,
          pipelineId: pipeline.id,
          name: template.stages[i],
          order: i,
          probability: Math.min(100, Math.round(((i + 1) / template.stages.length) * 100)),
        },
        update: { name: template.stages[i], order: i },
      });
    }

    await prisma.dashboard.createMany({
      data: [
        { companyId: company.id, name: "Executive Dashboard", type: "executive", isDefault: true },
        { companyId: company.id, name: "Sales Dashboard", type: "sales", isDefault: true },
        { companyId: company.id, name: "Support Dashboard", type: "support", isDefault: true },
      ],
      skipDuplicates: true,
    });

    // Clear prior sample records so re-seed refreshes demo data
    await prisma.deal.deleteMany({ where: { companyId: company.id } });
    await prisma.lead.deleteMany({ where: { companyId: company.id } });
    await prisma.contact.deleteMany({ where: { companyId: company.id } });
    await prisma.task.deleteMany({ where: { companyId: company.id } });
    await prisma.ticket.deleteMany({ where: { companyId: company.id } });
    await prisma.calendarEvent.deleteMany({ where: { companyId: company.id } });
    await prisma.kBArticle.deleteMany({ where: { companyId: company.id } });
    await prisma.quote.deleteMany({ where: { companyId: company.id } });
    await prisma.invoice.deleteMany({ where: { companyId: company.id } });
    await prisma.campaign.deleteMany({ where: { companyId: company.id } });

    await template.seedData({
      prisma,
      companyId: company.id,
      userId: owner.id,
      pipelineId: pipeline.id,
      stageIds,
    });

    companyIds.push(company.id);

    results.push({
      slug: template.slug,
      name: template.displayName,
      industry: template.industry,
      email: template.ownerEmail,
      password: TEMPLATE_PASSWORD,
      description: template.description,
    });
  }

  await grantSuperAdminsOwnerAccess(prisma, companyIds);

  return results;
}
