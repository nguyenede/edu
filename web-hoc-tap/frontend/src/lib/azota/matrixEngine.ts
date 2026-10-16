import { AzotaQuestion, CognitiveLevel, MatrixGenerationResult, MatrixRule, QuestionType } from './types';

export class MatrixEngine {
  /**
   * Biên dịch cú pháp DSL Ma trận: `[@Selector][@Filter] => Count`
   * Hỗ trợ các trường: @Subject, @Grade, @Level, @Type, @Topic, @Chapter, @Tag
   */
  public static parseDSL(script: string): MatrixRule[] {
    if (!script) return [];
    const lines = script
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    const rules: MatrixRule[] = [];

    for (const line of lines) {
      // Cú pháp: [...][...] => Count
      const arrowSplit = line.split('=>');
      if (arrowSplit.length !== 2) continue;

      const tagsPart = arrowSplit[0].trim();
      const count = parseInt(arrowSplit[1].trim(), 10) || 1;

      const tagMatches = Array.from(tagsPart.matchAll(/\[@([^:\]]+)(?::([^\]]+))?\]/g));
      if (tagMatches.length === 0) continue;

      const selectors: Record<string, string> = {};
      const filters: Record<string, string> = {};

      for (const m of tagMatches) {
        const rawKey = m[1].trim().toLowerCase();
        const val = (m[2] || '').trim();

        const key = this.normalizeKey(rawKey);
        if (['subject', 'grade', 'topic', 'chapter'].includes(key)) {
          selectors[key] = val;
        } else {
          filters[key] = val;
        }
      }

      rules.push({
        raw: line,
        selectors,
        filters,
        count,
      });
    }

    return rules;
  }

  /**
   * Thực thi ma trận đề thi: Lọc và bốc câu hỏi từ Ngân hàng câu hỏi (Question Bank)
   */
  public static execute(questionPool: AzotaQuestion[], scriptOrRules: string | MatrixRule[]): MatrixGenerationResult {
    const rules = typeof scriptOrRules === 'string' ? this.parseDSL(scriptOrRules) : scriptOrRules;
    const selectedQuestions: AzotaQuestion[] = [];
    const usedIds = new Set<string>();

    const ruleMatches: {
      rule: string;
      requested: number;
      found: number;
      satisfied: boolean;
    }[] = [];

    let totalRequested = 0;

    for (const rule of rules) {
      totalRequested += rule.count;

      // Lọc các câu hỏi thỏa mãn tất cả tiêu chí của rule
      const candidates = questionPool.filter((q) => {
        const qId = q.id || `q_${q.index}_${q.content.slice(0, 20)}`;
        if (usedIds.has(qId)) return false;

        // 1. Kiểm tra selectors
        if (rule.selectors.subject && !this.matchFuzzy(q.subject, rule.selectors.subject)) return false;
        if (rule.selectors.grade && !this.matchFuzzy(q.grade, rule.selectors.grade)) return false;
        if (rule.selectors.topic && !this.matchFuzzy(q.topic, rule.selectors.topic)) return false;
        if (rule.selectors.chapter && !this.matchFuzzy(q.chapter, rule.selectors.chapter)) return false;

        // 2. Kiểm tra filters: Level (NB, TH, VD, VDC)
        if (rule.filters.level) {
          const reqLevel = rule.filters.level.toUpperCase();
          if ((q.level || '').toUpperCase() !== reqLevel) return false;
        }

        // 3. Kiểm tra filters: Type (multiple_choice, true_false, short_answer, essay)
        if (rule.filters.type) {
          const reqType = this.normalizeQuestionType(rule.filters.type);
          if (q.type !== reqType) return false;
        }

        return true;
      });

      // Lấy ngẫu nhiên theo số lượng Count đã định
      const shuffledCandidates = this.shuffleArray([...candidates]);
      const picked = shuffledCandidates.slice(0, rule.count);

      for (const p of picked) {
        const qId = p.id || `q_${p.index}_${p.content.slice(0, 20)}`;
        usedIds.add(qId);
        selectedQuestions.push(p);
      }

      ruleMatches.push({
        rule: rule.raw,
        requested: rule.count,
        found: picked.length,
        satisfied: picked.length >= rule.count,
      });
    }

    // Đánh số lại thứ tự câu hỏi từ 1 đến N
    const reindexedQuestions = selectedQuestions.map((q, idx) => ({
      ...q,
      index: idx + 1,
    }));

    return {
      rules,
      questions: reindexedQuestions,
      stats: {
        totalRequested,
        totalGenerated: reindexedQuestions.length,
        ruleMatches,
      },
    };
  }

  private static normalizeKey(rawKey: string): string {
    const k = rawKey.toLowerCase();
    if (['subject', 'mon', 'môn'].includes(k)) return 'subject';
    if (['grade', 'lop', 'lớp', 'khoi', 'khối'].includes(k)) return 'grade';
    if (['level', 'mucdo', 'mứcđộ', 'do_kho'].includes(k)) return 'level';
    if (['type', 'loai', 'loại', 'dang', 'dạng'].includes(k)) return 'type';
    if (['topic', 'chude', 'chủđề', 'chuyênđề', 'chuyende'].includes(k)) return 'topic';
    if (['chapter', 'chuong', 'chương'].includes(k)) return 'chapter';
    return k;
  }

  private static normalizeQuestionType(typeStr: string): QuestionType {
    const s = typeStr.toLowerCase();
    if (s.includes('dung') || s.includes('true') || s.includes('tf')) return 'true_false';
    if (s.includes('ngan') || s.includes('short')) return 'short_answer';
    if (s.includes('tu_luan') || s.includes('essay')) return 'essay';
    return 'multiple_choice';
  }

  private static matchFuzzy(source?: string, target?: string): boolean {
    if (!target) return true;
    if (!source) return false;
    return source.toLowerCase().includes(target.toLowerCase());
  }

  private static shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
