import { AzotaQuestion, CognitiveLevel, MatrixGenerationResult, MatrixRule, QuestionType } from './types';

export class MatrixEngine {
  /**
   * Bảng ánh xạ nhãn Tag ngôn ngữ trích xuất từ Azota Production Utils.tagLang
   */
  private static readonly TAG_LANG_MAP: Record<string, string> = {
    EASY: 'NB',
    MEDIUM: 'TH',
    HARD: 'VD',
    HARDEST: 'VDC',
    OC: 'TN', // One choice
    MC: 'TNNDA', // Multiple choice
    FB: 'ĐT', // Fill in / Short answer
    ES: 'TL', // Essay
    TF: 'ĐS', // True / False
    GR: 'NH' // Question Group
  };

  /**
   * Biên dịch cú pháp DSL Ma trận theo chuẩn hệ thống Azota Production:
   * Hỗ trợ cả 2 dạng:
   * 1. Cú pháp tường minh: `[@Subject:Toán 12][@Level:NB][@Type:TN] => 5`
   * 2. Cú pháp mã hóa Azota: `[@C123][@K456][@F:NB][@F:TN] => 5` hoặc `[@K12.C34.F:VD.F:TN] => 2`
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

      const selectors: Record<string, string> = {};
      const filters: Record<string, string> = {};

      // 1. Bóc tách các thẻ dạng `[@Key:Value]` hoặc `[@Key]` hoặc `[@F:Tag]`
      const tagMatches = Array.from(tagsPart.matchAll(/\[@([^\]]+)\]/g));

      for (const m of tagMatches) {
        const rawContent = m[1].trim();

        // Xử lý chuỗi ngăn cách bởi dấu chấm dạng chuỗi Azota `K12.C34.F:VD`
        const subParts = rawContent.split('.');
        for (const sub of subParts) {
          const colonIdx = sub.indexOf(':');
          let rawKey = colonIdx !== -1 ? sub.substring(0, colonIdx).trim() : sub.trim();
          let rawVal = colonIdx !== -1 ? sub.substring(colonIdx + 1).trim() : '';

          // Chuẩn hóa tiền tố Azota F:
          if (rawKey.toUpperCase() === 'F' && rawVal) {
            const mappedTag = this.TAG_LANG_MAP[rawVal.toUpperCase()] || rawVal.toUpperCase();
            if (['NB', 'TH', 'VD', 'VDC'].includes(mappedTag)) {
              filters['level'] = mappedTag;
            } else if (['TN', 'TNNDA', 'ĐS', 'ĐT', 'TL', 'NH'].includes(mappedTag)) {
              filters['type'] = mappedTag;
            } else {
              filters['tag'] = mappedTag;
            }
            continue;
          }

          // Xử lý mã nhận diện danh mục C\d+, kiến thức K\d+, câu hỏi Q\d+
          if (/^C\d+$/i.test(rawKey)) {
            selectors['category_id'] = rawKey.substring(1);
            continue;
          }
          if (/^K\d+$/i.test(rawKey)) {
            selectors['knowledge_id'] = rawKey.substring(1);
            continue;
          }
          if (/^Q\d+$/i.test(rawKey)) {
            selectors['question_id'] = rawKey.substring(1);
            continue;
          }
          if (/^G\d+$/i.test(rawKey)) {
            selectors['group_id'] = rawKey.substring(1);
            continue;
          }

          const normKey = this.normalizeKey(rawKey.toLowerCase());
          if (['subject', 'grade', 'topic', 'chapter'].includes(normKey)) {
            selectors[normKey] = rawVal;
          } else {
            filters[normKey] = rawVal;
          }
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
        if (rule.selectors.question_id && q.id !== rule.selectors.question_id) return false;
        if (rule.selectors.group_id && q.groupId !== rule.selectors.group_id) return false;

        // 2. Kiểm tra filters: Level (NB, TH, VD, VDC)
        if (rule.filters.level) {
          const reqLevel = rule.filters.level.toUpperCase();
          const qLevel = (q.level || '').toUpperCase();
          if (qLevel !== reqLevel) return false;
        }

        // 3. Kiểm tra filters: Type (multiple_choice, true_false, short_answer, essay)
        if (rule.filters.type) {
          const reqType = this.normalizeQuestionType(rule.filters.type);
          if (q.type !== reqType) return false;
        }

        return true;
      });

      // Lấy ngẫu nhiên theo số lượng Count đã định
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, rule.count);

      picked.forEach((q) => {
        const qId = q.id || `q_${q.index}_${q.content.slice(0, 20)}`;
        usedIds.add(qId);
        selectedQuestions.push({ ...q });
      });

      ruleMatches.push({
        rule: rule.raw,
        requested: rule.count,
        found: picked.length,
        satisfied: picked.length >= rule.count,
      });
    }

    // Đánh lại số thứ tự câu hỏi từ 1 đến N
    selectedQuestions.forEach((q, idx) => {
      q.index = idx + 1;
    });

    return {
      rules,
      questions: selectedQuestions,
      stats: {
        totalRequested,
        totalGenerated: selectedQuestions.length,
        ruleMatches,
      },
    };
  }

  /**
   * Chuẩn hóa từ khóa selector/filter
   */
  private static normalizeKey(key: string): string {
    const k = key.toLowerCase();
    if (['mon', 'monhoc', 'subject'].includes(k)) return 'subject';
    if (['khoi', 'lop', 'grade'].includes(k)) return 'grade';
    if (['mucdo', 'capdo', 'level'].includes(k)) return 'level';
    if (['dang', 'loai', 'type'].includes(k)) return 'type';
    if (['chude', 'topic'].includes(k)) return 'topic';
    if (['chuong', 'chapter'].includes(k)) return 'chapter';
    return k;
  }

  /**
   * So khớp kiểu câu hỏi theo chuẩn Azota
   */
  private static normalizeQuestionType(typeStr: string): QuestionType {
    const t = typeStr.toLowerCase().trim();
    if (['mc', 'multiple_choice', 'tn', 'trac_nghiem', 'trắc nghiệm', '1'].includes(t)) {
      return 'multiple_choice';
    }
    if (['tf', 'true_false', 'đs', 'dung_sai', 'đúng sai', '5'].includes(t)) {
      return 'true_false';
    }
    if (['sa', 'short_answer', 'dt', 'điền từ', 'tra_loi_ngan', 'trả lời ngắn', '4'].includes(t)) {
      return 'short_answer';
    }
    if (['es', 'essay', 'tl', 'tu_luan', 'tự luận', '3'].includes(t)) {
      return 'essay';
    }
    return 'multiple_choice';
  }

  /**
   * So khớp mờ chuỗi văn bản không phân biệt hoa thường và dấu cách
   */
  private static matchFuzzy(actual?: string, expected?: string): boolean {
    if (!expected) return true;
    if (!actual) return false;
    const a = actual.toLowerCase().replace(/\s+/g, ' ').trim();
    const e = expected.toLowerCase().replace(/\s+/g, ' ').trim();
    return a.includes(e) || e.includes(a);
  }
}
