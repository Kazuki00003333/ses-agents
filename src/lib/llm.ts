import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  feature?: string,
  relatedId?: string
): Promise<string> {
  const start = Date.now();
  let rawOutput = "";
  let success = true;
  let errorMessage: string | undefined;

  try {
    rawOutput = await callGemini(systemPrompt, userMessage);
    return rawOutput;
  } catch (e) {
    success = false;
    errorMessage = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const latencyMs = Date.now() - start;
    try {
      await prisma.aiLog.create({
        data: {
          feature: feature ?? "unknown",
          model: MODEL,
          systemPrompt,
          userInput: userMessage,
          rawOutput,
          latencyMs,
          success,
          errorMessage: errorMessage ?? null,
          relatedId: relatedId ?? null,
        },
      });
    } catch {
      // ログ書き込み失敗は無視
    }
  }
}

export async function callLLMJson<T>(
  systemPrompt: string,
  userMessage: string,
  feature?: string,
  relatedId?: string
): Promise<T> {
  const start = Date.now();
  let rawOutput = "";
  let parsedOutput: unknown;
  let success = true;
  let errorMessage: string | undefined;

  try {
    rawOutput = await callGemini(systemPrompt, userMessage);

    const jsonMatch = rawOutput.match(/```json\n?([\s\S]*?)\n?```/) ||
      rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("LLM response does not contain valid JSON");
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    parsedOutput = JSON.parse(jsonStr);
    return parsedOutput as T;
  } catch (e) {
    success = false;
    errorMessage = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const latencyMs = Date.now() - start;
    try {
      await prisma.aiLog.create({
        data: {
          feature: feature ?? "unknown",
          model: MODEL,
          systemPrompt,
          userInput: userMessage,
          rawOutput,
          parsedOutput: parsedOutput as any ?? null,
          latencyMs,
          success,
          errorMessage: errorMessage ?? null,
          relatedId: relatedId ?? null,
        },
      });
    } catch {
      // ログ書き込み失敗は無視
    }
  }
}
