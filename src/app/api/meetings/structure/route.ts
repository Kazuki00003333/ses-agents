import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLMJson } from "@/lib/llm";
import { MEETING_STRUCTURING_SYSTEM } from "@/prompts/meetingAnalysis";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rawText } = await req.json();
  if (!rawText?.trim()) {
    return NextResponse.json({ error: "テキストを入力してください" }, { status: 400 });
  }
  if (typeof rawText !== "string" || rawText.length > 50000) {
    return NextResponse.json({ error: "テキストが長すぎます（上限50,000文字）" }, { status: 400 });
  }

  try {
    const structured = await callLLMJson<Record<string, unknown>>(
      MEETING_STRUCTURING_SYSTEM,
      `以下の商談議事録を構造化してください:\n\n${rawText}`,
      "meeting_structuring"
    );
    return NextResponse.json({ structured });
  } catch (err) {
    console.error("LLM error:", err);
    return NextResponse.json({ error: "AI解析に失敗しました" }, { status: 500 });
  }
}
