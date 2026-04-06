"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewMeetingPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!rawText.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      // 1. AI解析
      const structRes = await fetch("/api/meetings/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const structData = await structRes.json();
      if (!structRes.ok) throw new Error(structData.error ?? "AI解析に失敗しました");

      const s = structData.structured;

      // 2. 保存（品質評価も自動実行）
      const saveRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: s.companyName ?? null,
          contactName: s.contactName ?? null,
          meetingPurpose: s.meetingPurpose ?? null,
          meetingGains: s.meetingGains ?? null,
          infoMemo: s.infoMemo ?? null,
          projectPossibility: s.projectPossibility ?? null,
          requiredSkillSense: s.requiredSkillSense ?? null,
          budgetSense: s.budgetSense ?? null,
          timingSense: s.timingSense ?? null,
          meetingType: s.meetingType ?? null,
          nextAction: s.nextAction ?? null,
          meetingDate: s.meetingDate ?? null,
          minutesRawText: rawText,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error("保存に失敗しました");

      // 3. 詳細画面へ
      router.push(`/meetings/${saved.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setAnalyzing(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/meetings" className="text-base text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">商談登録</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-base font-medium text-gray-800 mb-1">商談議事録を貼り付けてください</p>
        <p className="text-sm text-gray-400 mb-4">
          メモ・チャット・メールなどのテキストをそのまま貼り付けてください。
          AIが会社名・担当者・商談目的・得た情報などを自動抽出し、品質評価も同時に実施します。
        </p>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`例：
2026/4/6　株式会社〇〇　田中部長と商談
目的：Java案件の要員ニーズヒアリング

・現在5名体制で開発中。来月からもう2名追加したい
・Javaが必須、Spring Boot経験者優遇
・単価は60〜70万希望、リモート週2〜3可
・4月末までに決定したい

次回：来週中にスキルシートを送付する`}
          className="w-full h-72 text-base border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={analyzing}
        />

        {error && (
          <p className="mt-3 text-base text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !rawText.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white text-base px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {analyzing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                AI解析・品質評価中...
              </>
            ) : (
              "AIで解析して登録 →"
            )}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-3 text-right">
        解析後、詳細画面に自動遷移します。内容の修正・フォローアップアドバイスは詳細画面から行えます。
      </p>
    </div>
  );
}
