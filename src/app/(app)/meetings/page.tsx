"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type MeetingType = "first_contact" | "needs_hearing" | "project_proposal" | "follow_up" | "closing" | "other";

interface Meeting {
  id: string;
  companyName: string | null;
  contactName: string | null;
  meetingType: MeetingType | null;
  meetingPurpose: string | null;
  meetingDate: string | null;
  aiQualityScore: number | null;
  aiQualityLabel: string | null;
  status: string;
  createdAt: string;
  salesUser: { id: string; name: string };
}

const MEETING_TYPE_LABELS: Record<MeetingType, { label: string; color: string }> = {
  first_contact:    { label: "初回接触",    color: "bg-gray-100 text-gray-600" },
  needs_hearing:    { label: "ニーズヒア",  color: "bg-blue-100 text-blue-700" },
  project_proposal: { label: "案件提案",    color: "bg-green-100 text-green-700" },
  follow_up:        { label: "フォロー",    color: "bg-yellow-100 text-yellow-700" },
  closing:          { label: "クロージング", color: "bg-purple-100 text-purple-700" },
  other:            { label: "その他",      color: "bg-gray-100 text-gray-500" },
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

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meetings")
      .then((r) => r.json())
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">商談管理</h2>
        <Link href="/meetings/new"
          className="text-base bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          + 商談登録
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-base text-gray-400 mb-4">商談がまだ登録されていません</p>
          <Link href="/meetings/new"
            className="text-base text-blue-600 hover:underline font-medium">
            最初の商談を登録する →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-500" scope="col">会社名</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">担当者</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">タイプ</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">商談日</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">品質スコア</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">営業</th>
                <th className="text-left py-3.5 px-4 text-sm font-semibold text-gray-500" scope="col">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meetings.map((m) => {
                const typeInfo = m.meetingType ? MEETING_TYPE_LABELS[m.meetingType] : null;
                const qualityColor = m.aiQualityLabel ? QUALITY_COLORS[m.aiQualityLabel] ?? "" : "";
                const qualityLabel = m.aiQualityLabel ? QUALITY_LABELS[m.aiQualityLabel] ?? m.aiQualityLabel : "";
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-5">
                      <Link href={`/meetings/${m.id}`} className="text-base text-gray-800 font-medium hover:text-blue-600 hover:underline">
                        {m.companyName ?? "（未設定）"}
                      </Link>
                      {m.meetingPurpose && (
                        <p className="text-sm text-gray-400 truncate max-w-xs">{m.meetingPurpose}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-base text-gray-700">{m.contactName ?? "—"}</td>
                    <td className="py-3.5 px-4">
                      {typeInfo ? (
                        <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-base text-gray-700">
                      {m.meetingDate ? m.meetingDate.split("T")[0] : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.aiQualityScore != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-gray-800">{m.aiQualityScore}</span>
                          <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${qualityColor}`}>
                            {qualityLabel}
                          </span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-base text-gray-600">{m.salesUser.name}</td>
                    <td className="py-3.5 px-4 text-sm text-gray-400">
                      {new Date(m.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
