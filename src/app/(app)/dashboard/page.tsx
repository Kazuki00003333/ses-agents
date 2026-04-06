"use client";
import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StatCounts {
  proposed: number;
  documentPassed: number;
  interviewPassed: number;
  closed: number;
  rejected?: number;
}

interface DashboardData {
  projectCount: number;
  candidateCount: number;
  evaluationCount: number;
  meetingCount: number;
  monthlyMeetingCount: number;
  monthlyMeetingQualityAvg: number | null;
  documentPassRate: number;
  interviewPassRate: number;
  closeRate: number;
  incompleteProjectCount: number;
  incompleteCandidateCount: number;
  projectIncompleteFields: { id: string; missing: string[] }[];
  candidateIncompleteFields: { id: string; missing: string[] }[];
  recentProjects: { id: string; projectName: string; status: string; createdAt: string }[];
  recentMeetings: {
    id: string;
    companyName: string | null;
    contactName: string | null;
    meetingType: string | null;
    aiQualityScore: number | null;
    aiQualityLabel: string | null;
    meetingDate: string | null;
    createdAt: string;
  }[];
  recentEvaluations: {
    id: string;
    fitnessRate: number | null;
    project: { projectName: string };
    candidate: { candidateName: string | null; candidateCode: string | null };
    result: { proposedFlag: boolean; closedFlag: boolean } | null;
  }[];
  totalStats: StatCounts;
  monthlyStats: StatCounts;
  salesSummary?: { id: string; name: string; _count: { projects: number; candidates: number; evaluations: number; meetings: number } }[];
}

// パイプラインファネルバー
function FunnelBar({ label, count, max, color, rate }: { label: string; count: number; max: number; color: string; rate?: string }) {
  const pct = max > 0 ? Math.max((count / max) * 100, count > 0 ? 8 : 0) : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2">
      <div className="w-full flex flex-col items-center justify-end" style={{ height: "120px" }}>
        <div
          className={`w-full rounded-t-lg ${color} flex items-end justify-center pb-2 transition-all`}
          style={{ height: `${pct}%`, minHeight: count > 0 ? "24px" : "4px" }}
        >
          {count > 0 && <span className="text-white font-bold text-lg">{count}</span>}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-600 text-center">{label}</p>
      {rate && <p className="text-xs text-gray-400">{rate}</p>}
    </div>
  );
}

function StatCard({ label, value, unit, warn, color }: { label: string; value: number | string; unit?: string; warn?: boolean; color?: string }) {
  const isWarn = warn && Number(value) > 0;
  return (
    <div className={`border rounded-xl p-5 ${isWarn ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <p className={`text-3xl font-bold ${isWarn ? "text-amber-600" : color ?? "text-gray-900"}`}>
        {value}
        {unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </div>
  );
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

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-48 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashboardData>("/api/dashboard", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });
  const [showIncomplete, setShowIncomplete] = useState(false);

  if (isLoading) return <DashboardSkeleton />;
  if (!data) return <div className="text-base text-red-500 p-8">データ取得に失敗しました</div>;

  const totalIncomplete = data.incompleteProjectCount + data.incompleteCandidateCount;
  const t = data.totalStats;
  const m = data.monthlyStats;
  const pipelineMax = t.proposed || 1;

  // 書類→面談変換率
  const docToInt = t.documentPassed > 0 ? Math.round((t.interviewPassed / t.documentPassed) * 100) : null;
  // 面談→成約変換率
  const intToClose = t.interviewPassed > 0 ? Math.round((t.closed / t.interviewPassed) * 100) : null;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h2>

      {/* ===== アラートバナー ===== */}
      {totalIncomplete > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-amber-500 text-xl">⚠</span>
              <div>
                <p className="text-base font-semibold text-amber-800">項目未入力があります</p>
                <p className="text-sm text-amber-600 mt-0.5">
                  {data.incompleteProjectCount > 0 && `案件 ${data.incompleteProjectCount}件`}
                  {data.incompleteProjectCount > 0 && data.incompleteCandidateCount > 0 && "・"}
                  {data.incompleteCandidateCount > 0 && `候補者 ${data.incompleteCandidateCount}名`}
                  に未入力項目があります
                </p>
              </div>
            </div>
            <button onClick={() => setShowIncomplete(!showIncomplete)} className="text-sm text-amber-600 hover:underline font-medium">
              {showIncomplete ? "閉じる" : "詳細を見る"}
            </button>
          </div>
          {showIncomplete && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {data.projectIncompleteFields.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-amber-700 mb-2">案件（未入力あり）</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {data.projectIncompleteFields.map((p) => (
                      <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-2 text-sm text-amber-700 hover:underline">
                        <span>→</span>
                        <span className="text-gray-600">{p.missing.join("・")} が未入力</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {data.candidateIncompleteFields.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-amber-700 mb-2">候補者（未入力あり）</p>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {data.candidateIncompleteFields.map((c) => (
                      <Link key={c.id} href={`/candidates/${c.id}`} className="flex items-center gap-2 text-sm text-amber-700 hover:underline">
                        <span>→</span>
                        <span className="text-gray-600">{c.missing.join("・")} が未入力</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== 営業パイプライン（累計） ===== */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">営業パイプライン（累計）</h3>
          <Link href="/evaluations/new" className="text-sm text-green-600 hover:underline font-medium">+ 新規評価</Link>
        </div>

        {t.proposed === 0 ? (
          <div className="text-center py-8">
            <p className="text-base text-gray-400 mb-3">まだ評価データがありません</p>
            <Link href="/evaluations/new" className="text-base text-blue-600 hover:underline font-medium">最初のマッチング評価を実行する →</Link>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-3 mb-4">
              <FunnelBar label="提案" count={t.proposed} max={pipelineMax} color="bg-blue-400" />
              <div className="flex flex-col items-center justify-center pb-8 text-gray-300 text-xs">
                {t.proposed > 0 && t.documentPassed > 0 && (
                  <span className="text-green-500 font-medium">{Math.round((t.documentPassed / t.proposed) * 100)}%</span>
                )}
                <span>→</span>
              </div>
              <FunnelBar label="書類通過" count={t.documentPassed} max={pipelineMax} color="bg-cyan-400"
                rate={t.proposed > 0 ? undefined : undefined} />
              <div className="flex flex-col items-center justify-center pb-8 text-gray-300 text-xs">
                {docToInt !== null && <span className="text-green-500 font-medium">{docToInt}%</span>}
                <span>→</span>
              </div>
              <FunnelBar label="面談通過" count={t.interviewPassed} max={pipelineMax} color="bg-emerald-400" />
              <div className="flex flex-col items-center justify-center pb-8 text-gray-300 text-xs">
                {intToClose !== null && <span className="text-purple-500 font-medium">{intToClose}%</span>}
                <span>→</span>
              </div>
              <FunnelBar label="成約" count={t.closed} max={pipelineMax} color="bg-purple-500" />
              {t.rejected != null && t.rejected > 0 && (
                <>
                  <div className="flex flex-col items-center justify-center pb-8 text-gray-300 text-xs"><span>↘</span></div>
                  <FunnelBar label="失注" count={t.rejected} max={pipelineMax} color="bg-red-300" />
                </>
              )}
            </div>
            {/* KPI行 */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm text-gray-400">書類通過率</p>
                <p className="text-2xl font-bold text-blue-600">{data.documentPassRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">面談通過率</p>
                <p className="text-2xl font-bold text-green-600">{data.interviewPassRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">成約率</p>
                <p className="text-2xl font-bold text-purple-600">{data.closeRate}%</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== 今月の活動 ===== */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-5">今月の活動</h3>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "商談数", value: data.monthlyMeetingCount, color: "text-teal-600", bg: "bg-teal-50" },
            { label: "提案", value: m.proposed, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "書類通過", value: m.documentPassed, color: "text-cyan-600", bg: "bg-cyan-50" },
            { label: "面談通過", value: m.interviewPassed, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "成約", value: m.closed, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl p-4 text-center ${item.bg}`}>
              <p className="text-sm text-gray-500 mb-1">{item.label}</p>
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 登録数サマリー ===== */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <StatCard label="登録案件数" value={data.projectCount} unit="件" />
        <StatCard label="候補者数" value={data.candidateCount} unit="名" />
        <StatCard label="評価件数" value={data.evaluationCount} unit="件" />
        <StatCard label="累計商談数" value={data.meetingCount} unit="件" />
        <StatCard label="案件 未入力" value={data.incompleteProjectCount} unit="件" warn />
        <StatCard label="候補者 未入力" value={data.incompleteCandidateCount} unit="名" warn />
      </div>

      {/* ===== 最近の案件・商談・評価 ===== */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">最近の案件</h3>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline font-medium">一覧を見る</Link>
          </div>
          {data.recentProjects.length === 0 ? (
            <p className="text-base text-gray-400">案件がありません</p>
          ) : (
            <div className="space-y-2">
              {data.recentProjects.map((p) => {
                const s = statusLabel(p.status);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2">
                    <span className="text-base text-gray-800 truncate flex-1">{p.projectName}</span>
                    <span className={`text-sm px-2.5 py-0.5 rounded-full ml-3 font-medium ${s.color}`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">最近の商談</h3>
            <Link href="/meetings" className="text-sm text-blue-600 hover:underline font-medium">一覧を見る</Link>
          </div>
          {data.recentMeetings.length === 0 ? (
            <p className="text-base text-gray-400">商談がありません</p>
          ) : (
            <div className="space-y-2">
              {data.recentMeetings.map((m) => {
                const qualityColors: Record<string, string> = {
                  excellent: "bg-green-100 text-green-700",
                  good: "bg-blue-100 text-blue-700",
                  fair: "bg-yellow-100 text-yellow-700",
                  poor: "bg-red-100 text-red-600",
                };
                return (
                  <Link key={m.id} href={`/meetings/${m.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-gray-800 truncate">{m.companyName ?? "（未設定）"}</p>
                      <p className="text-sm text-gray-400 truncate">{m.contactName ?? "—"}</p>
                    </div>
                    {m.aiQualityScore != null && (
                      <span className={`text-sm font-semibold px-2.5 py-0.5 rounded ml-3 ${m.aiQualityLabel ? qualityColors[m.aiQualityLabel] ?? "" : ""}`}>
                        {m.aiQualityScore}点
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">最近の評価</h3>
            <Link href="/evaluations" className="text-sm text-blue-600 hover:underline font-medium">一覧を見る</Link>
          </div>
          {data.recentEvaluations.length === 0 ? (
            <p className="text-base text-gray-400">評価がありません</p>
          ) : (
            <div className="space-y-2">
              {data.recentEvaluations.map((e) => (
                <Link key={e.id} href={`/evaluations/${e.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">{e.project.projectName}</p>
                    <p className="text-sm text-gray-400 truncate">{e.candidate.candidateName ?? e.candidate.candidateCode}</p>
                  </div>
                  {e.fitnessRate != null && (
                    <span className={`text-sm font-semibold px-2.5 py-0.5 rounded ml-3 ${
                      e.fitnessRate >= 85 ? "bg-green-100 text-green-700" :
                      e.fitnessRate >= 70 ? "bg-blue-100 text-blue-700" :
                      e.fitnessRate >= 50 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-600"
                    }`}>
                      {e.fitnessRate}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== 営業別サマリー（マネージャー） ===== */}
      {data.salesSummary && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">営業別サマリー</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 font-semibold text-gray-500 text-sm" scope="col">営業名</th>
                <th className="text-right py-3 font-semibold text-gray-500 text-sm" scope="col">案件数</th>
                <th className="text-right py-3 font-semibold text-gray-500 text-sm" scope="col">候補者数</th>
                <th className="text-right py-3 font-semibold text-gray-500 text-sm" scope="col">評価件数</th>
                <th className="text-right py-3 font-semibold text-gray-500 text-sm" scope="col">商談数</th>
              </tr>
            </thead>
            <tbody>
              {data.salesSummary.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 text-base text-gray-800">{s.name}</td>
                  <td className="py-3 text-right text-base text-gray-700">{s._count.projects}</td>
                  <td className="py-3 text-right text-base text-gray-700">{s._count.candidates}</td>
                  <td className="py-3 text-right text-base text-gray-700">{s._count.evaluations}</td>
                  <td className="py-3 text-right text-base text-gray-700">{s._count.meetings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
