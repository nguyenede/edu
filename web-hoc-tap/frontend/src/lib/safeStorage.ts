/**
 * Safe localStorage helper that handles QuotaExceededError and prevents crashes
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`localStorage.setItem exceeded quota or failed for key "${key}". Performing pruning:`, error);
    try {
      // 1. If the value being saved is a JSON array, prune it to the most recent 15 items
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const pruned = parsed.slice(0, 15);
          localStorage.setItem(key, JSON.stringify(pruned));
          return true;
        }
      } catch {}

      // 2. Prune existing large lists in localStorage
      const listKeys = ['app_documents_files', 'custom_uploaded_files', 'chatcoi_history_sessions'];
      for (const listKey of listKeys) {
        if (listKey !== key) {
          try {
            const raw = localStorage.getItem(listKey);
            if (raw) {
              const items = JSON.parse(raw);
              if (Array.isArray(items) && items.length > 10) {
                localStorage.setItem(listKey, JSON.stringify(items.slice(0, 10)));
              }
            }
          } catch {}
        }
      }

      // 3. Retry setting after cleanup
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.warn(`Safe storage fallback for key "${key}":`, retryError);
      // As a last resort, if it's still failing, save only top 5 items
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          localStorage.setItem(key, JSON.stringify(parsed.slice(0, 5)));
          return true;
        }
      } catch {}
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
