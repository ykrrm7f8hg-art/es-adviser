import type { AnalyzeRequest, AnalyzeResult, CoverageItem, QuestionType, WordCountEvaluation } from "./types";

type CriterionRule = {
  pattern: RegExp;
  label: string;
  keywords: string[];
  evidencePatterns?: RegExp[];
};

type QuestionTypeConfig = {
  type: QuestionType;
  patterns: RegExp[];
  criteria: string[];
};

const QUESTION_TYPE_CONFIGS: QuestionTypeConfig[] = [
  {
    type: "ガクチカ系",
    patterns: [/学生時代.*力|ガクチカ|主体的|頑張った|取り組んだ経験|力を入れた|最も.*経験|困難.*経験|リーダーシップ|結果を出した経験|経験.*学んだ/],
    criteria: ["経験", "課題", "行動", "工夫", "成果", "学び"]
  },
  {
    type: "自己PR系",
    patterns: [/自己PR|自己ＰＲ|強み|長所|アピール|あなたらしさ/],
    criteria: ["強み", "具体エピソード", "行動", "成果", "再現性"]
  },
  {
    type: "志望動機系",
    patterns: [/志望|なぜ.*当社|応募理由|エントリー理由|期待すること|参加目的|インターン参加目的|入社.*理由|当社.*理由/],
    criteria: ["興味分野", "企業との接点", "志望理由", "期待すること", "学びとの接続"]
  },
  {
    type: "サービス分析系",
    patterns: [/良いと思ったサービス|好きなプロダクト|面白いサービス|おすすめアプリ|好きなサービス|気になるサービス|プロダクト.*理由/],
    criteria: ["サービス名", "良いと思った理由", "具体機能", "ユーザー視点", "自分の考察"]
  },
  {
    type: "改善提案系",
    patterns: [/改善案|改善提案|サービス改善|企画提案|提案.*述べ|課題.*提案/],
    criteria: ["課題発見", "根拠", "提案内容", "期待効果"]
  },
  {
    type: "理由説明系",
    patterns: [/好き.*理由|面白い.*理由|興味.*理由|印象に残った.*理由|作品.*理由|コンテンツ.*理由|技術.*理由/],
    criteria: ["対象", "理由", "具体例", "感想・価値観"]
  },
  {
    type: "学び系",
    patterns: [/学んだこと|得たこと|成長したこと|経験から.*学|気づいたこと/],
    criteria: ["経験", "学び", "具体例", "今後の活用"]
  },
  {
    type: "価値観系",
    patterns: [/価値観|大切にしていること|あなたらしさ|判断基準|信念/],
    criteria: ["価値観", "理由", "具体例", "行動"]
  },
  {
    type: "将来像系",
    patterns: [/将来|5年後|５年後|キャリアビジョン|やりたいこと|実現したい|目標/],
    criteria: ["目標", "理由", "行動", "実現方法"]
  }
];

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
  行動と結果: ["行動", "実施", "取り組", "結果", "成果"],
  経験: ["経験", "活動", "運営", "担当", "参加", "所属", "サークル", "新歓", "アルバイト", "研究", "インターン", "プロジェクト", "学園祭", "ボランティア", "において", "活動で", "運営で", "担当として", "の際"],
  課題: ["課題", "問題", "困難", "悩み", "壁", "対立", "方針のズレ", "参加率低下", "人手不足", "心理的ハードル", "低下", "不足"],
  行動: ["行動", "実行", "取り組", "提案", "提案した", "実施", "実施した", "主導", "主導した", "企画", "企画した", "変更", "変更した", "改善", "改善した", "呼びかけ", "設けた", "増やした"],
  工夫: ["工夫", "意識", "調整", "見直", "変更", "個別対応", "交流機会", "フィードバック", "改善", "方法", "設けた", "増やした"],
  成果: ["成果", "結果", "達成", "向上", "増加", "増え", "改善", "成功", "評価", "売上", "参加者", "伸びた"],
  学び: ["学ん", "学び", "気づ", "実感", "重要性", "必要性", "理解", "得た", "大切"],
  強み: ["強み", "長所", "得意", "持ち味", "私らしさ"],
  具体エピソード: ["経験", "エピソード", "具体", "場面", "活動", "取り組"],
  再現性: ["活か", "再現", "貢献", "今後", "発揮", "御社", "当社"],
  興味関心: ["興味", "関心", "惹か", "魅力", "面白"],
  興味分野: ["興味", "関心", "UX", "UI", "デザイン", "事業", "領域", "分野", "プロダクト", "サービス"],
  企業理解: ["理念", "事業", "サービス", "強み", "特徴", "業界", "御社", "当社"],
  "企業との接点": ["企業", "貴社", "御社", "当社", "Goodpatch", "グッドパッチ", "UX", "事業", "サービス", "軸", "接点", "共通"],
  志望理由: ["志望", "エントリー", "応募", "理由", "惹か", "魅力", "参加したい", "関心"],
  "期待すること": ["期待", "体感", "経験", "学びたい", "知りたい", "理解したい", "実務", "インターン", "参加目的"],
  "学びとの接続": ["大学", "授業", "専攻", "研究", "学んだ", "情報行動論", "経験", "接続", "活か", "つなげ"],
  接点: ["経験", "価値観", "接点", "共通", "重な", "活か"],
  サービス名: ["with", "LINE", "Instagram", "TikTok", "YouTube", "メルカリ", "Netflix", "Spotify", "アプリ", "サービス", "プロダクト"],
  "良いと思った理由": ["良い", "好き", "面白", "魅力", "理由", "便利", "優れて", "惹か"],
  具体機能: ["機能", "性格診断", "レコメンド", "通知", "検索", "マッチング", "UI", "導線", "画面"],
  ユーザー視点: ["ユーザー", "不安", "安心", "使いやす", "迷わ", "負担", "体験", "行動", "後押し"],
  自分の考察: ["考え", "感じ", "分析", "考察", "理由", "仕組み", "設計", "後押し", "価値"],
  課題発見: ["課題", "問題", "不便", "改善点", "現状", "不足"],
  根拠: ["理由", "根拠", "データ", "調査", "分析", "事例", "なぜ"],
  提案内容: ["提案", "企画", "改善案", "施策", "導入", "実施"],
  期待効果: ["効果", "期待", "改善", "向上", "増加", "解決", "メリット"],
  対象: ["作品", "コンテンツ", "技術", "映画", "アニメ", "ゲーム", "サービス", "番組", "最も", "好き"],
  具体例: ["具体", "場面", "シーン", "例えば", "描写", "演出", "機能", "内容"],
  "感想・価値観": ["感じ", "思い", "考え", "価値観", "面白", "魅力", "印象", "好き"],
  目標: ["目標", "将来", "やりたい", "実現", "なりたい", "5年後", "５年後"],
  実現方法: ["方法", "行動", "努力", "学び", "経験", "身につけ", "取り組"],
  今後の活用: ["活か", "今後", "次", "将来", "応用", "貢献"],
  価値観: ["価値観", "大切", "重視", "信念", "判断基準", "こだわり"]
};

const FORBIDDEN_UNLESS_EXPLICIT: Record<string, RegExp> = {
  将来像: /将来|キャリア|入社後|今後|実現したい|目標/,
  理由: /理由|志望|なぜ|興味|関心/
};

const REASON_EXPRESSION_PATTERN =
  /魅力を感じ|面白いと思|興味を持|印象的だ(?:った)?|良いと思|感動し|共感し|心に残|惹かれ|好きだった|理由|なぜなら|からです|ためです|だから|なので/;
const WORK_REASON_NOUN_PATTERN = /テンポ感|世界観|背景描写|演出|構成|キャラクター|読後感|ストーリー|音楽|映像|描写|設定|脚本|表現|メッセージ性/;
const OPINION_EXPRESSION_PATTERN = /魅力を感じ|面白いと思|印象的だ(?:った)?|共感し|感動し|心に残|惹かれ|好きだった|好きです|良いと思|感じ|思い|考え/;

const GAKUCHIKA_SIGNAL_PATTERNS: Record<string, RegExp> = {
  経験: /サークル|新歓|アルバイト|研究|インターン|プロジェクト|学園祭|ボランティア|ゼミ|部活|運営|活動|担当|参加|所属|において|活動で|運営で|担当として|の際/,
  課題: /課題|問題|困難|悩み|壁|対立|方針のズレ|参加率低下|人手不足|心理的ハードル|低下|不足|うまくいかな|難し/,
  行動: /提案した|提案|実施した|実施|主導した|主導|企画した|企画|変更した|変更|改善した|改善|呼びかけた|呼びかけ|設けた|増やした|創出した|行った/,
  工夫: /工夫した|工夫|意識した|意識|調整した|調整|見直した|見直|変更した|変更|個別対応|交流機会|フィードバック方法|方法を変|設けた|増やした|創出した/,
  成果: /増加した|増えた|改善した|達成した|成功した|参加者が増|売上が伸び|評価された|向上した|伸びた|結果として/,
  学び: /学んだ|学び|気づいた|気づき|実感した|重要性を知|必要性を理解|理解した|大切だと感じ/
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

function classifyQuestion(question: string): QuestionType {
  const normalized = question.replace(/\s/g, "");
  return QUESTION_TYPE_CONFIGS.find((config) => config.patterns.some((pattern) => pattern.test(normalized)))?.type ?? "一般質問";
}

function criteriaForQuestionType(type: QuestionType, question: string) {
  const config = QUESTION_TYPE_CONFIGS.find((item) => item.type === type);
  if (config) return config.criteria;
  return ["設問への直接回答", "理由", "具体例"];
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

  const gakuchikaPattern = GAKUCHIKA_SIGNAL_PATTERNS[label];
  if (gakuchikaPattern) {
    const signalSentence = sentences(text).find((sentence) => gakuchikaPattern.test(sentence));
    if (signalSentence) return compactEvidence(signalSentence);
  }

  if (label === "理由") {
    const reasonSentence = sentences(text).find((sentence) => REASON_EXPRESSION_PATTERN.test(sentence) || WORK_REASON_NOUN_PATTERN.test(sentence));
    if (reasonSentence) return compactEvidence(reasonSentence);
  }

  if (label === "感想・価値観") {
    const opinionSentence = sentences(text).find((sentence) => OPINION_EXPRESSION_PATTERN.test(sentence));
    if (opinionSentence) return compactEvidence(opinionSentence);
  }

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
  const reasonBonus = label === "理由" && /なぜなら|理由|からです|ためです|なので|だから|感じた|思った/.test(text) ? 22 : 0;
  const opinionBonus = label === "感想・価値観" && /感じ|思い|考え|好き|面白|魅力|印象|価値観/.test(text) ? 22 : 0;
  const targetBonus = label === "対象" && /作品|コンテンツ|映画|アニメ|ゲーム|技術|サービス|番組|ドラマ|漫画|小説/.test(text) ? 18 : 0;
  const hasExplicitResult = /結果|成果|向上|成功|評価|達成|増加|満足度|貢献|効果|実績/.test(text);
  const resultBonus = label === "成果" && hasExplicitResult ? 16 : 0;
  const baseScore = evidenceHits >= 3 ? 78 : evidenceHits === 2 ? 66 : evidenceHits === 1 ? 48 : hits > 0 ? 34 : 0;
  const rawScore = clampScore(baseScore + numericBonus + reflectionBonus + actionBonus + reasonBonus + opinionBonus + targetBonus + resultBonus);
  const score = label === "成果" && !hasExplicitResult ? Math.min(rawScore, 38) : rawScore;

  return { score, evidence };
}

function adjustReasonExplanationCriterion(
  text: string,
  element: string,
  result: ReturnType<typeof scoreCriterion>
) {
  if (element !== "理由" && element !== "感想・価値観") return result;

  const reasonSignal = REASON_EXPRESSION_PATTERN.test(text);
  const nounSignal = WORK_REASON_NOUN_PATTERN.test(text);
  const opinionSignal = OPINION_EXPRESSION_PATTERN.test(text);
  const evidence = result.evidence || findEvidence(text, element);

  if (element === "理由") {
    if (reasonSignal && nounSignal) {
      return { score: Math.max(result.score, 82), evidence };
    }
    if (reasonSignal || nounSignal) {
      return { score: Math.max(result.score, 58), evidence };
    }
  }

  if (element === "感想・価値観") {
    if (opinionSignal && nounSignal) {
      return { score: Math.max(result.score, 82), evidence };
    }
    if (opinionSignal) {
      return { score: Math.max(result.score, 58), evidence };
    }
  }

  return result;
}

function adjustGakuchikaCriterion(
  text: string,
  element: string,
  result: ReturnType<typeof scoreCriterion>
) {
  const pattern = GAKUCHIKA_SIGNAL_PATTERNS[element];
  if (!pattern) return result;

  const evidence = result.evidence || findEvidence(text, element);
  const hasSignal = pattern.test(text);

  if (!hasSignal) return result;

  const strongSignals: Record<string, RegExp> = {
    経験: /サークル|新歓|アルバイト|研究|インターン|プロジェクト|学園祭|ボランティア|ゼミ|部活|運営|活動/,
    課題: /困難|課題|問題|対立|参加率低下|人手不足|心理的ハードル|方針のズレ/,
    行動: /提案し|提案した|実施し|実施した|主導し|主導した|企画し|企画した|変更し|変更した|改善し|改善した|呼びかけ|創出し|設け/,
    工夫: /工夫した|意識した|調整した|見直した|個別対応|交流機会|フィードバック方法|方法を変/,
    成果: /増加した|増えた|達成した|成功した|参加者が増|売上が伸び|評価された|向上した/,
    学び: /学んだ|学びました|気づいた|実感した|重要性を知|重要性を学|必要性を理解|理解した/
  };

  const strong = strongSignals[element]?.test(text);
  return {
    score: Math.max(result.score, strong ? 82 : 58),
    evidence
  };
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
    強み: "「私の強みは、〇〇な状況でも△△できることです。」",
    具体エピソード: "「この強みは、〇〇の経験で発揮しました。」",
    行動: "「その際、私は〇〇を行い、△△に働きかけました。」",
    再現性: "「この強みを活かし、入社後も〇〇に貢献したいです。」",
    工夫: "「その際、〇〇を改善するために△△を工夫しました。」",
    試行錯誤: "「うまくいかなかった点を振り返り、〇〇を見直しました。」",
    成果: "「その結果、〇〇が改善され、△△につながりました。」",
    学び: "「この経験から、〇〇の大切さを学びました。」",
    興味分野: "「私は〇〇という分野に関心があります。」",
    興味関心: "「私は〇〇という点に強く興味を持っています。」",
    "企業との接点": "「貴社が〇〇を重視している点に、自分の関心との接点を感じました。」",
    企業理解: "「貴社の〇〇という事業・考え方に魅力を感じています。」",
    志望理由: "「そのため、〇〇を学びたいと考えエントリーしました。」",
    "期待すること": "「インターンでは、〇〇を実務の中で体感したいです。」",
    "学びとの接続": "「大学で学んだ〇〇を、実務の△△と接続して理解したいです。」",
    接点: "「私の〇〇という経験と、貴社の△△に接点を感じました。」",
    サービス名: "「私が良いと思ったサービスは、〇〇です。」",
    "良いと思った理由": "「良いと思った理由は、〇〇という体験を生み出しているからです。」",
    具体機能: "「特に〇〇という機能が、△△に役立っていると感じました。」",
    ユーザー視点: "「ユーザーの〇〇という不安を軽減している点が優れていると考えます。」",
    自分の考察: "「この設計は、ユーザーの行動を〇〇の方向に後押ししていると考えました。」",
    理由: "「私がそう考える理由は、〇〇という経験があるからです。」",
    課題発見: "「現状の課題は、〇〇が不足している点だと考えます。」",
    根拠: "「そう考える根拠は、〇〇という状況があるためです。」",
    提案内容: "「改善案として、〇〇を導入することを提案します。」",
    期待効果: "「これにより、〇〇の改善が期待できます。」",
    対象: "「私が最も面白いと感じた作品は、〇〇です。」",
    具体例: "「特に〇〇の場面では、△△が印象的でした。」",
    "感想・価値観": "「この作品の〇〇な点に、自分の△△という価値観が重なりました。」",
    主体性: "「私は自ら〇〇を提案し、△△に取り組みました。」",
    経験したいこと: "「インターンでは、〇〇の業務を経験したいです。」",
    身につけたいこと: "「その経験を通じて、〇〇を身につけたいです。」",
    将来像: "「将来は、〇〇を通じて△△に貢献したいです。」",
    目標: "「将来は、〇〇を実現できる人材になりたいです。」",
    実現方法: "「そのために、まず〇〇を経験し、△△を身につけたいです。」"
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
  const questionType = classifyQuestion(input.question);
  const questionCriteria = criteriaForQuestionType(questionType, input.question);
  const philosophyCriteria = input.philosophy ? extractCriteria(input.philosophy, "philosophy") : [];
  const requiredCriteria = questionCriteria.length ? questionCriteria : DEFAULT_CRITERIA;

  const coverage = requiredCriteria.map((element) => {
    const criterionResult = scoreCriterion(input.essay, element);
    const adjustedResult =
      questionType === "理由説明系"
        ? adjustReasonExplanationCriterion(input.essay, element, criterionResult)
        : questionType === "ガクチカ系"
          ? adjustGakuchikaCriterion(input.essay, element, criterionResult)
        : criterionResult;
    const { score, evidence } = adjustedResult;
    const status = statusFromScore(score);
    const reasonMissingText =
      questionType === "理由説明系" && element === "理由"
        ? "好き・面白いという結論は読み取れますが、なぜそう感じたのかを示す理由表現が十分に見つかりません。"
        : `${relatedContext(input.essay)}${element}として求められる内容が明示されていません。`;
    const reason = status !== "回答漏れ"
      ? `${evidence ? "本文中の該当表現から" : "本文全体の文脈から"}、${element}に触れていると判断しました。`
      : reasonMissingText;

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
    questionType,
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
