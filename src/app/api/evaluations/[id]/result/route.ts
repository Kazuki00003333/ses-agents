import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateResultSchema = z.object({
  proposedFlag: z.boolean().optional(),
  documentPassedFlag: z.boolean().optional(),
  interviewPassedFlag: z.boolean().optional(),
  closedFlag: z.boolean().optional(),
  rejectionReason: z.string().optional(),
  salesComment: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && evaluation.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await prisma.evaluationResult.upsert({
    where: { evaluationId: id },
    create: {
      evaluationId: id,
      salesUserId: session.user.id,
      ...parsed.data,
    },
    update: parsed.data,
  });

  return NextResponse.json(result);
}
