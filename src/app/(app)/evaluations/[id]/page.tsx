"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Evaluation {
  id: string;
  fitnessRate: number | null;
  mustMatchScore: number | null;
  niceToHaveScore: number | null;
  jobFitScore: number | null;
  conditionScore: number | null;
  startTimingScore: number | null;
  summaryScore: number | null;
  totalScore: number | null;
  aiComment: string | null;
  concernPoints: string[] | null;
  proposalPoints: string[] | null;
  scoreBreakdownJson: Record<string, string> | null;
  project: { id: string; projectName: string; mustSkills: string | null };
  candidate: {
    id: string;
    candidateName: string | null;
    candidateCode: string | null;
    mainSkills: string | null;
    experienceYears: string | null;
  };
  salesUser: { id: string; name: string };
  result: {
    id: string;
    proposedFlag: boolean;
    documentPassedFlag: boolean;
    interviewPassedFlag: boolean;
    closedFlag: boolean;
    rejectionReason: string | null;
    salesComment: string | null;
  } | null;
}

function ScoreBar({ score, max, label }: { score: number | null; max: number; label: string }) {
  const pct = score != null ? (score / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-14 text-right">{score ?? "-"} / {max}</span>
    </div>
  );
}

function fitBadge(rate: number | null) {
  if (rate == null) return { label: "未評価", color: "bg-gray-100 text-gray-500" };
  if (rate >= 85) return { label: "提案有力", color: "bg-green-100 text-green-700" };
  if (rate >= 70) return { label: "提案可能", color: "bg-blue-100 text-blue-700" };
  if (rate >= 50) return { label: "慎重提案", color: "bg-yellow-100 text-yellow-700" };
  return { label: "要再確認", color: "bg-red-100 text-red-600" };
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({
    proposedFlag: false,
    documentPassedFlag: false,
    interviewPassedFlag: false,
    closedFlag: false,
    rejectionReason: "",
    salesComment: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/evaluations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEvaluation(data);
        if (data.result) {
          setResult({
            proposedFlag: data.result.proposedFlag,
            documentPassedFlag: data.result.documentPassedFlag,
            interviewPassedFlag: data.result.interviewPassedFlag,
            closedFlag: data.result.closedFlag,
            rejectionReason: data.result.rejectionReason ?? "",
            salesComment: data.result.salesComment ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveResult() {
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      await fetch(`/api/evaluations/${id}/result`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const res = await fetch(`/api/evaluations/${id}`);
      setEvaluation(await res.json());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-4 max-w-5xl">
      <div className="h-8 w-64 bg-gray-200 rounded" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
  if (!evaluation) return <div className="text-base text-red-500 p-8">評価が見つかりません</div>;

  const badge = fitBadge(evaluation.fitnessRate);
  const candidateName = evaluation.candidate.candidateName ?? evaluation.candidate.candidateCode ?? "匿名";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/evaluations" className="text-base text-gray-400 hover:text-gray-600">← 戻る</Link>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">マッチング評価結果</h2>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* 適正率 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-5">
              <div>
                <p className="text-sm text-gray-400 mb-1">適正率（参考値）</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold text-gray-900">
                    {evaluation.fitnessRate != null ? `${evaluation.fitnessRate}%` : "-"}
                  </span>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <ScoreBar score={evaluation.mustMatchScore} max={40} label="Must一致" />
              <ScoreBar score={evaluation.niceToHaveScore} max={15} label="尚可一致" />
              <ScoreBar score={evaluation.jobFitScore} max={15} label="業務内容適合" />
              <ScoreBar score={evaluation.conditionScore} max={10} label="条件一致" />
              <ScoreBar score={evaluation.startTimingScore} max={10} label="参画時期一致" />
              <ScoreBar score={evaluation.summaryScore} max={10} label="サマリー適合" />
            </div>

            {evaluation.aiComment && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-sm text-gray-400 mb-2">評価コメント</p>
                <p className="text-base text-gray-700 leading-relaxed">{evaluation.aiComment}</p>
              </div>
            )}
          </div>

          {evaluation.concernPoints && evaluation.concernPoints.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">懸念点</h3>
              <ul className="space-y-2">
                {evaluation.concernPoints.map((p, i) => (
                  <li key={i} className="text-base text-gray-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">△</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.proposalPoints && evaluation.proposalPoints.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">提案時の補足ポイント</h3>
              <ul className="space-y-2">
                {evaluation.proposalPoints.map((p, i) => (
                  <li key={i} className="text-base text-gray-700 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 結果更新 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">結果更新</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {(["proposedFlag", "documentPassedFlag", "interviewPassedFlag", "closedFlag"] as const).map((field) => {
                const labels: Record<string, string> = {
                  proposedFlag: "提案実施",
                  documentPassedFlag: "書類通過",
                  interviewPassedFlag: "面談通過",
                  closedFlag: "成約",
                };
                return (
                  <label key={field} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={result[field]}
                      onChange={(e) => setResult((prev) => ({ ...prev, [field]: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="text-base text-gray-700">{labels[field]}</span>
                  </label>
                );
              })}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">見送り・失注理由</label>
                <input
                  value={result.rejectionReason}
                  onChange={(e) => setResult((prev) => ({ ...prev, rejectionReason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">営業コメント</label>
                <textarea
                  value={result.salesComment}
                  onChange={(e) => setResult((prev) => ({ ...prev, salesComment: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            {saveError && (
              <p className="mt-3 text-base text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="mt-3 text-base text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                ✓ 保存しました
              </p>
            )}
            <button
              onClick={handleSaveResult}
              disabled={saving}
              className="mt-4 text-base bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? "保存中..." : "結果を保存"}
            </button>
          </div>
        </div>

        {/* サイドパネル */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-3">案件</h3>
            <Link href={`/projects/${evaluation.project.id}`} className="text-base text-blue-600 hover:underline font-medium">
              {evaluation.project.projectName}
            </Link>
            {evaluation.project.mustSkills && (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-1.5">必須スキル</p>
                <div className="flex flex-wrap gap-1">
                  {evaluation.project.mustSkills.split(/[,、]/).map((s) => (
                    <span key={s} className="text-sm bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-3">候補者</h3>
            <Link href={`/candidates/${evaluation.candidate.id}`} className="text-base text-blue-600 hover:underline font-medium">
              {candidateName}
            </Link>
            <p className="text-sm text-gray-400 mt-1">経験: {evaluation.candidate.experienceYears ?? "-"}</p>
            {evaluation.candidate.mainSkills && (
              <div className="mt-3 flex flex-wrap gap-1">
                {evaluation.candidate.mainSkills.split(/[,、]/).slice(0, 4).map((s) => (
                  <span key={s} className="text-sm bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s.trim()}</span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-2">担当営業</h3>
            <p className="text-base text-gray-700">{evaluation.salesUser.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
