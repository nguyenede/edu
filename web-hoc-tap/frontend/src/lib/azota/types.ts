export type CognitiveLevel = 'NB' | 'TH' | 'VD' | 'VDC';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'essay';

export interface ParsedOption {
  letter: string;
  content: string;
  isCorrect: boolean;
  isFixedOrder?: boolean;
  formatting?: {
    isBold?: boolean;
    isUnderlined?: boolean;
    color?: string;
  };
}

export interface ParsedSubQuestion {
  letter: string; // 'a' | 'b' | 'c' | 'd'
  content: string;
  isCorrect: boolean; // true = Đúng, false = Sai
  explanation?: string;
}

export interface AzotaQuestion {
  id?: string;
  index: number;
  rawLabel?: string;
  content: string;
  type: QuestionType;
  level?: CognitiveLevel;
  groupHeader?: string;
  groupId?: string;
  options: ParsedOption[];
  subQuestions?: ParsedSubQuestion[];
  shortAnswer?: string;
  explanation?: string;
  points?: number;
  topic?: string;
  chapter?: string;
  subject?: string;
  grade?: string;
  images?: string[];
}

export interface AzotaExam {
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  questions: AzotaQuestion[];
  answerKeys?: Record<number, string>;
  rawExplanationText?: string;
  parserUsed?: string;
}

export interface MatrixRule {
  raw: string;
  selectors: Record<string, string>;
  filters: Record<string, string>;
  count: number;
}

export interface MatrixGenerationResult {
  rules: MatrixRule[];
  questions: AzotaQuestion[];
  stats: {
    totalRequested: number;
    totalGenerated: number;
    ruleMatches: {
      rule: string;
      requested: number;
      found: number;
      satisfied: boolean;
    }[];
  };
}

export interface ShuffledExamVariant {
  code: string;
  title: string;
  questions: AzotaQuestion[];
  answerKeyMap: Record<number, string>;
}
