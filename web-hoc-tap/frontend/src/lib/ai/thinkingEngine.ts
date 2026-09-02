import { ToolExecutionResult, AiToolRegistry, QuestionItem } from './aiToolRegistry';

export interface ParsedAgentOutput {
  cleanText: string;
  thoughtText?: string;
  isThinkingActive: boolean;
  thoughtDurationSeconds?: number;
  executedActions: ToolExecutionResult[];
}

export class ThinkingEngine {
  /**
   * Tách triệt để thẻ <think>...</think> và thẻ <action>...</action> hoặc JSON code block
   * Lấy 100% dữ liệu câu hỏi do AI tạo ra để nạp vào đề thi thực tế
   */
  static parseStream(raw: string, startTime?: number, userPrompt?: string, isFinal: boolean = false): ParsedAgentOutput {
    let text = raw || '';
    let thoughtText: string | undefined;
    let isThinkingActive = false;
    const executedActions: ToolExecutionResult[] = [];

    // 1. Parse <think>...</think> (closed or unclosed during stream)
    const thinkOpenIdx = text.indexOf('<think>');
    const thinkCloseIdx = text.indexOf('</think>');

    if (thinkOpenIdx !== -1) {
      if (thinkCloseIdx !== -1) {
        thoughtText = text.substring(thinkOpenIdx + 7, thinkCloseIdx).trim();
        text = text.substring(0, thinkOpenIdx) + text.substring(thinkCloseIdx + 8);
        isThinkingActive = false;
      } else {
        thoughtText = text.substring(thinkOpenIdx + 7).trim();
        text = text.substring(0, thinkOpenIdx);
        isThinkingActive = true;
      }
    }

    // 2. Parse completed <action type="...">...</action>
    const actionRegex = /<action\s+type=["']([^"']*)["']>([\s\S]*?)<\/action>/gi;
    let match: RegExpExecArray | null;
    while ((match = actionRegex.exec(text)) !== null) {
      const toolName = match[1].toLowerCase().trim();
      const payloadStr = match[2].trim();
      const result = this.processActionPayload(toolName, payloadStr, userPrompt, isFinal);
      if (result) {
        executedActions.push(result);
      }
    }
    text = text.replace(actionRegex, '').trim();

    // 3. Fallback: Parse markdown JSON code block if AI didn't use <action> tag
    if (executedActions.length === 0) {
      const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?"questions"[\s\S]*?\})\s*```/gi;
      let jsonMatch: RegExpExecArray | null;
      while ((jsonMatch = jsonBlockRegex.exec(text)) !== null) {
        const payloadStr = jsonMatch[1].trim();
        const result = this.processActionPayload('create_exam', payloadStr, userPrompt, isFinal);
        if (result) {
          executedActions.push(result);
        }
      }
      text = text.replace(jsonBlockRegex, '').trim();
    }

    // 4. Fallback: Parse raw JSON object if AI outputted { "title": ..., "questions": [...] }
    if (executedActions.length === 0) {
      const rawJsonMatch = text.match(/\{[\s\r\n]*"title"[\s\S]*?"questions"[\s\S]*?\][\s\r\n]*\}/);
      if (rawJsonMatch) {
        const result = this.processActionPayload('create_exam', rawJsonMatch[0], userPrompt, isFinal);
        if (result) {
          executedActions.push(result);
          text = text.replace(rawJsonMatch[0], '').trim();
        }
      }
    }

    // 5. If there's an unclosed <action...> during stream, hide it from user chat
    const unclosedActionIdx = text.search(/<action\b/i);
    if (unclosedActionIdx !== -1) {
      const unclosedText = text.substring(unclosedActionIdx);
      if (executedActions.length === 0) {
        const partialResult = this.processPartialExamPayload(unclosedText, userPrompt, isFinal);
        if (partialResult && partialResult.data?.questionsCount > 0) {
          executedActions.push(partialResult);
        }
      }
      text = text.substring(0, unclosedActionIdx).trim();
    }

    // 6. Clean any raw action mentions or remnants
    text = text.replace(/Bạn có thể nhấn vào thẻ hành động[\s\S]*?(?:!|\.|\n|$)/gi, '').trim();
    text = text.replace(/thẻ hành động\s*create_exam/gi, '').trim();
    text = text.replace(/create_exam/gi, '').trim();

    // 7. Ensure cleanText has friendly Vietnamese response if empty but action executed
    if (!text && executedActions.length > 0) {
      const firstAction = executedActions[0];
      if (firstAction.actionType === 'exam') {
        text = `Tôi đã tạo thành công bộ **${firstAction.data?.title || 'Đề thi trắc nghiệm'}** gồm **${firstAction.data?.questionsCount || 1} câu** và lưu trực tiếp vào Kho tài liệu. Bạn có thể bấm vào thẻ bên dưới để bắt đầu làm bài thi hoặc chỉnh sửa ngay!`;
      } else if (firstAction.actionType === 'game') {
        text = `Tôi đã khởi tạo thành công phòng **${firstAction.data?.title || 'Game Trắc nghiệm Trực tiếp'}** với mã PIN **${firstAction.data?.pinCode}**. Bấm vào nút bên dưới để vào chơi ngay!`;
      } else if (firstAction.actionType === 'class') {
        text = `Đã tạo thành công lớp học **${firstAction.data?.name}** với mã tham gia **${firstAction.data?.code}**.`;
      } else if (firstAction.actionType === 'folder') {
        text = `Đã tạo thành công thư mục **${firstAction.data?.name}** trong Kho tài liệu.`;
      }
    } else if (!text && !isThinkingActive) {
      text = 'Chào bạn! Tôi là ChatCoi. Tôi có thể giúp gì cho bạn trong việc tạo đề thi theo chủ đề, thiết lập lớp học hoặc khởi tạo trò chơi trực tiếp hôm nay?';
    }

    // 8. Calculate thought duration
    let thoughtDurationSeconds: number | undefined;
    if (startTime && (thoughtText || isThinkingActive)) {
      thoughtDurationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    }

    return {
      cleanText: text,
      thoughtText,
      isThinkingActive,
      thoughtDurationSeconds,
      executedActions,
    };
  }

  /**
   * Xử lý và nạp dữ liệu JSON do AI tạo vào đúng công cụ
   * Hỗ trợ đầy đủ định dạng { title, total_questions, questions: [{ id, question, options: [...], answer: "..." }] }
   */
  static processActionPayload(toolName: string, payloadStr: string, userPrompt?: string, persist: boolean = true): ToolExecutionResult | null {
    try {
      const sanitized = payloadStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      let params: any = {};
      try {
        params = JSON.parse(sanitized);
      } catch {
        params = this.extractFieldsFromBrokenJson(payloadStr, userPrompt);
      }

      if (toolName === 'create_exam') {
        const topic = params.subject || params.topic || this.extractTopicFromPrompt(userPrompt || '');
        const grade = params.grade || this.extractGradeFromPrompt(userPrompt || '');
        const title = params.title || `Đề thi ${topic}`;

        let rawQuestions: any[] = [];
        if (Array.isArray(params.questions) && params.questions.length > 0) {
          rawQuestions = params.questions;
        } else {
          // Fallback: parse robustly from raw payload string
          const robustFields = this.extractFieldsFromBrokenJson(payloadStr, userPrompt);
          rawQuestions = robustFields.questions || [];
        }

        const questions: QuestionItem[] = rawQuestions.map((q: any, idx: number) => {
          const qContent = q.question || q.content || `Câu hỏi ${idx + 1}`;
          const answerKey = String(q.answer || q.correct_answer || q.correctAnswer || '').trim();

          let options: { content: string; isCorrect: boolean }[] = [];
          if (Array.isArray(q.options)) {
            options = q.options.map((opt: any, oIdx: number) => {
              if (typeof opt === 'string') {
                const optTrimmed = opt.trim();
                const isCorrect =
                  (answerKey && optTrimmed.toLowerCase() === answerKey.toLowerCase()) ||
                  (answerKey && optTrimmed.toLowerCase().startsWith(answerKey.toLowerCase() + '.')) ||
                  (answerKey && (
                    (answerKey === 'A' || answerKey === '1') && oIdx === 0 ||
                    (answerKey === 'B' || answerKey === '2') && oIdx === 1 ||
                    (answerKey === 'C' || answerKey === '3') && oIdx === 2 ||
                    (answerKey === 'D' || answerKey === '4') && oIdx === 3
                  )) ||
                  (!answerKey && oIdx === 0);
                return { content: optTrimmed, isCorrect };
              } else if (typeof opt === 'object' && opt !== null) {
                return {
                  content: opt.content || opt.text || opt.title || `Lựa chọn ${oIdx + 1}`,
                  isCorrect: Boolean(
                    opt.isCorrect ||
                    opt.correct ||
                    (answerKey && String(opt.content).trim().toLowerCase() === answerKey.toLowerCase())
                  ),
                };
              }
              return { content: String(opt), isCorrect: oIdx === 0 };
            });
          }

          // Ensure at least 4 options
          while (options.length < 4) {
            options.push({
              content: `Phương án ${String.fromCharCode(65 + options.length)}`,
              isCorrect: false,
            });
          }

          // Ensure at least one option is correct
          if (!options.some((o) => o.isCorrect) && options.length > 0) {
            options[0].isCorrect = true;
          }

          return {
            id: `q_${q.id || idx + 1}`,
            content: qContent,
            options,
          };
        });

        if (questions.length > 0) {
          return AiToolRegistry.createExam({
            title,
            subject: topic,
            grade,
            durationMinutes: params.durationMinutes || (questions.length <= 15 ? 30 : 60),
            questions,
            persist,
          });
        }
      }

      if (toolName === 'launch_game') {
        return AiToolRegistry.launchGame(params);
      }

      if (toolName === 'create_class') {
        return AiToolRegistry.createClass(params);
      }

      if (toolName === 'create_folder') {
        return AiToolRegistry.createFolder(params);
      }

      return AiToolRegistry.execute(toolName, params);
    } catch (err: any) {
      console.error('Error processing action payload:', err);
      return null;
    }
  }

  /**
   * Bóc tách các câu hỏi từ chuỗi JSON chưa đóng hoặc bị đứt đoạn
   */
  static processPartialExamPayload(text: string, userPrompt?: string, persist: boolean = false): ToolExecutionResult | null {
    try {
      const topic = this.extractTopicFromPrompt(userPrompt || '');
      const parsedFields = this.extractFieldsFromBrokenJson(text, userPrompt);
      if (parsedFields.questions && parsedFields.questions.length > 0) {
        const title = parsedFields.title || `Đề thi ${topic} - ${parsedFields.questions.length} câu`;
        return AiToolRegistry.createExam({
          title,
          subject: topic,
          grade: parsedFields.grade || 'Tự do',
          durationMinutes: parsedFields.questions.length <= 15 ? 30 : 60,
          questions: parsedFields.questions,
          persist,
        });
      }
    } catch {}
    return null;
  }

  /**
   * Thuật toán bóc tách JSON siêu bền bỉ (Robust Bracket-Depth Scanner)
   * Phục hồi trọn vẹn 100% từng câu hỏi trắc nghiệm kể cả khi có dấu ngoặc kép, nháy đơn hay format đứt quãng
   */
  static extractFieldsFromBrokenJson(payloadStr: string, userPrompt?: string): any {
    const titleMatch = payloadStr.match(/"title"\s*:\s*"([^"]+)"/);
    const subjectMatch = payloadStr.match(/"subject"\s*:\s*"([^"]+)"/);
    const gradeMatch = payloadStr.match(/"grade"\s*:\s*"([^"]+)"/);

    const questions: QuestionItem[] = [];

    // 1. Quét tìm tất cả các object con { ... } trong payload bằng bộ đếm ngoặc nhọn
    const rawBlocks = this.extractJsonObjects(payloadStr);

    let qIndex = 1;
    for (const block of rawBlocks) {
      // Chỉ nhận những object có chứa nội dung câu hỏi và danh sách options
      if (!block.includes('"question"') && !block.includes('"content"')) continue;
      if (!block.includes('"options"') && !block.includes('"answers"')) continue;

      const parsedQ = this.parseSingleQuestionBlock(block, qIndex);
      if (parsedQ) {
        questions.push(parsedQ);
        qIndex++;
      }
    }

    return {
      title: titleMatch ? titleMatch[1] : undefined,
      subject: subjectMatch ? subjectMatch[1] : this.extractTopicFromPrompt(userPrompt || ''),
      grade: gradeMatch ? gradeMatch[1] : this.extractGradeFromPrompt(userPrompt || ''),
      questions,
    };
  }

  /**
   * Trích xuất các JSON object độc lập {...} của từng câu hỏi
   * Hỗ trợ tìm kiếm chuẩn xác bên trong mảng "questions": [ {...}, {...} ]
   */
  private static extractJsonObjects(text: string): string[] {
    const blocks: string[] = [];

    // 1. Ưu tiên quét bên trong mảng "questions": [ ... ]
    const qArrayIdx = text.search(/"(?:questions|items|cau_hoi)"\s*:\s*\[/i);
    const scanStartIdx = qArrayIdx !== -1 ? text.indexOf('[', qArrayIdx) + 1 : 0;
    const scanText = text.substring(scanStartIdx);

    let inString = false;
    let escape = false;
    let depth = 0;
    let startIndex = -1;

    for (let i = 0; i < scanText.length; i++) {
      const char = scanText[i];

      if (char === '"' && !escape) {
        inString = !inString;
      }

      if (!inString) {
        if (char === '{') {
          if (depth === 0) {
            startIndex = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            const block = scanText.substring(startIndex, i + 1).trim();
            if (block.includes('"question"') || block.includes('"content"')) {
              blocks.push(block);
            }
            startIndex = -1;
          }
        }
      }

      if (inString && char === '\\') {
        escape = !escape;
      } else {
        escape = false;
      }
    }

    // Nếu câu hỏi cuối cùng đang stream dở
    if (depth > 0 && startIndex !== -1) {
      const partial = scanText.substring(startIndex).trim();
      if (partial.includes('"question"') || partial.includes('"content"')) {
        blocks.push(partial.endsWith('}') ? partial : partial + '}');
      }
    }

    // 2. Fallback: Nếu không tìm thấy câu nào theo mảng questions, quét toàn văn
    if (blocks.length === 0 && scanStartIdx > 0) {
      return this.extractJsonObjects(text.substring(0, qArrayIdx) + text.substring(qArrayIdx + 15));
    }

    return blocks;
  }

  /**
   * Bóc tách 1 object câu hỏi riêng biệt một cách an toàn tuyệt đối
   */
  private static parseSingleQuestionBlock(block: string, fallbackId: number): QuestionItem | null {
    try {
      // 1. Thử parse trực tiếp JSON
      const sanitized = block
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      
      try {
        const obj = JSON.parse(sanitized);
        if (obj && (obj.question || obj.content)) {
          const qText = obj.question || obj.content;
          const ans = String(obj.answer || obj.correct_answer || obj.correctAnswer || '').trim();
          let opts: { content: string; isCorrect: boolean }[] = [];

          if (Array.isArray(obj.options)) {
            opts = obj.options.map((opt: any, oIdx: number) => {
              if (typeof opt === 'string') {
                const optTrimmed = opt.trim();
                const isCorrect =
                  (ans && optTrimmed.toLowerCase() === ans.toLowerCase()) ||
                  (ans && optTrimmed.toLowerCase().startsWith(ans.toLowerCase() + '.')) ||
                  (!ans && oIdx === 0);
                return { content: optTrimmed, isCorrect };
              } else if (typeof opt === 'object' && opt !== null) {
                return {
                  content: opt.content || opt.text || `Phương án ${oIdx + 1}`,
                  isCorrect: Boolean(opt.isCorrect || opt.correct),
                };
              }
              return { content: String(opt), isCorrect: oIdx === 0 };
            });
          }

          if (opts.length > 0) {
            if (!opts.some((o) => o.isCorrect)) opts[0].isCorrect = true;
            return {
              id: `q_${obj.id || fallbackId}`,
              content: qText,
              options: opts,
            };
          }
        }
      } catch {}

      // 2. Fallback bóc tách bằng regex độc lập cho từng trường
      const idMatch = block.match(/"id"\s*:\s*(\d+)/);
      const qMatch =
        block.match(/"(?:question|content)"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:options|answers|id|answer)/i) ||
        block.match(/"(?:question|content)"\s*:\s*"([^"]+)"/i);
      
      const ansMatch =
        block.match(/"(?:answer|correct_answer|correctAnswer)"\s*:\s*"([\s\S]*?)"/i) ||
        block.match(/"(?:answer|correct_answer|correctAnswer)"\s*:\s*([A-Da-d0-9])/i);

      const optionsMatch = block.match(/"(?:options|answers)"\s*:\s*\[([\s\S]*?)\]/i);

      if (qMatch && optionsMatch) {
        const qText = qMatch[1].replace(/\\"/g, '"').trim();
        const ansText = ansMatch ? ansMatch[1].replace(/\\"/g, '"').trim() : '';
        const optionsRaw = optionsMatch[1];

        const options: { content: string; isCorrect: boolean }[] = [];

        // Trích xuất từng chuỗi trong mảng options
        const optStringRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        let oMatch: RegExpExecArray | null;
        let oIdx = 0;
        while ((oMatch = optStringRegex.exec(optionsRaw)) !== null) {
          const optContent = oMatch[1].replace(/\\"/g, '"').trim();
          const isCorrect =
            (ansText && optContent.toLowerCase() === ansText.toLowerCase()) ||
            (ansText && optContent.toLowerCase().startsWith(ansText.toLowerCase() + '.')) ||
            (ansText && (
              (ansText === 'A' || ansText === '1') && oIdx === 0 ||
              (ansText === 'B' || ansText === '2') && oIdx === 1 ||
              (ansText === 'C' || ansText === '3') && oIdx === 2 ||
              (ansText === 'D' || ansText === '4') && oIdx === 3
            )) ||
            (!ansText && oIdx === 0);

          options.push({ content: optContent, isCorrect });
          oIdx++;
        }

        if (options.length > 0) {
          if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
          return {
            id: `q_${idMatch ? idMatch[1] : fallbackId}`,
            content: qText,
            options,
          };
        }
      }
    } catch (e) {
      console.error('Error parsing single question block:', e);
    }
    return null;
  }

  /**
   * Bóc tách chủ đề chính xác từ yêu cầu người dùng
   */
  static extractTopicFromPrompt(userPrompt: string): string {
    const clean = (userPrompt || '').trim();
    if (!clean) return 'Kiến thức tổng hợp';

    const lower = clean.toLowerCase();
    if (lower.includes('liên quân') || lower.includes('lien quan') || lower.includes('aov') || lower.includes('arena of valor')) return 'Liên Quân Mobile';
    if (lower.includes('roblox')) return 'Roblox';
    if (lower.includes('minecraft')) return 'Minecraft';
    if (lower.includes('free fire') || lower.includes('ff')) return 'Free Fire';
    if (lower.includes('pubg')) return 'PUBG';
    if (lower.includes('genshin')) return 'Genshin Impact';
    if (lower.includes('gdcd') || lower.includes('giáo dục công dân') || lower.includes('kinh tế') || lower.includes('pháp luật')) return 'GDCD / KT&PL';
    if (lower.includes('tiếng anh') || lower.includes('tieng anh') || lower.includes('english')) return 'Tiếng Anh';
    if (lower.includes('ngữ văn') || lower.includes('văn học') || lower.includes('tiếng việt')) return 'Ngữ văn';
    if (lower.includes('lịch sử') || lower.includes('lich su')) return 'Lịch sử';
    if (lower.includes('địa lý') || lower.includes('dia ly')) return 'Địa lý';
    if (lower.includes('vật lý') || lower.includes('vật lí') || lower.includes('vat ly')) return 'Vật lý';
    if (lower.includes('hóa học') || lower.includes('hoa hoc')) return 'Hóa học';
    if (lower.includes('sinh học') || lower.includes('sinh hoc')) return 'Sinh học';
    if (lower.includes('tin học') || lower.includes('lập trình') || lower.includes('python') || lower.includes('javascript') || lower.includes('c++')) return 'Tin học';
    if (lower.includes('toán')) return 'Toán học';

    const topicMatch =
      clean.match(/về\s+chủ\s*đề\s+([^,0-9\n]+)/i) ||
      clean.match(/về\s+([^,0-9\n]+)/i) ||
      clean.match(/đề\s+thi\s+([^,0-9\n]+)/i) ||
      clean.match(/đề\s+([^,0-9\n]+)/i);

    if (topicMatch && topicMatch[1]) {
      const extracted = topicMatch[1].replace(/(cho tôi|giùm tôi|30 câu|\d+\s*câu)/gi, '').trim();
      if (extracted.length > 1) {
        return extracted.charAt(0).toUpperCase() + extracted.slice(1);
      }
    }

    return 'Kiến thức tổng hợp';
  }

  static extractGradeFromPrompt(userPrompt: string): string {
    const match = userPrompt.match(/lớp\s*(\d{1,2})/i) || userPrompt.match(/khối\s*(\d{1,2})/i);
    if (match) {
      return match[1];
    }
    const lower = userPrompt.toLowerCase();
    for (let i = 12; i >= 1; i--) {
      if (lower.includes(`lớp ${i}`) || lower.includes(`lop ${i}`)) return i.toString();
    }
    return 'Tự do';
  }
}
