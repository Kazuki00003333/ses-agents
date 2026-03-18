import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCandidateSchema = z.object({
  candidateCode: z.string().optional().nullable(),
  candidateName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  commercialFlowType: z.string().optional().nullable(),
  commercialFlowDepth: z.number().optional().nullable(),
  age: z.number().optional().nullable(),
  nearestStation: z.string().optional().nullable(),
  availableDate: z.string().optional().nullable(),
  experienceYears: z.string().optional().nullable(),
  mainSkills: z.string().optional().nullable(),
  industryExperience: z.string().optional().nullable(),
  phaseExperience: z.string().optional().nullable(),
  strengths: z.string().optional().nullable(),
  desiredConditions: z.string().optional().nullable(),
  ngConditions: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  skillSheetText: z.string().optional().nullable(),
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

  const candidates = await prisma.candidate.findMany({
    where,
    select: {
      id: true,
      candidateCode: true,
      candidateName: true,
      companyName: true,
      mainSkills: true,
      experienceYears: true,
      availableDate: true,
      nearestStation: true,
      updatedAt: true,
      salesUser: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      ...parsed.data,
      salesUserId: session.user.id,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
