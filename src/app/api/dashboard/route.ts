import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const isManager = session.user.role !== "sales";
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 並列で必要なクエリのみ実行（selectを絞る）
  const [
    projectCount,
    candidateCount,
    evaluationCount,
    meetingCount,
    monthlyMeetingCount,
    meetingQualityAvg,
    recentProjects,
    recentMeetings,
    recentEvaluations,
    allResults,
    monthlyResults,
    incompleteProjects,
    incompleteCandidates,
  ] = await Promise.all([
    prisma.project.count({ where: { salesUserId: userId } }),
    prisma.candidate.count({ where: { salesUserId: userId } }),
    prisma.evaluation.count({ where: { salesUserId: userId } }),
    prisma.meeting.count({ where: { salesUserId: userId } }),
    prisma.meeting.count({ where: { salesUserId: userId, createdAt: { gte: monthStart } } }),
    prisma.meeting.aggregate({
      where: { salesUserId: userId, createdAt: { gte: monthStart }, aiQualityScore: { not: null } },
      _avg: { aiQualityScore: true },
    }),
    prisma.project.findMany({
      where: { salesUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, projectName: true, status: true, createdAt: true },
    }),
    prisma.meeting.findMany({
      where: { salesUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        meetingType: true,
        aiQualityScore: true,
        aiQualityLabel: true,
        meetingDate: true,
        createdAt: true,
      },
    }),
    prisma.evaluation.findMany({
      where: { salesUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fitnessRate: true,
        project: { select: { projectName: true } },
        candidate: { select: { candidateName: true, candidateCode: true } },
        result: { select: { proposedFlag: true, closedFlag: true } },
      },
    }),
    prisma.evaluationResult.findMany({
      where: { salesUserId: userId },
      select: { proposedFlag: true, documentPassedFlag: true, interviewPassedFlag: true, closedFlag: true },
    }),
    prisma.evaluationResult.findMany({
      where: { salesUserId: userId, createdAt: { gte: monthStart } },
      select: { proposedFlag: true, documentPassedFlag: true, interviewPassedFlag: true, closedFlag: true },
    }),
    // 未入力案件（必要フィールドのみ）
    prisma.project.findMany({
      where: {
        salesUserId: userId,
        OR: [
          { mustSkills: null },
          { unitPrice: null },
          { participationPeriod: null },
          { workLocation: null },
        ],
      },
      select: { id: true, mustSkills: true, unitPrice: true, participationPeriod: true, workLocation: true, paymentSite: true, workingHours: true },
    }),
    // 未入力候補者（必要フィールドのみ）
    prisma.candidate.findMany({
      where: {
        salesUserId: userId,
        OR: [
          { mainSkills: null },
          { availableDate: null },
          { experienceYears: null },
        ],
      },
      select: { id: true, mainSkills: true, availableDate: true, experienceYears: true },
    }),
  ]);

  type ResultRow = { proposedFlag: boolean; documentPassedFlag: boolean; interviewPassedFlag: boolean; closedFlag: boolean };

  const totalProposed = allResults.filter((r: ResultRow) => r.proposedFlag).length;
  const totalDocPassed = allResults.filter((r: ResultRow) => r.documentPassedFlag).length;
  const totalIntPassed = allResults.filter((r: ResultRow) => r.interviewPassedFlag).length;
  const totalClosed = allResults.filter((r: ResultRow) => r.closedFlag).length;
  const totalRejected = allResults.filter(
    (r: ResultRow) => r.proposedFlag && !r.closedFlag && !r.documentPassedFlag && !r.interviewPassedFlag
  ).length;

  const monthProposed = monthlyResults.filter((r: ResultRow) => r.proposedFlag).length;
  const monthDocPassed = monthlyResults.filter((r: ResultRow) => r.documentPassedFlag).length;
  const monthIntPassed = monthlyResults.filter((r: ResultRow) => r.interviewPassedFlag).length;
  const monthClosed = monthlyResults.filter((r: ResultRow) => r.closedFlag).length;

  type ProjectRow = { id: string; mustSkills: string | null; unitPrice: string | null; participationPeriod: string | null; workLocation: string | null; paymentSite: string | null; workingHours: string | null };
  type CandidateRow = { id: string; mainSkills: string | null; availableDate: string | null; experienceYears: string | null };

  const projectIncompleteFields = incompleteProjects.map((p: ProjectRow) => {
    const missing: string[] = [];
    if (!p.mustSkills) missing.push("必須スキル");
    if (!p.unitPrice) missing.push("単価");
    if (!p.participationPeriod) missing.push("参画期間");
    if (!p.workLocation) missing.push("勤務地");
    if (!p.paymentSite) missing.push("支払サイト");
    if (!p.workingHours) missing.push("業務時間");
    return { id: p.id, missing };
  });

  const candidateIncompleteFields = incompleteCandidates.map((c: CandidateRow) => {
    const missing: string[] = [];
    if (!c.mainSkills) missing.push("主要スキル");
    if (!c.availableDate) missing.push("稼働開始日");
    if (!c.experienceYears) missing.push("経験年数");
    return { id: c.id, missing };
  });

  const stats = {
    projectCount,
    candidateCount,
    evaluationCount,
    meetingCount,
    monthlyMeetingCount,
    monthlyMeetingQualityAvg: meetingQualityAvg._avg.aiQualityScore
      ? Math.round(meetingQualityAvg._avg.aiQualityScore)
      : null,
    documentPassRate: totalProposed > 0 ? Math.round((totalDocPassed / totalProposed) * 100) : 0,
    interviewPassRate: totalDocPassed > 0 ? Math.round((totalIntPassed / totalDocPassed) * 100) : 0,
    closeRate: totalIntPassed > 0 ? Math.round((totalClosed / totalIntPassed) * 100) : 0,
    incompleteProjectCount: incompleteProjects.length,
    incompleteCandidateCount: incompleteCandidates.length,
    projectIncompleteFields,
    candidateIncompleteFields,
    recentProjects,
    recentMeetings,
    recentEvaluations,
    totalStats: { proposed: totalProposed, documentPassed: totalDocPassed, interviewPassed: totalIntPassed, closed: totalClosed, rejected: totalRejected },
    monthlyStats: { proposed: monthProposed, documentPassed: monthDocPassed, interviewPassed: monthIntPassed, closed: monthClosed },
  };

  if (isManager) {
    const salesSummary = await prisma.user.findMany({
      where: { role: "sales", status: "active" },
      select: {
        id: true,
        name: true,
        _count: { select: { projects: true, candidates: true, evaluations: true, meetings: true } },
      },
    });
    return NextResponse.json({ ...stats, salesSummary });
  }

  return NextResponse.json(stats);
}
