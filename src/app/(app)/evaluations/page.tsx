"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Evaluation {
  id: string;
  fitnessRate: number | null;
  createdAt: string;
  project: { id: string; projectName: string };
  candidate: { id: string; candidateName: string | null; candidateCode: string | null };
  salesUser: { id: string; name: string };
  result: {
    proposedFlag: boolean;
    documentPassedFlag: boolean;
    interviewPassedFlag: boolean;
    closedFlag: boolean;
  } | null;
}

function fitLabel(rate: number | null) {
  if (rate == null) return { label: "未評価", color: "bg-gray-100 text-gray-500" };
  if (rate >= 85) return { label: `${rate}% 提案有力`, color: "bg-green-100 text-green-700" };
  if (rate >= 70) return { label: `${rate}% 提案可能`, color: "bg-blue-100 text-blue-700" };
  if (rate >= 50) return { label: `${rate}% 慎重提案`, color: "bg-yellow-100 text-yellow-700" };
  return { label: `${rate}% 要再確認`, color: "bg-red-100 text-red-600" };
}

function EvaluationSkeleton() {
  return (
    <div className="p-8 space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
    </div>
  );
}

export default function EvaluationsPage() {
  const { data: evaluations = [], isLoading } = useSWR<Evaluation[]>("/api/evaluations", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const [search, setSearch] = useState("");

  const filtered = (evaluations as Evaluation[]).filter((e) => {
    const project = e.project.projectName.toLowerCase();
    const candidate = (e.candidate.candidateName ?? e.candidate.candidateCode ?? "").toLowerCase();
    const q = search.toLowerCase();
    return project.includes(q) || candidate.includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">マッチング評価</h2>
        <Link
          href="/evaluations/new"
          className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 新規評価
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="案件名・候補者名で検索..."
            className="w-96 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <EvaluationSkeleton />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-base text-gray-400">評価が見つかりません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">案件</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">候補者</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">適正率</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">ステータス</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm" scope="col">評価日</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const fit = fitLabel(e.fitnessRate);
                return (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/projects/${e.project.id}`} className="text-blue-600 hover:underline font-semibold text-base">
                        {e.project.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-base text-gray-700">
                      {e.candidate.candidateName ?? e.candidate.candidateCode ?? "匿名"}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/evaluations/${e.id}`}>
                        <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 ${fit.color}`}>
                          {fit.label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {e.result ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {e.result.proposedFlag && <span className="text-sm px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">提案済</span>}
                          {e.result.documentPassedFlag && <span className="text-sm px-2 py-0.5 bg-green-50 text-green-600 rounded-full">書類通過</span>}
                          {e.result.interviewPassedFlag && <span className="text-sm px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">面談通過</span>}
                          {e.result.closedFlag && <span className="text-sm px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full">成約</span>}
                          {!e.result.proposedFlag && !e.result.documentPassedFlag && !e.result.interviewPassedFlag && !e.result.closedFlag && (
                            <span className="text-sm text-gray-400">未更新</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未更新</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {new Date(e.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
