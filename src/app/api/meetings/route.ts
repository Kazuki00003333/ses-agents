import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLMJson } from "@/lib/llm";
import { MEETING_QUALITY_EVALUATION_SYSTEM } from "@/prompts/meetingAnalysis";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const isManager = session.user.role !== "sales";

    const meetings = await prisma.meeting.findMany({
      where: isManager ? {} : { salesUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        meetingType: true,
        meetingPurpose: true,
        meetingDate: true,
        aiQualityScore: true,
        aiQualityLabel: true,
        status: true,
        createdAt: true,
        salesUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(meetings);
  } catch (err) {
    console.error("Meetings GET error:", err);
    return NextResponse.json({ error: "データの取得に失敗しました" }, { status: 500 });
  }
}

const createMeetingSchema = z.object({
  companyName: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  meetingPurpose: z.string().nullable().optional(),
  meetingGains: z.string().nullable().optional(),
  infoMemo: z.string().nullable().optional(),
  projectPossibility: z.string().nullable().optional(),
  requiredSkillSense: z.string().nullable().optional(),
  budgetSense: z.string().nullable().optional(),
  timingSense: z.string().nullable().optional(),
  meetingType: z.enum(["first_contact", "needs_hearing", "project_proposal", "follow_up", "closing", "other"]).nullable().optional(),
  nextAction: z.string().nullable().optional(),
  meetingDate: z.string().nullable().optional(),
  minutesRawText: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { meetingDate, ...rest } = parsed.data;

  // 商談記録のテキストを組み立てて自動評価
  const meetingText = [
    rest.companyName && `会社名: ${rest.companyName}`,
    rest.contactName && `担当者: ${rest.contactName}`,
    rest.meetingPurpose && `商談目的: ${rest.meetingPurpose}`,
    rest.meetingGains && `商談で得たもの: ${rest.meetingGains}`,
    rest.infoMemo && `情報MEMO: ${rest.infoMemo}`,
    rest.projectPossibility && `案件の可能性: ${rest.projectPossibility}`,
    rest.requiredSkillSense && `必要スキル感: ${rest.requiredSkillSense}`,
    rest.budgetSense && `予算感: ${rest.budgetSense}`,
    rest.timingSense && `時期感: ${rest.timingSense}`,
    rest.nextAction && `次回アクション: ${rest.nextAction}`,
  ]
    .filter(Boolean)
    .join("\n");

  let qualityData: {
    aiQualityScore?: number;
    aiQualityLabel?: string;
    aiQualityComment?: string;
    aiStrengths?: string[];
    aiImprovements?: string[];
  } = {};

  try {
    const result = await callLLMJson<{
      qualityScore: number;
      qualityLabel: string;
      qualityComment: string;
      strengths: string[];
      improvements: string[];
    }>(
      MEETING_QUALITY_EVALUATION_SYSTEM,
      `以下の商談記録を評価してください:\n\n${meetingText}`,
      "meeting_quality_evaluation"
    );
    qualityData = {
      aiQualityScore: result.qualityScore,
      aiQualityLabel: result.qualityLabel,
      aiQualityComment: result.qualityComment,
      aiStrengths: result.strengths,
      aiImprovements: result.improvements,
    };
  } catch (err) {
    console.error("Meeting quality evaluation error:", err);
  }

  const meeting = await prisma.meeting.create({
    data: {
      salesUserId: session.user.id,
      ...rest,
      meetingDate: meetingDate ? new Date(meetingDate) : null,
      ...qualityData,
    },
  });

  return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    console.error("Meetings POST error:", err);
    return NextResponse.json({ error: "商談の登録に失敗しました" }, { status: 500 });
  }
}
