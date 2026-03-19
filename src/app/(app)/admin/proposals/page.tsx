"use client";
import { useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Proposal {
  id: string;
  fitnessRate: number | null;
  createdAt: string;
  project: { id: string; projectName: string };
  candidate: { id: string; candidateName: string | null; candidateCode: string | null };
  salesUser: { name: string };
  result: {
    proposedFlag: boolean;
    documentPassedFlag: boolean;
    interviewPassedFlag: boolean;
    closedFlag: boolean;
    salesComment: string | null;
    adminScoreRating: string | null;
    adminComment: string | null;
    adminReviewedAt: string | null;
  } | null;
}

const ratingLabels: Record<string, string> = {
  appropriate: "適切",
  too_high: "高すぎ",
  too_low: "低すぎ",
};

function fitBadge(rate: number | null) {
  if (rate == null) return <span className="text-sm text-gray-400">-</span>;
  let color = "bg-red-100 text-red-600";
  if (rate >= 85) color = "bg-green-100 text-green-700";
  else if (rate >= 70) color = "bg-blue-100 text-blue-700";
  else if (rate >= 50) color = "bg-yellow-100 text-yellow-700";
  return <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${color}`}>{rate}%</span>;
}

function ProposalRow({ proposal, onSaved }: { proposal: Proposal; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(proposal.result?.adminScoreRating ?? "");
  const [comment, setComment] = useState(proposal.result?.adminComment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reviewed = !!proposal.result?.adminReviewedAt;

  async function handleSave() {
    if (!rating) {
      setError("スコア評価を選択してください");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/proposals/${proposal.id}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminScoreRating: rating, adminComment: comment }),
      });
      if (!res.ok) {
        setError("保存に失敗しました");
        return;
      }
      onSaved();
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr
        className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-4 text-gray-400 text-sm">
          {new Date(proposal.createdAt).toLocaleDateString("ja-JP")}
        </td>
        <td className="px-5 py-4 text-base text-gray-700">{proposal.salesUser.name}</td>
        <td className="px-5 py-4 text-base text-gray-800">
          {proposal.candidate.candidateName ?? proposal.candidate.candidateCode ?? "匿名"}
        </td>
        <td className="px-5 py-4 text-base text-gray-800">{proposal.project.projectName}</td>
        <td className="px-5 py-4">{fitBadge(proposal.fitnessRate)}</td>
        <td className="px-5 py-4">
          <div className="flex gap-1.5 flex-wrap">
            {proposal.result?.documentPassedFlag && (
              <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">書類通過</span>
            )}
            {proposal.result?.interviewPassedFlag && (
              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">面談通過</span>
            )}
            {proposal.result?.closedFlag && (
              <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full">成約</span>
            )}
            {!proposal.result?.documentPassedFlag && !proposal.result?.interviewPassedFlag && !proposal.result?.closedFlag && (
              <span className="text-xs text-gray-400">-</span>
            )}
          </div>
        </td>
        <td className="px-5 py-4">
          {reviewed ? (
            <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">
              FB済 ({ratingLabels[proposal.result?.adminScoreRating ?? ""] ?? proposal.result?.adminScoreRating})
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">未レビュー</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50">
          <td colSpan={7} className="px-8 py-5">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold text-gray-700">AIスコアへのフィードバック</p>
              <div className="flex gap-2">
                {[
                  { value: "appropriate", label: "適切 ✓" },
                  { value: "too_high", label: "高すぎ ↑" },
                  { value: "too_low", label: "低すぎ ↓" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRating(opt.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      rating === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="コメント（任意）"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  キャンセル
                </button>
                {reviewed && (
                  <p className="text-xs text-gray-400 ml-auto">
                    レビュー済: {new Date(proposal.result!.adminReviewedAt!).toLocaleDateString("ja-JP")}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminProposalsPage() {
  const { data: proposals = [], isLoading, mutate } = useSWR<Proposal[]>("/api/admin/proposals", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">提案レビュー</h2>
        <p className="text-sm text-gray-400 mt-1">提案済みの評価に対してAIスコアのフィードバックを行います</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="p-12 text-center text-base text-gray-400">提案済みの評価がありません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">提案日</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">営業担当</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">候補者</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">案件</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">AIスコア</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">結果</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">FBステータス</th>
              </tr>
            </thead>
            <tbody>
              {(proposals as Proposal[]).map((p) => (
                <ProposalRow key={p.id} proposal={p} onSaved={() => mutate()} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
