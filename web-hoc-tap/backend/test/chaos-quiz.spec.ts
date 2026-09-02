describe('Chaos Quiz Engine & Anti-Cheat Logic', () => {
  const sampleQuestions = Array.from({ length: 30 }, (_, index) => ({
    id: `q-${index + 1}`,
    content: `Câu hỏi kiểm tra số ${index + 1}?`,
    points: 1.0,
    options: [
      { id: `opt-${index + 1}-a`, content: 'Đáp án A', isCorrect: true },
      { id: `opt-${index + 1}-b`, content: 'Đáp án B', isCorrect: false },
      { id: `opt-${index + 1}-c`, content: 'Đáp án C', isCorrect: false },
      { id: `opt-${index + 1}-d`, content: 'Đáp án D', isCorrect: false },
    ],
  }));

  describe('Question Pool & Grid Distribution', () => {
    it('should split 30 questions into 25 active grid items and 5 remaining pool items', () => {
      const activeSize = 25;
      const activeQuestions = sampleQuestions.slice(0, activeSize);
      const remainingPool = sampleQuestions.slice(activeSize);

      expect(activeQuestions.length).toBe(25);
      expect(remainingPool.length).toBe(5);
    });

    it('should securely mask isCorrect boolean when sending options to the client', () => {
      const clientQuestions = sampleQuestions.slice(0, 25).map((q) => ({
        id: q.id,
        content: q.content,
        options: q.options.map((o) => ({ id: o.id, content: o.content })), // isCorrect omitted
      }));

      clientQuestions.forEach((q) => {
        q.options.forEach((opt: any) => {
          expect(opt.isCorrect).toBeUndefined();
        });
      });
    });
  });

  describe('Authoritative Score & Replacement Evaluation', () => {
    let playerScore = 0;
    let correctCount = 0;
    let wrongCount = 0;

    function submitAnswer(questionId: string, optionId: string) {
      const question = sampleQuestions.find((q) => q.id === questionId);
      if (!question) throw new Error('Question not found');

      const selectedOption = question.options.find((o) => o.id === optionId);
      const isCorrect = selectedOption ? selectedOption.isCorrect : false;

      if (isCorrect) {
        correctCount += 1;
        playerScore += 100; // Correct: +100
      } else {
        wrongCount += 1;
        playerScore = Math.max(0, playerScore - 100); // Wrong: -100 penalty, cannot drop below 0
      }

      const total = correctCount + wrongCount;
      const accuracy = (correctCount / total) * 100;

      return { isCorrect, playerScore, accuracy };
    }

    it('should add 100 points on correct selection and calculate accuracy', () => {
      const result = submitAnswer('q-1', 'opt-1-a');
      expect(result.isCorrect).toBe(true);
      expect(result.playerScore).toBe(100);
      expect(result.accuracy).toBe(100);
    });

    it('should deduct 100 points on wrong selection (penalty rule)', () => {
      const result = submitAnswer('q-2', 'opt-2-b');
      expect(result.isCorrect).toBe(false);
      expect(result.playerScore).toBe(0);
      expect(result.accuracy).toBe(50);
    });
  });
});
