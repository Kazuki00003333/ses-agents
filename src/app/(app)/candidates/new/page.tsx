"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type InputMode = "text" | "file";

export default function NewCandidatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [skillSheetText, setSkillSheetText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  // ファイルアップロード state
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedText, setParsedText] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const [fileDetail, setFileDetail] = useState("");

  async function handleFileSelect(file: File) {
    setUploadedFile(file);
    setError("");
    setFileDetail("");
    setFileWarnings([]);
    setParsedText("");
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/candidates/parse-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setFileDetail(data.detail ?? "");
        throw new Error(data.error ?? "ファイルの読み取りに失敗しました");
      }
      setParsedText(data.text);
      setTruncated(data.truncated ?? false);
      setFileWarnings(data.warnings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ファイルの読み取りに失敗しました");
      setUploadedFile(null);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleAnalyze() {
    const rawText = buildRawText();
    if (!rawText.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const structRes = await fetch("/api/candidates/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const structData = await structRes.json();
      if (!structRes.ok) throw new Error(structData.error ?? "AI解析に失敗しました");

      const s = structData.structured;

      const saveRes = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: s.candidateName ?? null,
          age: s.age ? parseInt(s.age) : null,
          nearestStation: s.nearestStation ?? null,
          availableDate: s.availableDate ?? null,
          experienceYears: s.experienceYears ?? null,
          mainSkills: s.mainSkills ?? null,
          industryExperience: s.industryExperience ?? null,
          phaseExperience: s.phaseExperience ?? null,
          strengths: s.strengths ?? null,
          desiredConditions: s.desiredConditions ?? null,
          ngConditions: s.ngConditions ?? null,
          summary: s.summary ?? null,
          skillSheetText: (inputMode === "text" ? skillSheetText : parsedText) || null,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error("保存に失敗しました");

      router.push(`/candidates/${saved.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setAnalyzing(false);
    }
  }

  function buildRawText(): string {
    if (inputMode === "file") {
      const parts = [
        parsedText.trim() && `【スキルシート】\n${parsedText.trim()}`,
        summaryText.trim() && `【サマリー】\n${summaryText.trim()}`,
      ].filter(Boolean);
      return parts.join("\n\n");
    }
    const parts = [
      skillSheetText.trim() && `【スキルシート】\n${skillSheetText.trim()}`,
      summaryText.trim() && `【サマリー】\n${summaryText.trim()}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  }

  const hasInput = inputMode === "text"
    ? skillSheetText.trim() || summaryText.trim()
    : parsedText.trim() || summaryText.trim();

  const FILE_ACCEPT = ".pdf,.docx,.xlsx,.xls";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/candidates" className="text-base text-gray-400 hover:text-gray-600">
          ← 戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">候補者登録</h2>
      </div>

      {/* 入力モード切り替え */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setInputMode("text")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            inputMode === "text"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          テキスト貼り付け
        </button>
        <button
          onClick={() => setInputMode("file")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            inputMode === "file"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ファイルアップロード
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

        {inputMode === "text" ? (
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              スキルシート
              <span className="ml-2 text-xs text-gray-400 font-normal">（WordやPDFの内容をコピー&ペースト）</span>
            </label>
            <textarea
              value={skillSheetText}
              onChange={(e) => setSkillSheetText(e.target.value)}
              placeholder={`スキルシートの内容をそのまま貼り付けてください。\n\n例：\n氏名：田中 太郎（非公開可）\n年齢：35歳　最寄駅：新宿駅\n稼働可能日：2026年4月1日\n経験年数：10年\n\n【スキル】Java / Spring Boot / Oracle / Docker / AWS\n【業界】金融、保険、製造業\n【工程】要件定義〜本番リリースまで\n【資格】AWS認定ソリューションアーキテクト...`}
              rows={8}
              disabled={analyzing}
              className="w-full text-base border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              経歴書ファイル
              <span className="ml-2 text-xs text-gray-400 font-normal">PDF・Word (.docx)・Excel (.xlsx) 対応　最大10MB</span>
            </label>

            {!uploadedFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="text-3xl mb-2">📄</div>
                <p className="text-base font-medium text-gray-700">ファイルをドロップ、またはクリックして選択</p>
                <p className="text-sm text-gray-400 mt-1">PDF・Word (.docx)・Excel (.xlsx)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={FILE_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4">
                {parsing ? (
                  <div className="flex items-center gap-3 text-base text-gray-600">
                    <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    ファイルを読み取り中...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {uploadedFile.name.endsWith(".pdf") ? "📕" :
                           uploadedFile.name.endsWith(".docx") || uploadedFile.name.endsWith(".doc") ? "📘" : "📗"}
                        </span>
                        <div>
                          <p className="text-base font-medium text-gray-800">{uploadedFile.name}</p>
                          <p className="text-sm text-gray-400">
                            {(uploadedFile.size / 1024).toFixed(0)} KB
                            {truncated && " · 8,000文字で切り捨て"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          setParsedText("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                      >
                        変更
                      </button>
                    </div>
                    {parsedText && (
                      <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <p className="text-xs text-gray-500 mb-1">抽出テキスト（プレビュー）</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {parsedText.slice(0, 400)}{parsedText.length > 400 && "..."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 pt-5">
          <label className="block text-sm font-medium text-gray-800 mb-1">
            サマリー
            <span className="ml-2 text-xs text-gray-400 font-normal">（営業からの紹介文・推薦コメントなど）</span>
          </label>
          <textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            placeholder={`例：\nJava10年以上のベテランエンジニア。金融系の大規模システム開発を複数経験しており、\nSpring Bootを使ったマイクロサービス化の実績もあり。\nチームリードの経験もあり、上流からも対応可能。\n単価70万以上、週2リモート以上希望。5月参画可能。`}
            rows={4}
            disabled={analyzing}
            className="w-full text-base border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && (
          <div className="text-base text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="font-medium">{error}</p>
            {fileDetail && <p className="text-sm mt-1 whitespace-pre-line text-red-500">{fileDetail}</p>}
          </div>
        )}
        {fileWarnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 space-y-1">
            {fileWarnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-700">⚠ {w}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !hasInput || parsing}
            className="flex items-center gap-2 bg-blue-600 text-white text-base px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {analyzing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                AI解析・自動保存中...
              </>
            ) : (
              "AIで解析して保存 →"
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">
        AIが解析後、詳細画面に自動遷移します。管理コードや名前の修正は詳細画面から行えます。
      </p>
    </div>
  );
}
