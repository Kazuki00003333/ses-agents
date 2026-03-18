"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Candidate {
  id: string;
  candidateCode: string | null;
  candidateName: string | null;
  companyName: string | null;
  commercialFlowType: string | null;
  commercialFlowDepth: number | null;
  age: number | null;
  nearestStation: string | null;
  availableDate: string | null;
  experienceYears: string | null;
  mainSkills: string | null;
  industryExperience: string | null;
  phaseExperience: string | null;
  strengths: string | null;
  desiredConditions: string | null;
  ngConditions: string | null;
  summary: string | null;
  salesUser: { id: string; name: string };
}

type EditForm = {
  candidateCode: string;
  candidateName: string;
  companyName: string;
  commercialFlowType: string;
  commercialFlowDepth: string;
  age: string;
  nearestStation: string;
  availableDate: string;
  experienceYears: string;
  mainSkills: string;
  industryExperience: string;
  phaseExperience: string;
  strengths: string;
  desiredConditions: string;
  ngConditions: string;
  summary: string;
};

function missingFields(c: Candidate): string[] {
  const missing: string[] = [];
  if (!c.mainSkills) missing.push("主要スキル");
  if (!c.availableDate) missing.push("稼働開始日");
  if (!c.experienceYears) missing.push("経験年数");
  return missing;
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(isNew);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadCandidate() {
    const res = await fetch(`/api/candidates/${id}`);
    const data = await res.json();
    setCandidate(data);
    setForm({
      candidateCode: data.candidateCode ?? "",
      candidateName: data.candidateName ?? "",
      companyName: data.companyName ?? "",
      commercialFlowType: data.commercialFlowType ?? "",
      commercialFlowDepth: data.commercialFlowDepth?.toString() ?? "",
      age: data.age?.toString() ?? "",
      nearestStation: data.nearestStation ?? "",
      availableDate: data.availableDate ?? "",
      experienceYears: data.experienceYears ?? "",
      mainSkills: data.mainSkills ?? "",
      industryExperience: data.industryExperience ?? "",
      phaseExperience: data.phaseExperience ?? "",
      strengths: data.strengths ?? "",
      desiredConditions: data.desiredConditions ?? "",
      ngConditions: data.ngConditions ?? "",
      summary: data.summary ?? "",
    });
  }

  useEffect(() => {
    loadCandidate().finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    await fetch(`/api/candidates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age: form.age ? parseInt(form.age) : null,
        commercialFlowDepth: form.commercialFlowDepth ? parseInt(form.commercialFlowDepth) : null,
      }),
    });
    await loadCandidate();
    setEditing(false);
    setSaving(false);
  }

  function f(key: keyof EditForm) {
    return {
      value: form?.[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => prev ? { ...prev, [key]: e.target.value } : prev),
    };
  }

  if (loading) return <div className="text-base text-gray-400 p-8">読み込み中...</div>;
  if (!candidate || !form) return <div className="text-base text-red-500 p-8">候補者が見つかりません</div>;

  const missing = missingFields(candidate);
  const displayName = candidate.candidateName ?? candidate.candidateCode ?? "匿名";

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/candidates" className="text-base text-gray-400 hover:text-gray-600">← 戻る</Link>
        {editing ? (
          <input {...f("candidateName")} placeholder="候補者名（任意）"
            className="flex-1 text-2xl font-bold border-b-2 border-blue-400 bg-transparent focus:outline-none px-1" />
        ) : (
          <h2 className="text-2xl font-bold text-gray-900 flex-1">{displayName}</h2>
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
              <Link href={`/evaluations/new?candidateId=${candidate.id}`}
                className="text-base bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
                + マッチング評価
              </Link>
            </>
          )}
        </div>
      </div>

      {isNew && !editing && (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <p className="text-base text-green-700">AIがスキルシートを解析して自動保存しました。管理コードや名前を入力してください。</p>
          <button onClick={() => setEditing(true)} className="text-sm text-green-700 font-semibold underline ml-4">入力する</button>
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

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {editing ? (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">管理コード</label>
                <input {...f("candidateCode")} placeholder="例: A001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">年齢</label>
                <input {...f("age")} type="number" placeholder="例: 35"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">最寄駅</label>
                <input {...f("nearestStation")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">所属会社名</label>
                <input {...f("companyName")} placeholder="例: 株式会社〇〇"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">雇用形態・商流種別</label>
                <select
                  value={form?.commercialFlowType ?? ""}
                  onChange={(e) => setForm((prev) => prev ? { ...prev, commercialFlowType: e.target.value } : prev)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">選択してください</option>
                  <option value="正社員">正社員</option>
                  <option value="個人事業主">個人事業主</option>
                  <option value="SES">SES</option>
                  <option value="派遣">派遣</option>
                  <option value="契約社員">契約社員</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">商流（何社先）</label>
                <input {...f("commercialFlowDepth")} type="number" placeholder="例: 2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">稼働開始可能日</label>
                <input {...f("availableDate")} placeholder="例: 2026年4月1日"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">経験年数</label>
                <input {...f("experienceYears")} placeholder="例: 10年"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">主要スキル</label>
              <input {...f("mainSkills")} placeholder="例: Java, Spring Boot, Oracle"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">業界経験</label>
                <input {...f("industryExperience")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">工程経験</label>
                <input {...f("phaseExperience")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">強み</label>
              <textarea {...f("strengths")} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">サマリー</label>
              <textarea {...f("summary")} rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">希望条件</label>
                <textarea {...f("desiredConditions")} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">NG条件</label>
                <textarea {...f("ngConditions")} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-5">
              <InfoRow label="管理コード" value={candidate.candidateCode} />
              <InfoRow label="登録営業" value={candidate.salesUser.name} />
              <InfoRow label="所属会社名" value={candidate.companyName} />
              <InfoRow label="雇用形態・商流種別" value={candidate.commercialFlowType} />
              <InfoRow label="商流（何社先）" value={candidate.commercialFlowDepth ? `${candidate.commercialFlowDepth}社先` : null} />
              <InfoRow label="年齢" value={candidate.age ? `${candidate.age}歳` : null} />
              <InfoRow label="最寄駅" value={candidate.nearestStation} />
              <InfoRow label="稼働開始可能日" value={candidate.availableDate} highlight={!candidate.availableDate} />
              <InfoRow label="経験年数" value={candidate.experienceYears} highlight={!candidate.experienceYears} />
            </div>

            {candidate.mainSkills ? (
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-500 mb-2">主要スキル</p>
                <div className="flex flex-wrap gap-2">
                  {candidate.mainSkills.split(/[,、]/).map((s) => (
                    <span key={s} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{s.trim()}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-500 mb-1">主要スキル</p>
                <span className="text-sm text-amber-500 italic">未入力</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {candidate.industryExperience && <InfoRow label="業界経験" value={candidate.industryExperience} />}
              {candidate.phaseExperience && <InfoRow label="工程経験" value={candidate.phaseExperience} />}
            </div>

            {candidate.strengths && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-2">強み</p>
                <p className="text-base text-gray-700 leading-relaxed">{candidate.strengths}</p>
              </div>
            )}
            {candidate.summary && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-2">サマリー</p>
                <p className="text-base text-gray-700 leading-relaxed">{candidate.summary}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t border-gray-100">
              {candidate.desiredConditions && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">希望条件</p>
                  <p className="text-base text-gray-700 leading-relaxed">{candidate.desiredConditions}</p>
                </div>
              )}
              {candidate.ngConditions && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">NG条件</p>
                  <p className="text-base text-red-600 leading-relaxed">{candidate.ngConditions}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`text-base mt-0.5 ${highlight ? "text-amber-500 italic" : "text-gray-900"}`}>
        {value ?? <span className="text-amber-400 text-sm">未入力</span>}
      </dd>
    </div>
  );
}
