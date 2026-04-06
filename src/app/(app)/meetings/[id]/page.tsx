"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type MeetingType = "first_contact" | "needs_hearing" | "project_proposal" | "follow_up" | "closing" | "other";

interface Meeting {
  id: string;
  companyName: string | null;
  contactName: string | null;
  meetingPurpose: string | null;
  meetingGains: string | null;
  infoMemo: string | null;
  projectPossibility: string | null;
  requiredSkillSense: string | null;
  budgetSense: string | null;
  timingSense: string | null;
  meetingType: MeetingType | null;
  nextAction: string | null;
  meetingDate: string | null;
  minutesRawText: string | null;
  aiFollowUpAdvice: {
    priority: string;
    summary: string;
    questions: { topic: string; question: string; reason: string }[];
  } | null;
  aiQualityScore: number | null;
  aiQualityLabel: string | null;
  aiQualityComment: string | null;
  aiStrengths: string[] | null;
  aiImprovements: string[] | null;
  status: string;
  salesUser: { id: string; name: string };
  createdAt: string;
}

type EditForm = {
  companyName: string;
  contactName: string;
  meetingPurpose: string;
  meetingGains: string;
  infoMemo: string;
  projectPossibility: string;
  requiredSkillSense: string;
  budgetSense: string;
  timingSense: string;
  meetingType: string;
  nextAction: string;
  meetingDate: string;
};

const MEETING_TYPE_LABELS: Record<MeetingType, { label: string; color: string }> = {
  first_contact:    { label: "初回接触",   color: "bg-gray-100 text-gray-600" },
  needs_hearing:    { label: "ニーズヒア", color: "bg-blue-100 text-blue-700" },
  project_proposal: { label: "案件提案",   color: "bg-green-100 text-green-700" },
  follow_up:        { label: "フォロー",   color: "bg-yellow-100 text-yellow-700" },
  closing:          { label: "クロージング", color: "bg-purple-100 text-purple-700" },
  other:            { label: "その他",     color: "bg-gray-100 text-gray-500" },
};

const QUALITY_COLORS: Record<string, string> = {
  excellent: "bg-green-100 text-green-700",
  good:      "bg-blue-100 text-blue-700",
  fair:      "bg-yellow-100 text-yellow-700",
  poor:      "bg-red-100 text-red-600",
};

const QUALITY_LABELS: Record<string, string> = {
  excellent: "優秀",
  good:      "良好",
  fair:      "普通",
  poor:      "要改善",
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [advising, setAdvising] = useState(false);
  const [adviseError, setAdviseError] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  async function loadMeeting() {
    const res = await fetch(`/api/meetings/${id}`);
    const data = await res.json();
    setMeeting(data);
    setForm({
      companyName: data.companyName ?? "",
      contactName: data.contactName ?? "",
      meetingPurpose: data.meetingPurpose ?? "",
      meetingGains: data.meetingGains ?? "",
      infoMemo: data.infoMemo ?? "",
      projectPossibility: data.projectPossibility ?? "",
      requiredSkillSense: data.requiredSkillSense ?? "",
      budgetSense: data.budgetSense ?? "",
      timingSense: data.timingSense ?? "",
      meetingType: data.meetingType ?? "",
      nextAction: data.nextAction ?? "",
      meetingDate: data.meetingDate ? data.meetingDate.split("T")[0] : "",
    });
  }

  useEffect(() => {
    loadMeeting().finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    await fetch(`/api/meetings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        meetingType: form.meetingType || null,
        meetingDate: form.meetingDate || null,
      }),
    });
    await loadMeeting();
    setEditing(false);
    setSaving(false);
  }

  async function handleAdvise() {
    setAdvising(true);
    setAdviseError("");
    try {
      await fetch(`/api/meetings/${id}/advise`, { method: "POST" });
      await loadMeeting();
    } catch {
      setAdviseError("アドバイスの取得に失敗しました");
    } finally {
      setAdvising(false);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    await fetch(`/api/meetings/${id}/evaluate`, { method: "POST" });
    await loadMeeting();
    setEvaluating(false);
  }

  const field = (key: keyof EditForm) => ({
    value: form?.[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => f ? { ...f, [key]: e.target.value } : f),
  });

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
  if (!meeting || !form) return <div className="text-base text-red-500 p-8">商談が見つかりません</div>;

  const typeInfo = meeting.meetingType ? MEETING_TYPE_LABELS[meeting.meetingType] : null;
  const qualityColor = meeting.aiQualityLabel ? QUALITY_COLORS[meeting.aiQualityLabel] ?? "bg-gray-100 text-gray-600" : "";
  const qualityLabel = meeting.aiQualityLabel ? QUALITY_LABELS[meeting.aiQualityLabel] ?? meeting.aiQualityLabel : "";
  const advice = meeting.aiFollowUpAdvice;

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/meetings" className="text-base text-gray-400 hover:text-gray-600">← 戻る</Link>
        {editing ? (
          <input {...field("companyName")} placeholder="会社名"
            className="flex-1 text-2xl font-bold border-b-2 border-blue-400 bg-transparent focus:outline-none px-1" />
        ) : (
          <h2 className="text-2xl font-bold text-gray-900 flex-1">
            {meeting.companyName ?? "（会社名未設定）"}
          </h2>
        )}
        {typeInfo && !editing && (
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
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
            <button onClick={() => setEditing(true)} className="text-base px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              編集
            </button>
          )}
        </div>
      </div>

      {isNew && !editing && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <p className="text-base text-green-700">AIが議事録を解析して自動登録しました。内容を確認・修正してください。</p>
          <button onClick={() => setEditing(true)} className="text-sm text-green-700 font-semibold underline ml-4">内容を修正する</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* 基本情報 */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5">商談情報</h3>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">会社名</label>
                    <input {...field("companyName")} placeholder="例: 株式会社〇〇"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">相手の名前</label>
                    <input {...field("contactName")} placeholder="例: 田中 部長"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">商談タイプ</label>
                    <select {...field("meetingType")}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">未選択</option>
                      <option value="first_contact">初回接触</option>
                      <option value="needs_hearing">ニーズヒアリング</option>
                      <option value="project_proposal">案件提案</option>
                      <option value="follow_up">フォローアップ</option>
                      <option value="closing">クロージング</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">商談日</label>
                    <input {...field("meetingDate")} type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">商談目的</label>
                  <textarea {...field("meetingPurpose")} rows={2} placeholder="何のために会ったか"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">商談で得たもの</label>
                  <textarea {...field("meetingGains")} rows={3} placeholder="成果・合意事項・確認できた情報"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">得た情報のMEMO</label>
                  <textarea {...field("infoMemo")} rows={4} placeholder="詳細メモ・課題・ニーズ・背景情報"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["projectPossibility", "案件の可能性"],
                    ["requiredSkillSense", "必要スキル感"],
                    ["budgetSense", "予算感"],
                    ["timingSense", "時期感"],
                  ] as [keyof EditForm, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
                      <input {...field(key)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">次回アクション</label>
                  <textarea {...field("nextAction")} rows={2} placeholder="誰が・何を・いつまでに"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            ) : (
              <dl className="divide-y divide-gray-100">
                {([
                  ["登録営業", meeting.salesUser.name],
                  ["相手の名前", meeting.contactName],
                  ["商談目的", meeting.meetingPurpose],
                  ["商談で得たもの", meeting.meetingGains],
                  ["案件の可能性", meeting.projectPossibility],
                  ["必要スキル感", meeting.requiredSkillSense],
                  ["予算感", meeting.budgetSense],
                  ["時期感", meeting.timingSense],
                  ["次回アクション", meeting.nextAction],
                ] as [string, string | null][]).map(([label, value]) => (
                  <div key={label} className="flex items-baseline py-3 gap-4">
                    <dt className="text-sm font-medium text-gray-500 w-36 shrink-0">{label}</dt>
                    <dd className="text-base flex-1 text-gray-900">
                      {value ?? <span className="text-gray-300 text-sm">未入力</span>}
                    </dd>
                  </div>
                ))}
                {meeting.infoMemo && (
                  <div className="pt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">得た情報のMEMO</p>
                    <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{meeting.infoMemo}</p>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* AIフォローアップアドバイス */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">フォローアップアドバイス</h3>
              <button
                onClick={handleAdvise}
                disabled={advising}
                className="text-base bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
              >
                {advising ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    AI分析中...
                  </>
                ) : advice ? "再取得" : "AIアドバイスを取得"}
              </button>
            </div>

            {adviseError && (
              <p className="text-base text-red-600 mb-4">{adviseError}</p>
            )}

            {advice ? (
              <div>
                <div className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium mb-3 ${
                  advice.priority === "high" ? "bg-red-100 text-red-700" :
                  advice.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {advice.priority === "high" ? "優先度：高" : advice.priority === "medium" ? "優先度：中" : "優先度：低"}
                </div>
                <p className="text-base text-gray-700 mb-4">{advice.summary}</p>
                <div className="space-y-3">
                  {advice.questions.map((q, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">💬 {q.topic}</p>
                      <p className="text-base text-blue-900 mb-1.5">{q.question}</p>
                      <p className="text-sm text-blue-600">{q.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-base text-gray-400">
                ボタンを押すと、次回の商談で確認すべきことをAIがアドバイスします。
              </p>
            )}
          </div>
        </div>

        {/* サイドパネル */}
        <div className="space-y-5">
          {/* 商談品質スコア */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">商談品質</h3>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
              >
                {evaluating ? "評価中..." : "再評価"}
              </button>
            </div>
            {meeting.aiQualityScore != null ? (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">{meeting.aiQualityScore}</span>
                  <span className="text-base text-gray-400">/ 100</span>
                  <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ml-1 ${qualityColor}`}>
                    {qualityLabel}
                  </span>
                </div>
                {meeting.aiQualityComment && (
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{meeting.aiQualityComment}</p>
                )}
                {meeting.aiStrengths && meeting.aiStrengths.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-green-700 mb-1.5">良かった点</p>
                    <ul className="space-y-1">
                      {meeting.aiStrengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meeting.aiImprovements && meeting.aiImprovements.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-amber-700 mb-1.5">改善できる点</p>
                    <ul className="space-y-1">
                      {meeting.aiImprovements.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                          <span className="text-amber-500 mt-0.5">→</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">品質評価は登録時に自動実行されます</p>
            )}
          </div>

          {/* 商談メタ情報 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">商談概要</h3>
            <dl className="space-y-3">
              {typeInfo && (
                <div>
                  <dt className="text-sm text-gray-400 mb-1">タイプ</dt>
                  <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>
              )}
              {meeting.meetingDate && (
                <div>
                  <dt className="text-sm text-gray-400 mb-1">商談日</dt>
                  <dd className="text-base text-gray-900">{meeting.meetingDate.split("T")[0]}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-400 mb-1">登録日</dt>
                <dd className="text-base text-gray-900">{new Date(meeting.createdAt).toLocaleDateString("ja-JP")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
