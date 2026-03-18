import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLMJson } from "@/lib/llm";
import {
  PROJECT_STRUCTURING_SYSTEM,
  PROJECT_ANALYSIS_SYSTEM,
} from "@/prompts/projectAnalysis";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && project.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body.mode ?? "analyze"; // "structure" or "analyze"

  const projectText = [
    project.projectName && `案件名: ${project.projectName}`,
    project.projectSummary && `概要: ${project.projectSummary}`,
    project.mustSkills && `必須スキル: ${project.mustSkills}`,
    project.niceToHaveSkills && `尚可スキル: ${project.niceToHaveSkills}`,
    project.commercialFlow && `商流: ${project.commercialFlow}次受け`,
    project.participationPeriod && `参画期間: ${project.participationPeriod}`,
    project.unitPrice && `単価: ${project.unitPrice}`,
    project.paymentSite && `支払サイト: ${project.paymentSite}`,
    project.workingHours && `業務時間: ${project.workingHours}`,
    project.workLocation && `勤務地: ${project.workLocation}`,
    project.remoteType && `リモート: ${project.remoteType}`,
    project.interviewCount && `面談回数: ${project.interviewCount}`,
    project.settlementRange && `精算幅: ${project.settlementRange}`,
    project.foreignerAllowed && `外国籍: ${project.foreignerAllowed}`,
    project.ageLimit && `年齢制限: ${project.ageLimit}`,
    project.otherInfo && `その他: ${project.otherInfo}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (mode === "structure") {
      const rawText = body.rawText ?? projectText;
      const structured = await callLLMJson<Record<string, unknown>>(
        PROJECT_STRUCTURING_SYSTEM,
        `以下の案件テキストを構造化してください:\n\n${rawText}`,
        "project_structuring",
        id
      );
      const updated = await prisma.project.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { structuredInputJson: structured as any },
      });
      return NextResponse.json({ project: updated, structured });
    }

    // analyze mode
    const result = await callLLMJson<{
      summary: string;
      missingInfo: string[];
      checklist: string[];
      insights: string[];
      riskFlags: { level: string; message: string }[];
    }>(PROJECT_ANALYSIS_SYSTEM, `以下の案件情報を精査してください:\n\n${projectText}`, "project_analysis", id);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        aiSummary: result.summary,
        aiMissingInfo: result.missingInfo,
        aiChecklist: result.checklist,
        aiInsights: result.insights,
        riskFlags: result.riskFlags,
        status: "analyzed",
      },
    });

    return NextResponse.json({ project: updated, analysis: result });
  } catch (err) {
    console.error("LLM error:", err);
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}
