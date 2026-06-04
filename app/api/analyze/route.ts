import { NextResponse } from "next/server";
import { fallbackAnalyze } from "@/lib/analyze";
import type { AnalyzeRequest, AnalyzeResult } from "@/lib/types";

export const runtime = "nodejs";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionType: {
      type: "string",
      enum: ["ガクチカ系", "自己PR系", "志望動機系", "改善提案系", "理由説明系", "将来像系", "一般設問"]
    },
    overallScore: { type: "number" },
    questionFitScore: { type: "number" },
    philosophyFitScore: { type: "number" },
    questionCriteria: { type: "array", items: { type: "string" } },
    philosophyCriteria: { type: "array", items: { type: "string" } },
    coverage: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          element: { type: "string" },
          status: { type: "string", enum: ["対応済み", "もう少し明確に", "回答漏れ"] },
          score: { type: "number" },
          evidence: { type: "string" },
          reason: { type: "string" },
          note: { type: "string" }
        },
        required: ["element", "status", "score", "evidence", "reason", "note"]
      }
    },
    wordCount: {
      type: "object",
      additionalProperties: false,
      properties: {
        current: { type: "number" },
        condition: { type: ["string", "null"] },
        difference: { type: "string" },
        status: { type: "string" }
      },
      required: ["current", "condition", "difference", "status"]
    },
    additionExamples: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
    goodPoints: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
    suggestions: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
    summary: { type: "string" }
  },
  required: [
    "overallScore",
    "questionType",
    "questionFitScore",
    "philosophyFitScore",
    "questionCriteria",
    "philosophyCriteria",
    "coverage",
    "wordCount",
    "additionExamples",
    "goodPoints",
    "suggestions",
    "summary"
  ]
};

function isValidInput(input: Partial<AnalyzeRequest>) {
  return Boolean(input.companyName?.trim() && input.question?.trim() && input.essay?.trim());
}

function isAllowedCriterion(element: string, question: string) {
  const guards: Record<string, RegExp> = {
    将来像: /将来|キャリア|入社後|今後|実現したい|目標/,
    志望動機: /志望|動機|理由|なぜ|興味|関心/,
    キャリア: /キャリア|将来|入社後/,
    入社後: /入社後|入社して|入社したら/
  };
  const guard = guards[element];
  return !guard || guard.test(question);
}

function normalizeResult(result: AnalyzeResult, input: AnalyzeRequest): AnalyzeResult {
  const local = fallbackAnalyze(input);
  const allowedElements = new Set(local.questionCriteria);
  const coverage = result.coverage
    .filter((item) => isAllowedCriterion(item.element, input.question) && allowedElements.has(item.element))
    .map((item) => ({
      ...item,
      score: Math.max(0, Math.min(100, Math.round(item.score ?? (item.status === "対応済み" ? 80 : 20)))),
      status: (item.status as string) === "不足" ? "回答漏れ" : item.status,
      evidence: item.evidence || "明確な根拠表現は検出できませんでした",
      reason: item.reason || item.note || "本文との対応関係を確認しました。"
    }));
  const normalizedCoverage = coverage.length ? coverage : local.coverage;
  const questionFitScore = normalizedCoverage.length
    ? Math.round(normalizedCoverage.reduce((sum, item) => sum + item.score, 0) / normalizedCoverage.length)
    : local.questionFitScore;
  const overallScore = Math.round((questionFitScore * 0.75) + ((input.philosophy?.trim() ? (result.philosophyFitScore ?? local.philosophyFitScore ?? questionFitScore) : questionFitScore) * 0.15) + 10);

  return {
    ...result,
    questionType: local.questionType,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    questionFitScore: Math.max(0, Math.min(100, questionFitScore)),
    philosophyFitScore: input.philosophy?.trim()
      ? Math.max(0, Math.min(100, Math.round(result.philosophyFitScore ?? 0)))
      : undefined,
    questionCriteria: local.questionCriteria,
    coverage: normalizedCoverage,
    additionExamples: result.additionExamples?.length ? result.additionExamples : local.additionExamples,
    goodPoints: result.goodPoints?.length ? result.goodPoints : local.goodPoints,
    usedFallback: result.usedFallback ?? false
  };
}

export async function POST(request: Request) {
  const input = (await request.json()) as AnalyzeRequest;

  if (!isValidInput(input)) {
    return NextResponse.json({ error: "企業名、設問、ES本文を入力してください。" }, { status: 400 });
  }

  const localResult = fallbackAnalyze(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(localResult);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-nano",
        instructions:
          "あなたは就活初心者向けES診断サービスの分析AIです。合否予測や断定的評価は避け、設問への回答漏れ、企業理念との接点、求められる要素の不足をやさしい表現で可視化してください。",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  task: "ES診断",
                  rules: [
                    "最初に設問タイプを判定する。タイプは、ガクチカ系、自己PR系、志望動機系、改善提案系、理由説明系、将来像系、一般設問のいずれかにする",
                    "設問タイプごとの評価項目で回答漏れを判定する",
                    "ガクチカ系は、経験、具体的内容、工夫、成果、学びを見る",
                    "自己PR系は、強み、具体エピソード、行動、成果、再現性を見る",
                    "志望動機系は、興味関心、企業理解、接点、理由、将来像を見る",
                    "改善提案系は、課題発見、根拠、提案内容、期待効果を見る",
                    "理由説明系は、対象、理由、具体例、感想・価値観を見る。このタイプでは経験、成果、学びを必須にしない",
                    "理由説明系では、魅力を感じた、面白いと思った、興味を持った、印象的だった、良いと思った、感動した、共感した、心に残った、惹かれた、好きだった等を理由候補として扱う",
                    "理由説明系では、テンポ感、世界観、背景描写、演出、構成、キャラクター、読後感など作品評価の名詞がある場合も理由要素として扱う",
                    "理由説明系の理由は、明確な理由があれば対応済み、理由はあるが抽象的ならもう少し明確に、好き・面白い等の結論だけなら回答漏れにする",
                    "感想・価値観のevidenceは作品名や対象名ではなく、魅力を感じた、面白いと思った、印象的だった、共感した等の感情・評価表現を優先する",
                    "将来像系は、目標、理由、行動、実現方法を見る",
                    "設問文に存在しない観点を追加しない。将来像、志望動機、キャリア、入社後は設問にその語や同義表現が含まれる場合のみ使う",
                    "企業理念がある場合は理念から評価項目を抽出する",
                    "設問の複数要素それぞれにESが回答できているか判定する",
                    "statusは必ず、対応済み、もう少し明確に、回答漏れ、の3段階で返す。数値評価をユーザーに見せる前提にしない",
                    "coverageのscoreには各評価項目の充足度を0から100で入れ、noteにその理由を短く書く",
                    "coverageのevidenceには本文から検出した根拠表現を短く抜き出す。見つからない場合は明確な根拠表現は検出できませんでしたと書く",
                    "coverageのreasonには対応済みの理由、または不足理由を具体的に書く",
                    "学びは、学んだ、気づいた、大切だと感じた、意識するようになった、理解した、実感した、得られた、身についた、視点を持つようになった等の文脈も評価する",
                    "goodPointsには良かった点を2から5個、具体的で前向きな表現で入れる",
                    "additionExamplesにはユーザーがそのまま追記しやすい一文例を1から3個入れる",
                    "改善提案は3から5個、厳しくない口調にする",
                    "文字数は日本語の空白を除いた文字数で評価する"
                  ],
                  input,
                  localWordCount: localResult.wordCount.current
                })
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "es_adviser_analysis",
            strict: true,
            schema: responseSchema
          },
          verbosity: "low"
        },
        max_output_tokens: 1800
      })
    });

    if (!response.ok) {
      return NextResponse.json(localResult);
    }

    const data = await response.json();
    const outputText = data.output_text ?? data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).find((item: { text?: string }) => item.text)?.text;
    const parsed = JSON.parse(outputText) as AnalyzeResult;

    return NextResponse.json(normalizeResult({ ...parsed, usedFallback: false }, input));
  } catch {
    return NextResponse.json(localResult);
  }
}
