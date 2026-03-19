import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const evaluations = await prisma.evaluation.findMany({
    where: {
      result: {
        proposedFlag: true,
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fitnessRate: true,
      createdAt: true,
      project: { select: { id: true, projectName: true } },
      candidate: { select: { id: true, candidateName: true, candidateCode: true } },
      salesUser: { select: { name: true } },
      result: {
        select: {
          proposedFlag: true,
          documentPassedFlag: true,
          interviewPassedFlag: true,
          closedFlag: true,
          salesComment: true,
          adminScoreRating: true,
          adminComment: true,
          adminReviewedAt: true,
        },
      },
    },
  });

  return NextResponse.json(evaluations);
}
