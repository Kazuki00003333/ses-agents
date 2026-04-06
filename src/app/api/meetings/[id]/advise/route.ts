import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLMJson } from "@/lib/llm";
import { MEETING_ADVICE_SYSTEM } from "@/prompts/meetingAnalysis";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && meeting.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const meetingText = [
    meeting.companyName && `会社名: ${meeting.companyName}`,
    meeting.contactName && `担当者: ${meeting.contactName}`,
    meeting.meetingType && `商談タイプ: ${meeting.meetingType}`,
    meeting.meetingPurpose && `商談目的: ${meeting.meetingPurpose}`,
    meeting.meetingGains && `商談で得たもの: ${meeting.meetingGains}`,
    meeting.infoMemo && `情報MEMO: ${meeting.infoMemo}`,
    meeting.projectPossibility && `案件の可能性: ${meeting.projectPossibility}`,
    meeting.requiredSkillSense && `必要スキル感: ${meeting.requiredSkillSense}`,
    meeting.budgetSense && `予算感: ${meeting.budgetSense}`,
    meeting.timingSense && `時期感: ${meeting.timingSense}`,
    meeting.nextAction && `次回アクション: ${meeting.nextAction}`,
  ]
    .filter(Boolean)
    .join("\n");

  const advice = await callLLMJson<{
    priority: string;
    summary: string;
    questions: { topic: string; question: string; reason: string }[];
  }>(
    MEETING_ADVICE_SYSTEM,
    `以下の商談情報を元にフォローアップアドバイスをしてください:\n\n${meetingText}`,
    "meeting_advice",
    id
  );

  await prisma.meeting.update({
    where: { id },
    data: { aiFollowUpAdvice: advice },
  });

  return NextResponse.json({ advice });
}
