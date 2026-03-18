"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Candidate {
  id: string;
  candidateCode: string | null;
  candidateName: string | null;
  companyName: string | null;
  commercialFlowType: string | null;
  experienceYears: string | null;
  mainSkills: string | null;
  availableDate: string | null;
  updatedAt: string;
  salesUser: { id: string; name: string };
}

export default function CandidatesPage() {
  const { data: candidates = [], isLoading } = useSWR<Candidate[]>("/api/candidates", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const [search, setSearch] = useState("");

  const filtered = (candidates as Candidate[]).filter((c) => {
    const name = c.candidateName ?? c.candidateCode ?? "";
    const skills = c.mainSkills ?? "";
    const company = c.companyName ?? "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      skills.toLowerCase().includes(search.toLowerCase()) ||
      company.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">候補者管理</h2>
        <Link
          href="/candidates/new"
          className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 候補者登録
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="候補者名・会社名・スキルで検索..."
            className="w-96 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-base text-gray-400">候補者が見つかりません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">候補者</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">所属会社</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">商流種別</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">経験年数</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">主要スキル</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">稼働開始日</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">登録営業</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">更新日</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/candidates/${c.id}`} className="text-blue-600 hover:underline font-semibold text-base">
                      {c.candidateName ?? c.candidateCode ?? "匿名"}
                    </Link>
                    {c.candidateCode && c.candidateName && (
                      <span className="text-sm text-gray-400 ml-2">{c.candidateCode}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-700 text-base">{c.companyName ?? "-"}</td>
                  <td className="px-5 py-4 text-gray-700 text-base">{c.commercialFlowType ?? "-"}</td>
                  <td className="px-5 py-4 text-gray-700 text-base">{c.experienceYears ?? "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.mainSkills?.split(/[,、]/).slice(0, 3).map((s) => (
                        <span key={s} className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.trim()}</span>
                      )) ?? <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 text-base">{c.availableDate ?? "-"}</td>
                  <td className="px-5 py-4 text-gray-700 text-base">{c.salesUser.name}</td>
                  <td className="px-5 py-4 text-gray-400 text-sm">
                    {new Date(c.updatedAt).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
