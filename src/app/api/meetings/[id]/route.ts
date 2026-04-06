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
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { salesUser: { select: { id: true, name: true } } },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && meeting.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(meeting);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { id }, select: { salesUserId: true } });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "sales" && meeting.salesUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  // マスアサインメント対策
  const allowedFields = [
    "companyName", "contactName", "meetingPurpose", "meetingGains",
    "infoMemo", "projectPossibility", "requiredSkillSense", "budgetSense",
    "timingSense", "meetingType", "nextAction", "meetingDate",
    "minutesRawText", "status",
    "aiFollowUpAdvice", "aiQualityScore", "aiQualityLabel",
    "aiQualityComment", "aiStrengths", "aiImprovements",
  ] as const;
  type AllowedKey = typeof allowedFields[number];
  const data = Object.fromEntries(
    allowedFields.filter((k) => k in body).map((k) => [k, body[k as AllowedKey]])
  );

  if (data.meetingDate) {
    data.meetingDate = new Date(data.meetingDate as string);
  }

  const updated = await prisma.meeting.update({ where: { id }, data });
  return NextResponse.json(updated);
}
