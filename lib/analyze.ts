import type { AnalyzeRequest, AnalyzeResult, CoverageItem, WordCountEvaluation } from "./types";

type CriterionRule = {
  pattern: RegExp;
  label: string;
  keywords: string[];
  evidencePatterns?: RegExp[];
};

const QUESTION_RULES: CriterionRule[] = [
  { pattern: /強み|自己PR|PR/g, label: "アピールしたい強み", keywords: ["強み", "得意", "持ち味", "私の"] },
  { pattern: /主体|自ら|率先|リーダー|主導/g, label: "主体性", keywords: ["主体", "自ら", "率先", "主導", "提案", "行動"] },
  { pattern: /具体|内容|詳細|詳しく/g, label: "具体的内容", keywords: ["具体", "内容", "例えば", "場面", "状況", "取り組", "資料", "アンケート", "説明", "分析", "ライブ", "映像"] },
  { pattern: /工夫|改善|創意|アイデア|提案/g, label: "工夫", keywords: ["工夫", "改善", "考え", "提案", "変更", "試し", "分析", "重ね"] },
  { pattern: /試行錯誤|困難|課題|壁|失敗|乗り越/g, label: "試行錯誤", keywords: ["試行錯誤", "課題", "困難", "失敗", "改善", "乗り越", "振り返り"] },
  { pattern: /成果|結果|実績|達成|効果|貢献/g, label: "成果", keywords: ["成果", "結果", "達成", "向上", "増加", "貢献", "評価", "成功", "満足度"] },
  { pattern: /経験|取り組|活動|エピソード/g, label: "経験", keywords: ["経験", "取り組", "活動", "実施", "行った", "参加", "分析", "発見", "改善"] },
  { pattern: /理由|志望|なぜ|興味|関心/g, label: "理由", keywords: ["理由", "なぜ", "志望", "興味", "惹か", "関心"] },
  {
    pattern: /学び|身につけ|成長|得た|活か|気づ|大切|理解|実感/g,
    label: "学び",
    keywords: ["学ん", "学び", "気づ", "大切", "意識", "理解", "実感", "得られ", "身につ", "視点", "振り返り"],
    evidencePatterns: [
      /[^。！？]*学ん[^。！？]*/g,
      /[^。！？]*学び[^。！？]*/g,
      /[^。！？]*気づ[^。！？]*/g,
      /[^。！？]*大切だと感じ[^。！？]*/g,
      /[^。！？]*意識するようにな[^。！？]*/g,
      /[^。！？]*理解し[^。！？]*/g,
      /[^。！？]*実感し[^。！？]*/g,
      /[^。！？]*得られ[^。！？]*/g,
      /[^。！？]*身につ[^。！？]*/g,
      /[^。！？]*視点を持つようにな[^。！？]*/g,
      /[^。！？]*振り返[^。！？]*/g
    ]
  },
  { pattern: /将来|キャリア|入社後|今後|実現したい|目標/g, label: "将来像", keywords: ["将来", "目標", "実現", "キャリア", "なりたい", "今後", "入社後"] },
  { pattern: /経験したい|挑戦したい|取り組みたい/g, label: "経験したいこと", keywords: ["経験したい", "取り組みたい", "挑戦したい", "関わりたい"] },
  { pattern: /身につけたい|習得したい|学びたい/g, label: "身につけたいこと", keywords: ["身につけたい", "習得したい", "学びたい", "獲得したい"] }
];

const PHILOSOPHY_RULES: CriterionRule[] = [
  { pattern: /挑戦|チャレンジ|変革/g, label: "挑戦性", keywords: ["挑戦", "チャレンジ", "新しい", "変革"] },
  { pattern: /価値|貢献|社会|顧客/g, label: "価値創出", keywords: ["価値", "貢献", "社会", "顧客", "役立"] },
  { pattern: /主体|自律|自ら/g, label: "主体性", keywords: ["主体", "自律", "自ら", "行動"] },
  { pattern: /誠実|信頼|倫理/g, label: "誠実性", keywords: ["誠実", "信頼", "責任", "真摯"] },
  { pattern: /協働|チーム|共創/g, label: "協働性", keywords: ["協働", "チーム", "周囲", "共創", "連携"] },
  { pattern: /成長|学習|進化/g, label: "成長意欲", keywords: ["成長", "学習", "努力", "吸収", "向上"] }
];

const DEFAULT_CRITERIA = ["設問への直接回答", "具体性", "行動と結果"];
const CRITERIA_ORDER = [
  "経験",
  "具体的内容",
  "アピールしたい強み",
  "理由",
  "主体性",
  "工夫",
  "試行錯誤",
  "成果",
  "学び",
  "経験したいこと",
  "身につけたいこと",
  "将来像"
];
const DEFAULT_KEYWORDS: Record<string, string[]> = {
  設問への直接回答: ["結論", "経験", "理由", "考え", "取り組"],
  具体性: ["具体", "例えば", "場面", "状況", "内容"],
  行動と結果: ["行動", "実施", "取り組", "結果", "成果"]
};

const FORBIDDEN_UNLESS_EXPLICIT: Record<string, RegExp> = {
  将来像: /将来|キャリア|入社後|今後|実現したい|目標/,
  理由: /理由|志望|なぜ|興味|関心/
};

export function countJapaneseCharacters(text: string) {
  return Array.from(text.replace(/\s/g, "")).length;
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function unique(items: string[]) {
  return [...new Set(items)].filter(Boolean);
}

function filterQuestionOnlyCriteria(criteria: string[], question: string) {
  return criteria.filter((label) => {
    const requiredPattern = FORBIDDEN_UNLESS_EXPLICIT[label];
    return !requiredPattern || requiredPattern.test(question);
  });
}

function extractCriteria(text: string, source: "question" | "philosophy") {
  const rules = source === "question" ? QUESTION_RULES : PHILOSOPHY_RULES;
  const extracted = rules.filter((item) => item.pattern.test(text)).map((item) => item.label);
  const refined = unique(extracted);

  if (source === "question" && /アピール|自己PR|強み|経験/.test(text)) {
    for (const label of ["経験", "具体的内容", "工夫", "成果", "学び"]) {
      if (!refined.includes(label)) refined.push(label);
    }
  }

  if (refined.includes("経験したいこと")) {
    const index = refined.indexOf("経験");
    if (index >= 0) refined.splice(index, 1);
  }

  if (refined.includes("身につけたいこと")) {
    const index = refined.indexOf("学び");
    if (index >= 0) refined.splice(index, 1);
  }

  const filtered = source === "question" ? filterQuestionOnlyCriteria(refined, text) : refined;

  return filtered
    .sort((a, b) => {
      const aIndex = CRITERIA_ORDER.includes(a) ? CRITERIA_ORDER.indexOf(a) : CRITERIA_ORDER.length;
      const bIndex = CRITERIA_ORDER.includes(b) ? CRITERIA_ORDER.indexOf(b) : CRITERIA_ORDER.length;
      return aIndex - bIndex;
    })
    .slice(0, 8);
}

function keywordsFor(label: string) {
  const rule = [...QUESTION_RULES, ...PHILOSOPHY_RULES].find((item) => item.label === label);
  return rule?.keywords ?? DEFAULT_KEYWORDS[label] ?? [label];
}

function sentences(text: string) {
  return text
    .split(/(?<=[。！？!?])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactEvidence(text: string) {
  const trimmed = text.replace(/\s+/g, "");
  if (trimmed.length <= 52) return trimmed;
  return `${trimmed.slice(0, 52)}...`;
}

function findEvidence(text: string, label: string) {
  const keywords = keywordsFor(label);
  const rule = [...QUESTION_RULES, ...PHILOSOPHY_RULES].find((item) => item.label === label);

  for (const pattern of rule?.evidencePatterns ?? []) {
    const match = text.match(pattern)?.[0];
    if (match) return compactEvidence(match);
  }

  const ranked = sentences(text)
    .map((sentence) => ({
      sentence,
      hits: keywords.filter((word) => sentence.includes(word)).length,
      hasNumber: /\d|％|%|倍|人|名|円|位|件/.test(sentence)
    }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => {
      const aBonus = a.hasNumber && label === "成果" ? 1 : 0;
      const bBonus = b.hasNumber && label === "成果" ? 1 : 0;
      return b.hits + bBonus - (a.hits + aBonus);
    });

  return ranked[0] ? compactEvidence(ranked[0].sentence) : "";
}

function scoreCriterion(text: string, label: string) {
  const keywords = keywordsFor(label);
  const evidence = findEvidence(text, label);
  const hits = keywords.filter((word) => text.includes(word)).length;
  const evidenceHits = evidence ? keywords.filter((word) => evidence.includes(word)).length : 0;
  const numericBonus = /\d|％|%|倍|人|名|円|位|件/.test(evidence || text) && label === "成果" ? 12 : 0;
  const reflectionBonus = label === "学び" && /学ん|気づ|大切|意識|理解|実感|得られ|身につ|視点|振り返/.test(text) ? 24 : 0;
  const actionBonus = ["工夫", "試行錯誤"].includes(label) && /改善|変更|分析|工夫|重ね|試し|振り返/.test(text) ? 14 : 0;
  const hasExplicitResult = /結果|成果|向上|成功|評価|達成|増加|満足度|貢献|効果|実績/.test(text);
  const resultBonus = label === "成果" && hasExplicitResult ? 16 : 0;
  const baseScore = evidenceHits >= 3 ? 78 : evidenceHits === 2 ? 66 : evidenceHits === 1 ? 48 : hits > 0 ? 34 : 0;
  const rawScore = clampScore(baseScore + numericBonus + reflectionBonus + actionBonus + resultBonus);
  const score = label === "成果" && !hasExplicitResult ? Math.min(rawScore, 38) : rawScore;

  return { score, evidence };
}

function includesIdea(text: string, label: string) {
  return scoreCriterion(text, label).score >= 45;
}

function statusFromScore(score: number): CoverageItem["status"] {
  if (score >= 75) return "対応済み";
  if (score >= 45) return "もう少し明確に";
  return "回答漏れ";
}

export function evaluateWordCount(essay: string, wordLimit?: string): WordCountEvaluation {
  const current = countJapaneseCharacters(essay);
  const condition = wordLimit?.trim();
  if (!condition) {
    return {
      current,
      condition: null,
      difference: "文字数条件は未指定です",
      status: "条件なし"
    };
  }

  const normalized = condition.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  const rangeMatch = normalized.match(/(\d+)\s*(?:〜|~|～|-|ー|－)\s*(\d+)\s*(?:字|文字)?/);

  if (rangeMatch) {
    const min = Math.min(Number(rangeMatch[1]), Number(rangeMatch[2]));
    const max = Math.max(Number(rangeMatch[1]), Number(rangeMatch[2]));
    if (current < min) {
      return { current, condition, difference: `下限まであと${min - current}字`, status: "不足" };
    }
    if (current > max) {
      return { current, condition, difference: `上限を${current - max}字超過`, status: "超過" };
    }
    return { current, condition, difference: "条件内", status: "条件内" };
  }

  const singleMatch = normalized.match(/(\d+)\s*(?:字|文字)?\s*(以内|以下|まで|以上|超|未満)?/);
  if (singleMatch) {
    const target = Number(singleMatch[1]);
    const operator = singleMatch[2] ?? "";
    if (/以内|以下|まで/.test(operator)) {
      return current <= target
        ? { current, condition, difference: "条件内", status: "条件内" }
        : { current, condition, difference: `${current - target}字超過`, status: "超過" };
    }
    if (/以上|超/.test(operator)) {
      return current >= target
        ? { current, condition, difference: "条件内", status: "条件内" }
        : { current, condition, difference: `下限まであと${target - current}字`, status: "不足" };
    }
    return {
      current,
      condition,
      difference: current === target ? "指定文字数と一致" : `指定文字数との差は${Math.abs(current - target)}字`,
      status: current === target ? "条件内" : "要調整"
    };
  }

  return {
    current,
    condition,
    difference: "条件を読み取れませんでした",
    status: "確認が必要"
  };
}

function scoreFromCoverage(items: CoverageItem[]) {
  if (!items.length) return 70;
  return clampScore(items.reduce((sum, item) => sum + item.score, 0) / items.length);
}

function relatedContext(text: string) {
  const found = [
    /課題|問題|困難/.test(text) ? "課題発見" : "",
    /改善|工夫|変更|分析/.test(text) ? "改善や工夫" : "",
    /振り返|気づ|学ん|実感|理解/.test(text) ? "振り返り" : "",
    /結果|成果|向上|達成|評価/.test(text) ? "成果" : ""
  ].filter(Boolean);

  return found.length ? `${found.join("、")}は記載されていますが、` : "";
}

function exampleForElement(element: string) {
  const examples: Record<string, string> = {
    経験: "「私は〇〇の活動で、△△に取り組みました。」",
    具体的内容: "「具体的には、〇〇という課題に対して△△を行いました。」",
    工夫: "「その際、〇〇を改善するために△△を工夫しました。」",
    試行錯誤: "「うまくいかなかった点を振り返り、〇〇を見直しました。」",
    成果: "「その結果、〇〇が改善され、△△につながりました。」",
    学び: "「この経験から、〇〇の大切さを学びました。」",
    理由: "「私がそう考える理由は、〇〇という経験があるからです。」",
    主体性: "「私は自ら〇〇を提案し、△△に取り組みました。」",
    経験したいこと: "「インターンでは、〇〇の業務を経験したいです。」",
    身につけたいこと: "「その経験を通じて、〇〇を身につけたいです。」",
    将来像: "「将来は、〇〇を通じて△△に貢献したいです。」"
  };

  return examples[element] ?? `「${element}について、〇〇を具体的に追記しましょう。」`;
}

function buildAdditionExamples(coverage: CoverageItem[]) {
  const targetItems = [
    ...coverage.filter((item) => item.status === "回答漏れ"),
    ...coverage.filter((item) => item.status === "もう少し明確に")
  ].slice(0, 3);

  return targetItems.length
    ? targetItems.map((item) => exampleForElement(item.element))
    : ["「この経験から得た学びを、今後〇〇に活かしたいです。」"];
}

export function fallbackAnalyze(input: AnalyzeRequest): AnalyzeResult {
  const questionCriteria = extractCriteria(input.question, "question");
  const philosophyCriteria = input.philosophy ? extractCriteria(input.philosophy, "philosophy") : [];
  const requiredCriteria = questionCriteria.length ? questionCriteria : DEFAULT_CRITERIA;

  const coverage = requiredCriteria.map((element) => {
    const { score, evidence } = scoreCriterion(input.essay, element);
    const status = statusFromScore(score);
    const reason = status !== "回答漏れ"
      ? `${evidence ? "本文中の該当表現から" : "本文全体の文脈から"}、${element}に触れていると判断しました。`
      : `${relatedContext(input.essay)}${element}として求められる内容が明示されていません。`;

    return {
      element,
      status,
      score,
      evidence: evidence || "明確な根拠表現は検出できませんでした",
      reason,
      note:
        status === "対応済み"
          ? `${element}に関する記述が確認できます。`
          : status === "もう少し明確に"
            ? `${element}は触れられていますが、もう少し明確にすると安心です。`
            : `${element}への回答が読み取りにくい状態です。`
    } satisfies CoverageItem;
  });

  const questionFitScore = scoreFromCoverage(coverage);
  const philosophyFitScore = input.philosophy
    ? clampScore(
        philosophyCriteria.length
          ? (philosophyCriteria.filter((item) => includesIdea(input.essay, item)).length / philosophyCriteria.length) * 100
          : 60
      )
    : undefined;
  const wordCount = evaluateWordCount(input.essay, input.wordLimit);
  const missing = coverage.filter((item) => item.status === "回答漏れ").map((item) => item.element);
  const strongItems = coverage.filter((item) => item.score >= 70).map((item) => item.element);
  const additionExamples = buildAdditionExamples(coverage);
  const goodPoints = [
    strongItems.includes("経験") ? "アピールの土台となる経験が示されています。" : "",
    strongItems.includes("具体的内容") ? "経験の具体的な内容が読み取りやすくなっています。" : "",
    strongItems.includes("工夫") ? "工夫や改善の観点が含まれており、行動の意図が伝わります。" : "",
    strongItems.includes("成果") ? "取り組みの成果まで触れられている点が良いです。" : "",
    strongItems.includes("学び") ? "経験から得た学びが示されており、次につながる印象があります。" : "",
    coverage.some((item) => item.status !== "回答漏れ") ? "設問に必要な要素の一部には回答できています。" : ""
  ].filter(Boolean).slice(0, 4);
  const suggestions = [
    missing[0] ? `${missing[0]}について、結論だけでなく行動や背景を一文加えると設問への回答が明確になります。` : "設問に対する結論を冒頭で示すと、読み手が要点をつかみやすくなります。",
    "行動、工夫、結果の順に整理すると、経験の説得力が高まります。",
    input.philosophy ? "企業理念と重なる価値観を、ES本文の経験と自然につなげると適合度が伝わりやすくなります。" : "企業が重視しそうな観点と、自分の行動の接点を少し補うと読みやすくなります。",
    wordCount.status === "不足" ? "文字数に余裕があるため、具体的な場面や成果を補足できます。" : "一文が長い箇所は、結論と補足を分けると読み手に届きやすくなります。"
  ].slice(0, 4);

  const overallScore = clampScore((questionFitScore * 0.68) + ((philosophyFitScore ?? questionFitScore) * 0.2) + (wordCount.status === "条件内" || wordCount.status === "条件なし" ? 12 : 5));

  return {
    overallScore,
    questionFitScore,
    philosophyFitScore,
    questionCriteria: requiredCriteria,
    philosophyCriteria,
    coverage,
    wordCount,
    additionExamples,
    goodPoints: goodPoints.length ? goodPoints : ["ESの方向性は確認できます。設問の要素ごとに内容を整理すると、さらに伝わりやすくなります。"],
    suggestions,
    summary: "設問の主要要素に対する回答状況を確認しました。結果は参考診断として、回答漏れの見直しに活用してください。",
    usedFallback: true
  };
}
