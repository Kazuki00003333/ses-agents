import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // プロジェクト本体と評価を並列取得
  const [project, evaluations] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        salesUser: { select: { id: true, name: true } },
      },
    }),
    prisma.evaluation.findMany({
      where: { projectId: id },
      select: {
        id: true,
        fitnessRate: true,
        candidate: { select: { id: true, candidateName: true, candidateCode: true } },
        result: { select: { proposedFlag: true, closedFlag: true } },
      },
    }),
  ]);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && project.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ...project, evaluations });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { salesUserId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && project.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // マスアサインメント対策: 更新可能フィールドのみを許可
  const allowedFields = [
    "projectName", "clientCompanyName", "projectSummary",
    "mustSkills", "niceToHaveSkills", "commercialFlow",
    "participationPeriod", "unitPrice", "paymentSite",
    "workingHours", "workLocation", "remoteType",
    "interviewCount", "settlementRange", "foreignerAllowed",
    "ageLimit", "otherInfo", "structuredInputJson",
    "aiSummary", "aiMissingInfo", "aiChecklist", "aiInsights",
    "riskFlags", "status",
  ] as const;
  type AllowedKey = typeof allowedFields[number];
  const data = Object.fromEntries(
    allowedFields.filter((k) => k in body).map((k) => [k, body[k as AllowedKey]])
  );

  const updated = await prisma.project.update({ where: { id }, data });
  return NextResponse.json(updated);
}
