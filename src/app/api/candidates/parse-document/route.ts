import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_TEXT_LENGTH = 30; // これ以下はコンテンツ不足と判定

// 対応拡張子
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".xls"];

type ParseResult =
  | { ok: true; text: string; truncated: boolean; warnings: string[] }
  | { ok: false; code: "unsupported" | "image_pdf" | "empty" | "corrupt" | "encrypted" | "old_format"; message: string };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "フォームデータの読み取りに失敗しました" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  const ext = SUPPORTED_EXTENSIONS.find((e) => fileName.endsWith(e));

  if (!ext) {
    return NextResponse.json(
      {
        error: "対応していないファイル形式です",
        detail: `対応形式: PDF (.pdf)、Word (.docx)、Excel (.xlsx/.xls)\n.doc（旧Word形式）は非対応です。Wordで「名前を付けて保存」→「.docx」に変換してください。`,
        code: "unsupported",
      },
      { status: 400 }
    );
  }

  if (ext === ".doc" || fileName.endsWith(".doc")) {
    return NextResponse.json(
      {
        error: ".doc（旧Word形式）は対応していません",
        detail: "Wordで開き「名前を付けて保存」→「Word文書(.docx)」として保存し直してください。",
        code: "old_format",
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseFile(buffer, ext);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: 422 }
      );
    }

    const { text, truncated, warnings } = result;
    return NextResponse.json({ text, truncated, warnings, charCount: text.length });
  } catch (err) {
    console.error("Document parse error:", err);
    const errMsg = err instanceof Error ? err.message : "";

    // PDFパスワード保護の検出
    if (errMsg.includes("password") || errMsg.includes("encrypted")) {
      return NextResponse.json(
        {
          error: "パスワード保護されたPDFは読み取れません",
          detail: "パスワードを解除してから再度アップロードしてください。",
          code: "encrypted",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: "ファイルの解析に失敗しました。ファイルが破損している可能性があります。", code: "corrupt" },
      { status: 500 }
    );
  }
}

async function parseFile(buffer: Buffer, ext: string): Promise<ParseResult> {
  const warnings: string[] = [];
  let rawText = "";

  if (ext === ".pdf") {
    rawText = await parsePdf(buffer, warnings);
  } else if (ext === ".docx") {
    rawText = await parseDocx(buffer, warnings);
  } else {
    // .xlsx / .xls
    rawText = await parseExcel(buffer, warnings);
  }

  // テキスト量が極端に少ない場合の判定
  const cleaned = rawText.replace(/\s+/g, " ").trim();

  if (cleaned.length < MIN_TEXT_LENGTH) {
    if (ext === ".pdf") {
      return {
        ok: false,
        code: "image_pdf",
        message:
          "PDFからテキストを抽出できませんでした。\nスキャンした画像PDFや、テキストが画像として埋め込まれたPDFは読み取れません。\nWordなどのテキストベースの形式か、内容をコピー＆ペーストしてください。",
      };
    }
    return {
      ok: false,
      code: "empty",
      message: "ファイルからテキストを抽出できませんでした。ファイルの内容を確認してください。",
    };
  }

  // チェックボックス・フォームフィールドの警告
  if (ext === ".pdf" || ext === ".docx") {
    // チェックボックスが多そうな場合は警告
    const hasCheckboxKeywords = /チェック|確認|□|☐|☑|レ点|✓/.test(rawText);
    if (hasCheckboxKeywords) {
      warnings.push(
        "チェックボックスの状態（チェック済み/未チェック）はファイルから読み取れません。該当箇所はAI解析の対象外になります。"
      );
    }
  }

  // 20000文字でトランケート（Gemini 2.5 Flashは1Mトークン対応のため余裕あり）
  const MAX_CHARS = 20000;
  const truncated = cleaned.length > MAX_CHARS;
  const text = truncated ? cleaned.slice(0, MAX_CHARS) + "\n\n[以降省略]" : cleaned;

  return { ok: true, text, truncated, warnings };
}

async function parsePdf(buffer: Buffer, warnings: string[]): Promise<string> {
  // pdf-parse v1: index.jsはモジュール初期化時にテストPDFをfsで読もうとしてNext.jsでクラッシュする既知問題がある
  // lib/pdf-parse.js を直接参照することで回避する
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  try {
    const data = await pdfParse(buffer);
    return data.text ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // パスワード保護の再スロー
    if (msg.includes("password") || msg.includes("encrypted") || msg.includes("Password")) {
      throw err;
    }
    // その他のPDFエラーは空文字を返してimage_pdf判定に任せる
    warnings.push("PDFの一部が読み取れませんでした。");
    return "";
  }
}

async function parseDocx(buffer: Buffer, _warnings: string[]): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  // mammothの警告メッセージ
  if (result.messages && result.messages.length > 0) {
    const hasUnsupported = result.messages.some(
      (m) => m.type === "warning" && m.message.includes("not supported")
    );
    if (hasUnsupported) {
      _warnings.push("一部のWord書式（図・表・特殊文字など）は読み取れていない可能性があります。");
    }
  }

  return result.value ?? "";
}

async function parseExcel(buffer: Buffer, _warnings: string[]): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    // sheet_to_json でヘッダー付きの行データとして取得（表構造を保持）
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) continue;

    // ヘッダー行（キー）を取得
    const headers = Object.keys(rows[0]);
    const hasHeaders = headers.some((h) => !/^__EMPTY/.test(h));

    let sheetText: string;

    if (hasHeaders && rows.length <= 50) {
      // ヘッダーがある表形式（スキル一覧・職務経歴など）→ 各行を「ヘッダー: 値」形式に
      sheetText = rows
        .map((row) =>
          headers
            .map((h) => {
              const val = String(row[h] ?? "").trim();
              return val ? `${h}: ${val}` : "";
            })
            .filter(Boolean)
            .join(" / ")
        )
        .filter((line) => line.length > 0)
        .join("\n");
    } else {
      // ヘッダーなし or 行数が多い場合はCSVにフォールバック
      sheetText = XLSX.utils.sheet_to_csv(sheet)
        .split("\n")
        .filter((line) => line.replace(/,/g, "").trim().length > 0)
        .join("\n");
    }

    if (sheetText.trim()) {
      sections.push(`=== シート: ${sheetName} ===\n${sheetText}`);
    }
  }

  if (sections.length === 0) return "";

  _warnings.push(
    "Excelファイルを読み込みました。セルの書式・色・チェックボックスは読み取れません。テキスト内容のみが対象です。"
  );

  return sections.join("\n\n");
}
