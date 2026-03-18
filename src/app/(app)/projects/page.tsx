"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Project {
  id: string;
  projectName: string;
  clientCompanyName: string | null;
  commercialFlow: number | null;
  unitPrice: string | null;
  participationPeriod: string | null;
  workLocation: string | null;
  status: string;
  createdAt: string;
  salesUser: { id: string; name: string };
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: "下書き", color: "bg-gray-100 text-gray-600" },
    active: { label: "有効", color: "bg-green-100 text-green-700" },
    analyzed: { label: "精査済", color: "bg-blue-100 text-blue-700" },
    closed: { label: "終了", color: "bg-red-100 text-red-600" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useSWR<Project[]>("/api/projects", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const [search, setSearch] = useState("");

  const filtered = (projects as Project[]).filter(
    (p) =>
      p.projectName.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientCompanyName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      p.salesUser.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">案件管理</h2>
        <Link
          href="/projects/new"
          className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 新規案件登録
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="案件名・会社名・営業担当で検索..."
            className="w-96 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-base text-gray-400">案件が見つかりません</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">案件名</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">会社名</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">商流</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">単価</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">参画期間</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">勤務地</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">登録営業</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">ステータス</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-sm">登録日</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const s = statusLabel(p.status);
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline font-semibold text-base">
                        {p.projectName}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-700 text-base">{p.clientCompanyName ?? "-"}</td>
                    <td className="px-5 py-4 text-gray-700 text-base">{p.commercialFlow ? `${p.commercialFlow}次` : "-"}</td>
                    <td className="px-5 py-4 text-gray-700 text-base font-medium">{p.unitPrice ?? "-"}</td>
                    <td className="px-5 py-4 text-gray-700 text-base">{p.participationPeriod ?? "-"}</td>
                    <td className="px-5 py-4 text-gray-700 text-base">{p.workLocation ?? "-"}</td>
                    <td className="px-5 py-4 text-gray-700 text-base">{p.salesUser.name}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm">
                      {new Date(p.createdAt).toLocaleDateString("ja-JP")}
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
