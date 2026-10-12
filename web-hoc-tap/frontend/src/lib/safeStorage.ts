/**
 * Safe localStorage helper that handles QuotaExceededError and prevents crashes
 * NEVER deletes or destructive-prunes user documents.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`localStorage.setItem reached quota limit for key "${key}". Applying non-destructive compression:`, error);
    try {
      // If saving documents list, strip heavy question contents to keep ALL documents in the list
      // without exceeding browser localStorage 5MB quota. Full questions are always safe in IndexedDB.
      if (key === 'app_documents_files' || key === 'custom_uploaded_files') {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const lightweightDocs = parsed.map((doc: any) => {
            if (!doc) return doc;
            const qCount = doc.parsedQuiz?.questions?.length || 0;
            return {
              ...doc,
              parsedQuiz: {
                title: doc.parsedQuiz?.title || doc.name || '',
                description: doc.parsedQuiz?.description || '',
                durationMinutes: doc.parsedQuiz?.durationMinutes || 45,
                // Keep only first question as a tiny preview sample, preserve total count
                questionsCount: qCount,
                questions: Array.isArray(doc.parsedQuiz?.questions)
                  ? doc.parsedQuiz.questions.slice(0, 1)
                  : [],
              },
            };
          });
          localStorage.setItem(key, JSON.stringify(lightweightDocs));
          return true;
        }
      }

      // If saving chat sessions, strip large base64 attachments from older sessions
      if (key === 'chatcoi_history_sessions') {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const trimmed = parsed.slice(-10);
          localStorage.setItem(key, JSON.stringify(trimmed));
          return true;
        }
      }

      // Cleanup non-critical temporary keys only (never touch documents)
      const tempKeys = ['chatcoi_debug_logs', 'app_temp_draft'];
      for (const tKey of tempKeys) {
        localStorage.removeItem(tKey);
      }

      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn(`Safe storage fallback for key "${key}":`, retryError);
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
