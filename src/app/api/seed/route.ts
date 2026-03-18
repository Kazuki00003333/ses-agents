import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  // 既存データ確認
  const existing = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  if (existing) {
    return NextResponse.json({ message: "Already seeded" });
  }

  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "管理者 太郎",
      email: "admin@example.com",
      password,
      role: "admin",
      teamName: "管理チーム",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "マネージャー 花子",
      email: "manager@example.com",
      password,
      role: "manager",
      teamName: "営業チームA",
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      name: "営業 一郎",
      email: "sales1@example.com",
      password,
      role: "sales",
      teamName: "営業チームA",
    },
  });

  const sales2 = await prisma.user.create({
    data: {
      name: "営業 二郎",
      email: "sales2@example.com",
      password,
      role: "sales",
      teamName: "営業チームA",
    },
  });

  // ダミー案件
  const project1 = await prisma.project.create({
    data: {
      salesUserId: sales1.id,
      projectName: "金融系システム開発案件（Java）",
      projectSummary: "大手銀行の勘定系システムのリニューアルプロジェクト。既存システムのJava移行とマイクロサービス化を担当。",
      mustSkills: "Java, Spring Boot, SQL",
      niceToHaveSkills: "Kubernetes, Docker, AWS",
      commercialFlow: 2,
      participationPeriod: "2026年4月〜長期",
      unitPrice: "70〜80万円",
      paymentSite: "月末締め翌月末払い",
      workingHours: "140〜180h",
      workLocation: "東京都千代田区",
      remoteType: "週3リモート可",
      interviewCount: "2回",
      settlementRange: "140〜180h",
      foreignerAllowed: "不可",
      ageLimit: "45歳以下",
      status: "active",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      salesUserId: sales1.id,
      projectName: "ECサイトフロントエンド開発",
      projectSummary: "大手小売業のECサイトリニューアル。ReactによるSPA構築とバックエンドAPI連携。",
      mustSkills: "React, TypeScript, CSS",
      niceToHaveSkills: "Next.js, GraphQL, Storybook",
      commercialFlow: 3,
      participationPeriod: "2026年5月〜6ヶ月以上",
      unitPrice: "60〜70万円",
      paymentSite: "月末締め翌々月払い",
      workingHours: "140〜180h",
      workLocation: "東京都渋谷区",
      remoteType: "フルリモート可",
      interviewCount: "1回",
      settlementRange: "140〜180h",
      foreignerAllowed: "可",
      ageLimit: "なし",
      status: "draft",
    },
  });

  // ダミー候補者
  const candidate1 = await prisma.candidate.create({
    data: {
      salesUserId: sales1.id,
      candidateCode: "A001",
      candidateName: "田中 テスト",
      age: 35,
      nearestStation: "新宿駅",
      availableDate: "2026年4月1日",
      experienceYears: "10年",
      mainSkills: "Java, Spring Boot, Oracle, SQL Server",
      industryExperience: "金融、保険、製造",
      phaseExperience: "要件定義、基本設計、詳細設計、製造、テスト",
      strengths: "大規模システムの開発経験が豊富。チームリードの経験あり。",
      desiredConditions: "単価70万以上、週2以上リモート希望",
      ngConditions: "常駐のみは不可",
      summary: "Javaを中心に10年以上の経験を持つベテランエンジニア。金融系システムの開発経験が豊富。",
    },
  });

  const candidate2 = await prisma.candidate.create({
    data: {
      salesUserId: sales2.id,
      candidateCode: "B001",
      candidateName: "鈴木 サンプル",
      age: 28,
      nearestStation: "渋谷駅",
      availableDate: "2026年5月1日",
      experienceYears: "5年",
      mainSkills: "React, TypeScript, JavaScript, Vue.js",
      industryExperience: "EC、メディア、SaaS",
      phaseExperience: "基本設計、詳細設計、製造、テスト",
      strengths: "モダンなフロントエンド技術に精通。UI/UXへの高い意識。",
      desiredConditions: "単価60万以上、フルリモート希望",
      ngConditions: "週5常駐は不可",
      summary: "ReactとTypeScriptを中心にフロントエンド開発5年。スタートアップでのリード経験あり。",
    },
  });

  // ダミー評価
  const evaluation = await prisma.evaluation.create({
    data: {
      projectId: project1.id,
      candidateId: candidate1.id,
      salesUserId: sales1.id,
      mustMatchScore: 36,
      niceToHaveScore: 10,
      jobFitScore: 13,
      conditionScore: 8,
      startTimingScore: 10,
      summaryScore: 8,
      totalScore: 85,
      fitnessRate: 85,
      aiComment: "Javaとスプリングブートの必須スキルが充足しており、金融系経験も豊富です。提案有力候補として推奨します。単価面での調整が必要な可能性があります。",
      concernPoints: ["外国籍不可の制限あり（該当なし）", "45歳以下の年齢制限（問題なし）"],
      proposalPoints: ["金融系10年以上のドメイン知識をアピール", "チームリード経験を強調", "Spring Bootの実務経験を具体的に示す"],
      evaluationVersion: "1.0",
    },
  });

  await prisma.evaluationResult.create({
    data: {
      evaluationId: evaluation.id,
      salesUserId: sales1.id,
      proposedFlag: true,
      documentPassedFlag: true,
      interviewPassedFlag: false,
      closedFlag: false,
      salesComment: "書類通過。面談日程調整中。",
    },
  });

  return NextResponse.json({
    message: "Seeded successfully",
    users: [admin.email, manager.email, sales1.email, sales2.email],
    note: "パスワード: password123",
  });
}
