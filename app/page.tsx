"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AnalyzeRequest, AnalyzeResult } from "@/lib/types";

const initialForm: AnalyzeRequest = {
  companyName: "",
  question: "",
  essay: "",
  philosophy: "",
  persona: "",
  wordLimit: ""
};

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
        {label}
        {required ? <span className="rounded bg-mist px-2 py-0.5 text-xs text-skyline">必須</span> : null}
      </span>
      {children}
    </label>
  );
}

function statusClass(status: "対応済み" | "もう少し明確に" | "回答漏れ") {
  if (status === "対応済み") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "もう少し明確に") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function statusMark(status: "対応済み" | "もう少し明確に" | "回答漏れ") {
  if (status === "対応済み") return "✓";
  if (status === "もう少し明確に") return "!";
  return "×";
}

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentCount = useMemo(() => Array.from(form.essay.replace(/\s/g, "")).length, [form.essay]);

  function updateField<K extends keyof AnalyzeRequest>(key: K, value: AnalyzeRequest[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const missingItems = result?.coverage.filter((item) => item.status === "回答漏れ") ?? [];
  const unclearItems = result?.coverage.filter((item) => item.status === "もう少し明確に") ?? [];
  const firstFix = missingItems[0] ?? unclearItems[0] ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!form.companyName.trim() || !form.question.trim() || !form.essay.trim()) {
      setError("企業名、設問、ES本文を入力してください。");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "診断に失敗しました。入力内容を確認してください。");
        return;
      }

      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("診断中に問題が発生しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="pt-2 sm:pt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-skyline">Entry Sheet Review</p>
          <h1 className="mt-3 text-4xl font-bold text-navy sm:text-5xl">ES Adviser</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">あなたのES、回答漏れしていませんか？</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
            <div className="grid gap-5">
              <Field label="企業名" required>
                <input
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                  placeholder="例: 株式会社〇〇"
                />
              </Field>

              <Field label="設問" required>
                <textarea
                  value={form.question}
                  onChange={(event) => updateField("question", event.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                  placeholder="例: 学生時代に主体的に取り組み、工夫や試行錯誤を重ねた経験を教えてください"
                />
              </Field>

              <Field label="ES本文" required>
                <textarea
                  value={form.essay}
                  onChange={(event) => updateField("essay", event.target.value)}
                  rows={10}
                  className="w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                  placeholder="ここにES本文を入力してください"
                />
                <div className="mt-2 text-right text-sm text-slate-500">現在 {currentCount}字</div>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="企業理念">
                  <textarea
                    value={form.philosophy}
                    onChange={(event) => updateField("philosophy", event.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                    placeholder="例: 挑戦を通じて社会に価値を生み出す"
                  />
                </Field>

                <Field label="求める人物像">
                  <textarea
                    value={form.persona}
                    onChange={(event) => updateField("persona", event.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                    placeholder="例: 主体的に周囲を巻き込める人"
                  />
                </Field>
              </div>

              <Field label="文字数条件">
                <input
                  value={form.wordLimit}
                  onChange={(event) => updateField("wordLimit", event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-skyline focus:ring-4 focus:ring-blue-100"
                  placeholder="例: 300〜400字、400字以内"
                />
              </Field>

              {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-skyline px-5 py-3 font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? "診断中..." : "診断する"}
              </button>
            </div>
          </form>

          <aside className="rounded-lg border border-blue-100 bg-mist p-5 text-navy shadow-soft">
            <h2 className="text-lg font-bold">入力状況</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["企業名", form.companyName],
                ["設問", form.question],
                ["ES本文", form.essay],
                ["企業理念", form.philosophy],
                ["求める人物像", form.persona],
                ["文字数条件", form.wordLimit]
              ].map(([label, value]) => {
                const displayValue = value ?? "";

                return (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-blue-100 pb-3 text-sm last:border-b-0 last:pb-0">
                    <span className="text-slate-600">{label}</span>
                    <span className={`font-semibold ${displayValue.trim() ? "text-skyline" : "text-slate-400"}`}>
                      {displayValue.trim() ? "入力済み" : "未入力"}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </section>

        {result ? (
          <section id="result" className="grid gap-6 pb-10">
            <section
              className={`rounded-lg border p-5 shadow-soft ${
                missingItems.length
                  ? "border-red-200 bg-red-50"
                  : unclearItems.length
                    ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-600">提出前チェック結果</p>
                  <p className="mt-2 inline-flex rounded border border-white/70 bg-white px-3 py-1 text-sm font-semibold text-navy">
                    設問タイプ: {result.questionType}
                  </p>
                  <h2
                    className={`mt-1 text-4xl font-bold ${
                      missingItems.length ? "text-red-700" : unclearItems.length ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    回答漏れ {missingItems.length}件
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-700">
                  {missingItems.length
                    ? "提出前に修正推奨です。まず回答漏れの項目を一文で補いましょう。"
                    : unclearItems.length
                      ? "大きな回答漏れはありませんが、提出前に少し明確にしたい項目があります。"
                      : "設問への回答はおおむね揃っています。"}
                </p>
              </div>
              <div className="mt-5 rounded-lg border border-white/70 bg-white p-4">
                <p className="text-sm font-semibold text-navy">評価項目</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {result.coverage.map((item) => (
                    <div key={item.element} className={`flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm font-semibold ${statusClass(item.status)}`}>
                      <span>{item.element}</span>
                      <span>{statusMark(item.status)} {item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">回答漏れ一覧</h2>
              <div className="mt-4 grid gap-3">
                {missingItems.length ? (
                  missingItems.map((item) => (
                    <div key={item.element} className="rounded-md border border-red-200 bg-red-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold text-red-800">{item.element}</h3>
                        <span className="rounded border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-700">回答漏れ</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-red-800">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                    明確な回答漏れは見つかりませんでした。
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">まず直すべきこと</h2>
              {firstFix ? (
                <div className={`mt-4 rounded-md border p-4 ${statusClass(firstFix.status)}`}>
                  <h3 className="font-semibold">{firstFix.element}</h3>
                  <p className="mt-2 text-sm leading-6">{firstFix.reason}</p>
                </div>
              ) : (
                <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  まず大きく直すべき回答漏れはありません。仕上げの改善だけ確認しましょう。
                </p>
              )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">設問への回答状況</h2>
              <div className="mt-4 grid gap-3">
                {result.coverage.map((item) => (
                  <div key={item.element} className="flex flex-col gap-2 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{item.element}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-ink">根拠: </span>
                        {item.evidence}
                      </p>
                    </div>
                    <span className={`w-fit rounded border px-3 py-1 text-sm font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">追加すると良い一文</h2>
              <div className="mt-4 grid gap-3">
                {result.additionExamples.map((example) => (
                  <p key={example} className="rounded-md border border-blue-100 bg-mist px-4 py-3 text-sm leading-6 text-navy">
                    {example}
                  </p>
                ))}
              </div>
              <div className="mt-5 grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-slate-500">現在文字数</div>
                  <div className="mt-1 font-semibold text-ink">{result.wordCount.current}字</div>
                </div>
                <div>
                  <div className="text-slate-500">条件</div>
                  <div className="mt-1 font-semibold text-ink">{result.wordCount.condition ?? "未指定"}</div>
                </div>
                <div>
                  <div className="text-slate-500">差分</div>
                  <div className="mt-1 font-semibold text-ink">{result.wordCount.difference}</div>
                </div>
                <div>
                  <div className="text-slate-500">文字数評価</div>
                  <div className="mt-1 font-semibold text-ink">{result.wordCount.status}</div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">良かった点</h2>
              <ul className="mt-4 grid gap-3">
                {result.goodPoints.map((point) => (
                  <li key={point} className="rounded-md bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold text-navy">仕上げの改善</h2>
              <ol className="mt-4 grid gap-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={suggestion} className="flex gap-3 rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-skyline text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                この評価はAIによる参考診断です。実際の選考結果を保証するものではありません。
              </p>
              {result.usedFallback ? (
                <p className="mt-3 text-sm text-slate-500">OpenAI APIキー未設定または通信エラーのため、簡易診断で表示しています。</p>
              ) : null}
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
