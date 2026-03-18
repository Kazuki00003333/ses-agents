"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---- 型定義 ----
type InputMode = "text" | "select";

interface ProjectRecord { id: string; projectName: string; mustSkills: string | null; unitPrice: string | null; workLocation: string | null; participationPeriod: string | null; }
interface CandidateRecord { id: string; candidateName: string | null; candidateCode: string | null; mainSkills: string | null; experienceYears: string | null; availableDate: string | null; }

interface ProjectPanel {
  mode: InputMode;
  rawText: string;
  parsing: boolean;
  parseError: string;
  structured: Record<string, unknown> | null;
  selectedId: string;
}

interface CandidatePanel {
  mode: InputMode;
  rawText: string;
  parsing: boolean;
  parseError: string;
  structured: Record<string, unknown> | null;
  selectedId: string;
}

// ---- パネル準備判定 ----
function isProjectReady(p: ProjectPanel, projects: ProjectRecord[]): boolean {
  if (p.mode === "text") return p.structured !== null;
  return p.selectedId !== "" && projects.some((x) => x.id === p.selectedId);
}
function isCandidateReady(c: CandidatePanel, candidates: CandidateRecord[]): boolean {
  if (c.mode === "text") return c.structured !== null;
  return c.selectedId !== "" && candidates.some((x) => x.id === c.selectedId);
}

// ---- プレビュー行 ----
function PreviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-700 flex-1 line-clamp-2">{value}</span>
    </div>
  );
}

// ---- モード切り替えタブ ----
function ModeTab({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  return (
    <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
      {(["text", "select"] as InputMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
            mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {m === "text" ? "テキスト貼り付け" : "登録済みから選択"}
        </button>
      ))}
    </div>
  );
}

export default function NewEvaluationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<ProjectPanel>({
    mode: "select",
    rawText: "",
    parsing: false,
    parseError: "",
    structured: null,
    selectedId: searchParams.get("projectId") ?? "",
  });

  const [candidate, setCandidate] = useState<CandidatePanel>({
    mode: "select",
    rawText: "",
    parsing: false,
    parseError: "",
    structured: null,
    selectedId: searchParams.get("candidateId") ?? "",
  });

  const [evaluating, setEvaluating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [evalError, setEvalError] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [fileDetail, setFileDetail] = useState("");
  const [fileWarnings, setFileWarnings] = useState<string[]>([]);
  const candidateFileRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useSWR<ProjectRecord[]>("/api/projects", fetcher, { revalidateOnFocus: false });
  const { data: candidates = [] } = useSWR<CandidateRecord[]>("/api/candidates", fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    if (!evaluating) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [evaluating]);

  // 選択中のレコード
  const selectedProject = (projects as ProjectRecord[]).find((p) => p.id === project.selectedId) ?? null;
  const selectedCandidate = (candidates as CandidateRecord[]).find((c) => c.id === candidate.selectedId) ?? null;

  // 案件解析
  async function parseProject() {
    if (!project.rawText.trim()) return;
    setProject((p) => ({ ...p, parsing: true, parseError: "", structured: null }));
    try {
      const res = await fetch("/api/projects/structure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: project.rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "解析に失敗しました");
      setProject((p) => ({ ...p, structured: data.structured }));
    } catch (e) {
      setProject((p) => ({ ...p, parseError: e instanceof Error ? e.message : "エラー" }));
    } finally {
      setProject((p) => ({ ...p, parsing: false }));
    }
  }

  // 要員解析
  async function parseCandidate() {
    if (!candidate.rawText.trim()) return;
    setCandidate((c) => ({ ...c, parsing: true, parseError: "", structured: null }));
    try {
      const res = await fetch("/api/candidates/structure", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: candidate.rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "解析に失敗しました");
      setCandidate((c) => ({ ...c, structured: data.structured }));
    } catch (e) {
      setCandidate((c) => ({ ...c, parseError: e instanceof Error ? e.message : "エラー" }));
    } finally {
      setCandidate((c) => ({ ...c, parsing: false }));
    }
  }

  // スキルシートファイル読み込み
  async function handleCandidateFile(file: File) {
    setFileError("");
    setFileDetail("");
    setFileWarnings([]);
    setFileUploading(true);
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
      setCandidate((c) => ({ ...c, rawText: data.text, structured: null }));
      setFileWarnings(data.warnings ?? []);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "ファイルの読み取りに失敗しました");
    } finally {
      setFileUploading(false);
      if (candidateFileRef.current) candidateFileRef.current.value = "";
    }
  }

  // 評価実行
  async function handleEvaluate() {
    setEvaluating(true);
    setEvalError("");
    try {
      let projectId: string;
      let candidateId: string;

      // 案件 ID 取得（テキストモードなら保存してIDを得る）
      if (project.mode === "text" && project.structured) {
        const s = project.structured as Record<string, unknown>;
        const res = await fetch("/api/projects", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: (s.projectName as string) || "（案件名未設定）",
            projectSummary: s.projectSummary ?? null,
            mustSkills: s.mustSkills ?? null,
            niceToHaveSkills: s.niceToHaveSkills ?? null,
            commercialFlow: s.commercialFlow ? parseInt(s.commercialFlow as string) : null,
            participationPeriod: s.participationPeriod ?? null,
            unitPrice: s.unitPrice ?? null,
            paymentSite: s.paymentSite ?? null,
            workingHours: s.workingHours ?? null,
            workLocation: s.workLocation ?? null,
            remoteType: s.remoteType ?? null,
            interviewCount: s.interviewCount ?? null,
            settlementRange: s.settlementRange ?? null,
            foreignerAllowed: s.foreignerAllowed ?? null,
            ageLimit: s.ageLimit ?? null,
            otherInfo: s.otherInfo ?? null,
            structuredInputJson: s,
          }),
        });
        const saved = await res.json();
        if (!res.ok) throw new Error("案件の保存に失敗しました");
        projectId = saved.id;
      } else {
        projectId = project.selectedId;
      }

      // 要員 ID 取得
      if (candidate.mode === "text" && candidate.structured) {
        const s = candidate.structured as Record<string, unknown>;
        const res = await fetch("/api/candidates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateName: s.candidateName ?? null,
            age: s.age ? parseInt(s.age as string) : null,
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
          }),
        });
        const saved = await res.json();
        if (!res.ok) throw new Error("要員の保存に失敗しました");
        candidateId = saved.id;
      } else {
        candidateId = candidate.selectedId;
      }

      // マッチング評価
      const res = await fetch("/api/evaluations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, candidateId }),
      });
      if (!res.ok) throw new Error("評価に失敗しました");
      const data = await res.json();
      router.push(`/evaluations/${data.id}`);
    } catch (e) {
      setEvalError(e instanceof Error ? e.message : "エラーが発生しました");
      setEvaluating(false);
    }
  }

  const projectReady = isProjectReady(project, projects as ProjectRecord[]);
  const candidateReady = isCandidateReady(candidate, candidates as CandidateRecord[]);
  const canEvaluate = projectReady && candidateReady && !evaluating;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">マッチング評価</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* ===== 案件パネル ===== */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📋</span>
            <h3 className="text-base font-bold text-gray-900">案件情報</h3>
            {projectReady && <span className="ml-auto text-sm text-green-600 font-medium">✓ 準備完了</span>}
          </div>

          <ModeTab mode={project.mode} onChange={(m) => setProject((p) => ({ ...p, mode: m, structured: null, selectedId: "" }))} />

          {project.mode === "text" ? (
            <div className="space-y-3">
              <textarea
                value={project.rawText}
                onChange={(e) => setProject((p) => ({ ...p, rawText: e.target.value, structured: null }))}
                placeholder={`案件テキストを貼り付けてください。\n\n例：\n【案件名】金融系Javaシステム開発\n【必須スキル】Java, Spring Boot\n【単価】70〜80万円\n【期間】2026年4月〜長期\n【勤務地】東京都（週3リモート可）`}
                rows={8}
                disabled={project.parsing || evaluating}
                className="w-full text-base border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {project.parseError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{project.parseError}</p>
              )}
              <button
                onClick={parseProject}
                disabled={!project.rawText.trim() || project.parsing || evaluating}
                className="w-full flex items-center justify-center gap-2 border border-blue-500 text-blue-600 text-base py-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-medium transition-colors"
              >
                {project.parsing ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>AI解析中...</>
                ) : "AIで案件を解析する"}
              </button>
              {project.structured && (
                <div className="mt-2 bg-blue-50 rounded-lg p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-blue-700 mb-2">解析結果</p>
                  <PreviewRow label="案件名" value={project.structured.projectName as string} />
                  <PreviewRow label="必須スキル" value={project.structured.mustSkills as string} />
                  <PreviewRow label="単価" value={project.structured.unitPrice as string} />
                  <PreviewRow label="勤務地" value={project.structured.workLocation as string} />
                  <PreviewRow label="参画期間" value={project.structured.participationPeriod as string} />
                  <p className="text-xs text-blue-500 mt-2">※評価実行時に案件管理へ自動保存されます</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={project.selectedId}
                onChange={(e) => setProject((p) => ({ ...p, selectedId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={evaluating}
              >
                <option value="">案件を選択...</option>
                {(projects as ProjectRecord[]).map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
              {selectedProject && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-1.5">
                  <PreviewRow label="必須スキル" value={selectedProject.mustSkills} />
                  <PreviewRow label="単価" value={selectedProject.unitPrice} />
                  <PreviewRow label="勤務地" value={selectedProject.workLocation} />
                  <PreviewRow label="参画期間" value={selectedProject.participationPeriod} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== 要員パネル ===== */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">👤</span>
            <h3 className="text-base font-bold text-gray-900">要員情報</h3>
            {candidateReady && <span className="ml-auto text-sm text-green-600 font-medium">✓ 準備完了</span>}
          </div>

          <ModeTab mode={candidate.mode} onChange={(m) => setCandidate((c) => ({ ...c, mode: m, structured: null, selectedId: "" }))} />

          {candidate.mode === "text" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">スキルシートを貼り付け、またはファイルから読み込み</span>
                <button
                  onClick={() => candidateFileRef.current?.click()}
                  disabled={fileUploading || candidate.parsing || evaluating}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {fileUploading ? (
                    <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>読み込み中...</>
                  ) : (
                    <>📄 ファイルから読み込む</>
                  )}
                </button>
                <input
                  ref={candidateFileRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCandidateFile(f);
                  }}
                />
              </div>
              {fileError && (
                <div className="text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-red-600 font-medium">{fileError}</p>
                  {fileDetail && <p className="text-red-500 mt-0.5 whitespace-pre-line">{fileDetail}</p>}
                </div>
              )}
              {fileWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 space-y-0.5">
                  {fileWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-700">⚠ {w}</p>
                  ))}
                </div>
              )}
              <textarea
                value={candidate.rawText}
                onChange={(e) => setCandidate((c) => ({ ...c, rawText: e.target.value, structured: null }))}
                placeholder={`スキルシートや紹介文を貼り付けてください。\n\n例：\nJava10年以上のベテランSE。\n金融系・製造業の開発経験豊富。\n主要スキル：Java, Spring Boot, AWS\n経験年数：12年\n稼働可能日：2026年4月\n希望単価：75万以上、週2リモート希望`}
                rows={8}
                disabled={candidate.parsing || evaluating || fileUploading}
                className="w-full text-base border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {candidate.parseError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{candidate.parseError}</p>
              )}
              <button
                onClick={parseCandidate}
                disabled={!candidate.rawText.trim() || candidate.parsing || evaluating}
                className="w-full flex items-center justify-center gap-2 border border-green-500 text-green-600 text-base py-2.5 rounded-lg hover:bg-green-50 disabled:opacity-50 font-medium transition-colors"
              >
                {candidate.parsing ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>AI解析中...</>
                ) : "AIで要員を解析する"}
              </button>
              {candidate.structured && (
                <div className="mt-2 bg-green-50 rounded-lg p-4 space-y-1.5">
                  <p className="text-sm font-semibold text-green-700 mb-2">解析結果</p>
                  <PreviewRow label="候補者名" value={candidate.structured.candidateName as string} />
                  <PreviewRow label="主要スキル" value={candidate.structured.mainSkills as string} />
                  <PreviewRow label="経験年数" value={candidate.structured.experienceYears as string} />
                  <PreviewRow label="稼働開始" value={candidate.structured.availableDate as string} />
                  <PreviewRow label="希望条件" value={candidate.structured.desiredConditions as string} />
                  <p className="text-xs text-green-500 mt-2">※評価実行時に候補者管理へ自動保存されます</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={candidate.selectedId}
                onChange={(e) => setCandidate((c) => ({ ...c, selectedId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={evaluating}
              >
                <option value="">候補者を選択...</option>
                {(candidates as CandidateRecord[]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.candidateName ?? c.candidateCode ?? "匿名"}
                    {c.candidateCode && c.candidateName ? ` (${c.candidateCode})` : ""}
                  </option>
                ))}
              </select>
              {selectedCandidate && (
                <div className="bg-green-50 rounded-lg p-4 space-y-1.5">
                  <PreviewRow label="主要スキル" value={selectedCandidate.mainSkills} />
                  <PreviewRow label="経験年数" value={selectedCandidate.experienceYears} />
                  <PreviewRow label="稼働開始" value={selectedCandidate.availableDate} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 実行エリア ===== */}
      {evalError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <p className="text-base text-red-600">{evalError}</p>
        </div>
      )}

      {evaluating && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <svg className="animate-spin w-5 h-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-base font-medium text-blue-700">AIがマッチングを評価しています... {elapsed}秒経過</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((elapsed / 60) * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleEvaluate}
          disabled={!canEvaluate}
          className={`flex-1 py-4 rounded-xl text-base font-bold transition-all ${
            canEvaluate
              ? "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {evaluating ? "AI評価中..." : canEvaluate ? "マッチング評価を実行する →" : "案件と要員の両方を準備してください"}
        </button>
        {(projectReady || candidateReady) && (
          <div className="flex gap-2 text-sm text-gray-400">
            <span className={projectReady ? "text-green-600" : "text-gray-300"}>案件 {projectReady ? "✓" : "○"}</span>
            <span>×</span>
            <span className={candidateReady ? "text-green-600" : "text-gray-300"}>要員 {candidateReady ? "✓" : "○"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
