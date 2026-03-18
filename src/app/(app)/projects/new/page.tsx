"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProjectPage() {
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
      const structRes = await fetch("/api/projects/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const structData = await structRes.json();
      if (!structRes.ok) throw new Error(structData.error ?? "AI解析に失敗しました");

      const s = structData.structured;

      // 2. 自動保存
      const saveRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: s.projectName || "（案件名未設定）",
          projectSummary: s.projectSummary ?? null,
          mustSkills: s.mustSkills ?? null,
          niceToHaveSkills: s.niceToHaveSkills ?? null,
          commercialFlow: s.commercialFlow ? parseInt(s.commercialFlow) : null,
          participationPeriod: s.participationPeriod ?? null,
          unitPrice: s.unitPrice ?? null,
          paymentSite: s.paymentSite ?? null,
          workingHours: s.workingHours ?? null,
          workLocation: s.workLocation ?? null,
          remoteType: s.remoteType ?? null,
          interviewCount: s.interviewCount ?? null,
          settlementRange: s.settlementRange ?? null,
          foreignerAllowed: s.foreignerAllowed ?? null,
          ageLimit: s.ageLimit ?? null,
          otherInfo: s.otherInfo ?? null,
          structuredInputJson: s,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error("保存に失敗しました");

      // 3. 詳細画面へ（編集可能）
      router.push(`/projects/${saved.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setAnalyzing(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/projects" className="text-base text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">案件登録</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-base font-medium text-gray-800 mb-1">案件情報を貼り付けてください</p>
        <p className="text-sm text-gray-400 mb-4">
          メール・求人票・チャットのテキストなど、どんな形式でも構いません。
          AIが自動的に各項目を抽出してDBに保存します。
        </p>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`例：
【案件名】金融系システム開発（Java）
【必須スキル】Java、Spring Boot、SQL
【単価】70〜80万円
【場所】東京都千代田区（週3リモート可）
【期間】2026年4月〜長期
【商流】2次受け
【面談回数】2回
【支払サイト】月末締め翌月末払い
...`}
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
                AI解析・自動保存中...
              </>
            ) : (
              "AIで解析して保存 →"
            )}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-3 text-right">
        AIが解析後、詳細画面に自動遷移します。内容の修正は詳細画面から行えます。
      </p>
    </div>
  );
}
