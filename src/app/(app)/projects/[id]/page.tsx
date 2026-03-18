"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Project {
  id: string;
  projectName: string;
  clientCompanyName: string | null;
  projectSummary: string | null;
  mustSkills: string | null;
  niceToHaveSkills: string | null;
  commercialFlow: number | null;
  participationPeriod: string | null;
  unitPrice: string | null;
  paymentSite: string | null;
  workingHours: string | null;
  workLocation: string | null;
  remoteType: string | null;
  interviewCount: string | null;
  settlementRange: string | null;
  foreignerAllowed: string | null;
  ageLimit: string | null;
  otherInfo: string | null;
  aiSummary: string | null;
  aiMissingInfo: string[] | null;
  aiChecklist: string[] | null;
  aiInsights: string[] | null;
  riskFlags: { level: string; message: string }[] | null;
  status: string;
  salesUser: { id: string; name: string };
  evaluations: {
    id: string;
    fitnessRate: number | null;
    candidate: { id: string; candidateName: string | null; candidateCode: string | null };
    result: { proposedFlag: boolean; closedFlag: boolean } | null;
  }[];
}

type EditForm = {
  projectName: string;
  clientCompanyName: string;
  projectSummary: string;
  mustSkills: string;
  niceToHaveSkills: string;
  commercialFlow: string;
  participationPeriod: string;
  unitPrice: string;
  paymentSite: string;
  workingHours: string;
  workLocation: string;
  remoteType: string;
  interviewCount: string;
  settlementRange: string;
  foreignerAllowed: string;
  ageLimit: string;
  otherInfo: string;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "下書き", color: "bg-gray-100 text-gray-600" },
  { value: "active", label: "有効", color: "bg-green-100 text-green-700" },
  { value: "analyzed", label: "精査済", color: "bg-blue-100 text-blue-700" },
  { value: "closed", label: "終了", color: "bg-red-100 text-red-600" },
];

function missingFields(p: Project): string[] {
  const missing: string[] = [];
  if (!p.mustSkills) missing.push("必須スキル");
  if (!p.unitPrice) missing.push("単価");
  if (!p.participationPeriod) missing.push("参画期間");
  if (!p.workLocation) missing.push("勤務地");
  if (!p.paymentSite) missing.push("支払サイト");
  if (!p.workingHours) missing.push("業務時間");
  return missing;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
  const [analyzeError, setAnalyzeError] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  async function loadProject() {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setProject(data);
    setCheckedItems(new Set());
    setForm({
      projectName: data.projectName ?? "",
      clientCompanyName: data.clientCompanyName ?? "",
      projectSummary: data.projectSummary ?? "",
      mustSkills: data.mustSkills ?? "",
      niceToHaveSkills: data.niceToHaveSkills ?? "",
      commercialFlow: data.commercialFlow?.toString() ?? "",
      participationPeriod: data.participationPeriod ?? "",
      unitPrice: data.unitPrice ?? "",
      paymentSite: data.paymentSite ?? "",
      workingHours: data.workingHours ?? "",
      workLocation: data.workLocation ?? "",
      remoteType: data.remoteType ?? "",
      interviewCount: data.interviewCount ?? "",
      settlementRange: data.settlementRange ?? "",
      foreignerAllowed: data.foreignerAllowed ?? "",
      ageLimit: data.ageLimit ?? "",
      otherInfo: data.otherInfo ?? "",
    });
  }

  useEffect(() => {
    loadProject().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!analyzing) { setAnalyzeElapsed(0); return; }
    const timer = setInterval(() => setAnalyzeElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [analyzing]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        commercialFlow: form.commercialFlow ? parseInt(form.commercialFlow) : null,
      }),
    });
    await loadProject();
    setEditing(false);
    setSaving(false);
  }

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await loadProject();
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch(`/api/projects/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze" }),
      });
      if (!res.ok) throw new Error("分析に失敗しました");
      await loadProject();
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-96 bg-gray-200 rounded" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
  if (!project || !form) return <div className="text-base text-red-500 p-8">案件が見つかりません</div>;

  const missing = missingFields(project);
  const hasAnalysis = !!project.aiSummary;
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === project.status) ?? STATUS_OPTIONS[0];

  const field = (key: keyof EditForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => f ? { ...f, [key]: e.target.value } : f),
  });

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/projects" className="text-base text-gray-400 hover:text-gray-600">← 戻る</Link>
        {editing ? (
          <input {...field("projectName")} placeholder="案件名"
            className="flex-1 text-2xl font-bold border-b-2 border-blue-400 bg-transparent focus:outline-none px-1" />
        ) : (
          <h2 className="text-2xl font-bold text-gray-900 flex-1">{project.projectName}</h2>
        )}
        {/* ステータスバッジ（非編集時のみ変更可） */}
        {!editing && (
          <div className="relative">
            <select
              value={project.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`text-sm px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer appearance-none pr-7 ${currentStatus.color}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs">▾</span>
          </div>
        )}
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="text-base px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving} className="text-base bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? "保存中..." : "保存"}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-base px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                編集
              </button>
              <button onClick={handleAnalyze} disabled={analyzing} className="text-base bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {analyzing ? `AI精査中... ${analyzeElapsed}秒` : "案件精査する"}
              </button>
            </>
          )}
        </div>
      </div>

      {isNew && !editing && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <p className="text-base text-green-700">AIが解析して自動保存しました。内容を確認・修正してください。</p>
          <button onClick={() => setEditing(true)} className="text-sm text-green-700 font-semibold underline ml-4">内容を修正する</button>
        </div>
      )}

      {missing.length > 0 && !editing && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-base text-amber-700 font-semibold mb-2">未入力項目があります（{missing.length}件）</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <span key={m} className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{m}</span>
            ))}
          </div>
        </div>
      )}

      {analyzeError && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <p className="text-base text-red-600">{analyzeError}</p>
        </div>
      )}

      {analyzing && (
        <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <svg className="animate-spin w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-base font-medium text-blue-700">AIが案件を精査しています... {analyzeElapsed}秒経過</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((analyzeElapsed / 30) * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">案件情報</h3>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">クライアント会社名</label>
                    <input {...field("clientCompanyName")} placeholder="例: 株式会社〇〇"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">商流（何次）</label>
                    <input {...field("commercialFlow")} type="number" placeholder="例: 2"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">案件概要</label>
                  <textarea {...field("projectSummary")} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">必須スキル</label>
                    <input {...field("mustSkills")}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">尚可スキル</label>
                    <input {...field("niceToHaveSkills")}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {([
                    ["unitPrice", "単価"],
                    ["paymentSite", "支払サイト"],
                    ["participationPeriod", "参画期間"],
                    ["workingHours", "業務時間"],
                    ["settlementRange", "精算幅"],
                    ["workLocation", "勤務地"],
                    ["remoteType", "リモート"],
                    ["interviewCount", "面談回数"],
                    ["foreignerAllowed", "外国籍"],
                    ["ageLimit", "年齢制限"],
                  ] as [keyof EditForm, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
                      <input {...field(key)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">その他情報</label>
                  <textarea {...field("otherInfo")} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            ) : (
              <>
                <dl className="divide-y divide-gray-100">
                  {([
                    ["登録営業", project.salesUser.name, false],
                    ["クライアント会社名", project.clientCompanyName, false],
                    ["商流", project.commercialFlow ? `${project.commercialFlow}次受け` : null, false],
                    ["単価", project.unitPrice, !project.unitPrice],
                    ["支払サイト", project.paymentSite, !project.paymentSite],
                    ["参画期間", project.participationPeriod, !project.participationPeriod],
                    ["業務時間", project.workingHours, !project.workingHours],
                    ["精算幅", project.settlementRange, false],
                    ["勤務地", project.workLocation, !project.workLocation],
                    ["リモート", project.remoteType, false],
                    ["面談回数", project.interviewCount, false],
                    ["外国籍", project.foreignerAllowed, false],
                    ["年齢制限", project.ageLimit, false],
                  ] as [string, string | number | null | undefined, boolean][]).map(([label, value, highlight]) => (
                    <div key={label} className="flex items-baseline py-3 gap-4">
                      <dt className="text-sm font-medium text-gray-500 w-36 shrink-0">{label}</dt>
                      <dd className={`text-base flex-1 ${highlight ? "text-amber-500 italic" : "text-gray-900"}`}>
                        {value ?? <span className="text-amber-400 text-sm">未入力</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                {project.projectSummary && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">案件概要</p>
                    <p className="text-base text-gray-700 leading-relaxed">{project.projectSummary}</p>
                  </div>
                )}
                {project.mustSkills && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">必須スキル</p>
                    <div className="flex flex-wrap gap-2">
                      {project.mustSkills.split(/[,、]/).map((s) => (
                        <span key={s} className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">{s.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {project.niceToHaveSkills && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">尚可スキル</p>
                    <div className="flex flex-wrap gap-2">
                      {project.niceToHaveSkills.split(/[,、]/).map((s) => (
                        <span key={s} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{s.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {project.otherInfo && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">その他情報</p>
                    <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{project.otherInfo}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI精査結果 */}
          {hasAnalysis && (
            <div className="space-y-5">
              {project.aiSummary && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-3">案件要約</h3>
                  <p className="text-base text-gray-700 leading-relaxed">{project.aiSummary}</p>
                </div>
              )}
              {project.riskFlags && project.riskFlags.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">注意フラグ</h3>
                  <div className="space-y-2.5">
                    {project.riskFlags.map((f, i) => (
                      <div key={i} className={`flex items-start gap-3 text-base px-4 py-3 rounded-lg ${f.level === "warning" ? "bg-yellow-50 text-yellow-800" : "bg-blue-50 text-blue-800"}`}>
                        <span className="text-lg">{f.level === "warning" ? "⚠" : "ℹ"}</span>
                        <span>{f.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.aiMissingInfo && project.aiMissingInfo.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">不足情報</h3>
                  <ul className="space-y-2">
                    {project.aiMissingInfo.map((item, i) => (
                      <li key={i} className="text-base text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {project.aiChecklist && project.aiChecklist.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900">確認チェックリスト</h3>
                    <span className="text-sm text-gray-400">{checkedItems.size} / {project.aiChecklist.length} 確認済</span>
                  </div>
                  <ul className="space-y-2.5">
                    {project.aiChecklist.map((item, i) => {
                      const checked = checkedItems.has(i);
                      return (
                        <li
                          key={i}
                          className={`flex items-start gap-3 cursor-pointer rounded-lg px-3 py-2.5 -mx-3 transition-colors ${checked ? "bg-green-50" : "hover:bg-gray-50"}`}
                          onClick={() => setCheckedItems((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                        >
                          <span className={`text-xl mt-0.5 flex-shrink-0 ${checked ? "text-green-500" : "text-gray-300"}`}>
                            {checked ? "☑" : "☐"}
                          </span>
                          <span className={`text-base leading-relaxed ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {project.aiInsights && project.aiInsights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">示唆</h3>
                  <ul className="space-y-2">
                    {project.aiInsights.map((item, i) => (
                      <li key={i} className="text-base text-gray-700 flex items-start gap-2">
                        <span className="text-blue-400">→</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!hasAnalysis && !editing && !analyzing && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center">
              <p className="text-base text-gray-400 mb-4">AI精査がまだ実行されていません</p>
              <button onClick={handleAnalyze} disabled={analyzing}
                className="text-base bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                今すぐ案件精査する
              </button>
            </div>
          )}
        </div>

        {/* サイドパネル */}
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">候補者マッチング</h3>
            <Link href={`/evaluations/new?projectId=${project.id}`}
              className="w-full block text-center text-base bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium">
              + マッチング評価する
            </Link>
          </div>
          {project.evaluations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">評価済み候補者 ({project.evaluations.length}名)</h3>
              <div className="space-y-2">
                {project.evaluations.map((e) => (
                  <Link key={e.id} href={`/evaluations/${e.id}`} className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -mx-2">
                    <span className="text-base text-gray-700 truncate">
                      {e.candidate.candidateName ?? e.candidate.candidateCode ?? "匿名"}
                    </span>
                    {e.fitnessRate != null && (
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ml-2 ${
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
