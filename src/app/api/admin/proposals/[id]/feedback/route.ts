import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const feedbackSchema = z.object({
  adminScoreRating: z.enum(["appropriate", "too_high", "too_low"]),
  adminComment: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const evaluation = await prisma.evaluation.findUnique({ where: { id }, include: { result: true } });
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!evaluation.result) return NextResponse.json({ error: "No result found" }, { status: 404 });

  const body = await req.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.evaluationResult.update({
    where: { evaluationId: id },
    data: {
      adminScoreRating: parsed.data.adminScoreRating,
      adminComment: parsed.data.adminComment ?? null,
      adminReviewedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
