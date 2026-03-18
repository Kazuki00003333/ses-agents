import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createProjectSchema = z.object({
  projectName: z.string().min(1),
  clientCompanyName: z.string().optional().nullable(),
  projectSummary: z.string().optional().nullable(),
  mustSkills: z.string().optional().nullable(),
  niceToHaveSkills: z.string().optional().nullable(),
  commercialFlow: z.number().optional().nullable(),
  participationPeriod: z.string().optional().nullable(),
  unitPrice: z.string().optional().nullable(),
  paymentSite: z.string().optional().nullable(),
  workingHours: z.string().optional().nullable(),
  workLocation: z.string().optional().nullable(),
  remoteType: z.string().optional().nullable(),
  interviewCount: z.string().optional().nullable(),
  settlementRange: z.string().optional().nullable(),
  foreignerAllowed: z.string().optional().nullable(),
  ageLimit: z.string().optional().nullable(),
  otherInfo: z.string().optional().nullable(),
  structuredInputJson: z.any().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const salesUserId = searchParams.get("salesUserId");

  const where =
    session.user.role === "sales"
      ? { salesUserId: session.user.id }
      : salesUserId
      ? { salesUserId }
      : {};

  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      projectName: true,
      clientCompanyName: true,
      status: true,
      commercialFlow: true,
      mustSkills: true,
      unitPrice: true,
      workLocation: true,
      remoteType: true,
      createdAt: true,
      salesUser: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      salesUserId: session.user.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
