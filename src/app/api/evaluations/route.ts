import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLMJson } from "@/lib/llm";
import { MATCHING_EVALUATION_SYSTEM } from "@/prompts/projectAnalysis";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const isManager = session.user.role !== "sales";

  const evaluations = await prisma.evaluation.findMany({
    where: isManager ? {} : { salesUserId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fitnessRate: true,
      createdAt: true,
      project: { select: { id: true, projectName: true } },
      candidate: { select: { id: true, candidateName: true, candidateCode: true } },
      salesUser: { select: { id: true, name: true } },
      result: { select: { proposedFlag: true, documentPassedFlag: true, interviewPassedFlag: true, closedFlag: true } },
    },
  });

  return NextResponse.json(evaluations);
}

const createEvaluationSchema = z.object({
  projectId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createEvaluationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, candidateId } = parsed.data;

  const [project, candidate] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.candidate.findUnique({ where: { id: candidateId } }),
  ]);

  if (!project || !candidate) {
    return NextResponse.json({ error: "Project or Candidate not found" }, { status: 404 });
  }

  // LLMでマッチング評価
  const projectText = [
    `案件名: ${project.projectName}`,
    project.projectSummary && `概要: ${project.projectSummary}`,
    project.mustSkills && `必須スキル: ${project.mustSkills}`,
    project.niceToHaveSkills && `尚可スキル: ${project.niceToHaveSkills}`,
    project.commercialFlow && `商流: ${project.commercialFlow}次受け`,
    project.unitPrice && `単価: ${project.unitPrice}`,
    project.workingHours && `業務時間: ${project.workingHours}`,
    project.remoteType && `リモート: ${project.remoteType}`,
    project.settlementRange && `精算幅: ${project.settlementRange}`,
    project.participationPeriod && `参画期間: ${project.participationPeriod}`,
  ]
    .filter(Boolean)
    .join("\n");

  const candidateText = [
    candidate.candidateName && `候補者名: ${candidate.candidateName}`,
    candidate.experienceYears && `経験年数: ${candidate.experienceYears}`,
    candidate.mainSkills && `主要スキル: ${candidate.mainSkills}`,
    candidate.industryExperience && `業界経験: ${candidate.industryExperience}`,
    candidate.phaseExperience && `工程経験: ${candidate.phaseExperience}`,
    candidate.strengths && `強み: ${candidate.strengths}`,
    candidate.availableDate && `稼働開始可能日: ${candidate.availableDate}`,
    candidate.desiredConditions && `希望条件: ${candidate.desiredConditions}`,
    candidate.ngConditions && `NG条件: ${candidate.ngConditions}`,
    candidate.summary && `サマリー: ${candidate.summary}`,
  ]
    .filter(Boolean)
    .join("\n");

  let evaluationData: {
    fitnessRate?: number;
    mustMatchScore?: number;
    niceToHaveScore?: number;
    jobFitScore?: number;
    conditionScore?: number;
    startTimingScore?: number;
    summaryScore?: number;
    totalScore?: number;
    aiComment?: string;
    concernPoints?: string[];
    proposalPoints?: string[];
    scoreBreakdownJson?: Record<string, string>;
  } = {};

  try {
    const result = await callLLMJson<{
      fitnessRate: number;
      mustMatchScore: number;
      niceToHaveScore: number;
      jobFitScore: number;
      conditionScore: number;
      startTimingScore: number;
      summaryScore: number;
      totalScore: number;
      aiComment: string;
      concernPoints: string[];
      proposalPoints: string[];
      scoreBreakdown: Record<string, string>;
    }>(
      MATCHING_EVALUATION_SYSTEM,
      `【案件情報】\n${projectText}\n\n【候補者情報】\n${candidateText}`,
      "matching_evaluation",
      `${projectId}_${candidateId}`
    );

    evaluationData = {
      fitnessRate: result.fitnessRate,
      mustMatchScore: result.mustMatchScore,
      niceToHaveScore: result.niceToHaveScore,
      jobFitScore: result.jobFitScore,
      conditionScore: result.conditionScore,
      startTimingScore: result.startTimingScore,
      summaryScore: result.summaryScore,
      totalScore: result.totalScore,
      aiComment: result.aiComment,
      concernPoints: result.concernPoints,
      proposalPoints: result.proposalPoints,
      scoreBreakdownJson: result.scoreBreakdown,
    };
  } catch (err) {
    console.error("LLM evaluation error:", err);
    // LLM失敗時も評価レコードは作成する
  }

  const evaluation = await prisma.evaluation.create({
    data: {
      projectId,
      candidateId,
      salesUserId: session.user.id,
      evaluationVersion: "1.0",
      ...evaluationData,
    },
    include: {
      project: { select: { id: true, projectName: true } },
      candidate: { select: { id: true, candidateName: true, candidateCode: true } },
    },
  });

  return NextResponse.json(evaluation, { status: 201 });
}
