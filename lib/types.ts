export type AnalyzeRequest = {
  companyName: string;
  question: string;
  essay: string;
  philosophy?: string;
  persona?: string;
  wordLimit?: string;
};

export type CoverageItem = {
  element: string;
  status: "対応済み" | "もう少し明確に" | "回答漏れ";
  score: number;
  evidence: string;
  reason: string;
  note: string;
};

export type WordCountEvaluation = {
  current: number;
  condition: string | null;
  difference: string;
  status: string;
};

export type QuestionType =
  | "ガクチカ系"
  | "自己PR系"
  | "志望動機系"
  | "改善提案系"
  | "理由説明系"
  | "学び系"
  | "価値観系"
  | "将来像系"
  | "一般質問";

export type AnalyzeResult = {
  questionType: QuestionType;
  overallScore: number;
  questionFitScore: number;
  philosophyFitScore?: number;
  questionCriteria: string[];
  philosophyCriteria: string[];
  coverage: CoverageItem[];
  wordCount: WordCountEvaluation;
  additionExamples: string[];
  goodPoints: string[];
  suggestions: string[];
  summary: string;
  usedFallback: boolean;
};
