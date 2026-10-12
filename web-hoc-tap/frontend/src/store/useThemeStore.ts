import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

interface ThemeState {
  themeMode: ThemeMode;
  theme: 'light' | 'dark';
  fontSize: FontSize;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  initialize: () => void;
}

const applyThemeToDOM = (resolvedTheme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;
  if (resolvedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const applyFontSizeToDOM = (fontSize: FontSize) => {
  if (typeof window === 'undefined') return;
  document.documentElement.dataset.fontSize = fontSize;
  const sizeMap: Record<FontSize, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px',
  };
  document.documentElement.style.fontSize = sizeMap[fontSize] || '16px';
};

const resolveEffectiveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (typeof window === 'undefined') return mode === 'dark' ? 'dark' : 'light';
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'system',
  theme: 'light',
  fontSize: 'medium',

  toggleTheme: () => {
    const current = get().theme;
    const next: 'light' | 'dark' = current === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next);
      localStorage.setItem('appearance_theme', next);
      applyThemeToDOM(next);
    }
    set({ themeMode: next, theme: next });
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      localStorage.setItem('appearance_theme', theme);
      applyThemeToDOM(theme);
    }
    set({ themeMode: theme, theme });
  },

  setThemeMode: (mode) => {
    const resolved = resolveEffectiveTheme(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('appearance_theme', mode);
      localStorage.setItem('theme', resolved);
      applyThemeToDOM(resolved);
    }
    set({ themeMode: mode, theme: resolved });
  },

  setFontSize: (size) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appearance_font_size', size);
      applyFontSizeToDOM(size);
    }
    set({ fontSize: size });
  },

  initialize: () => {
    if (typeof window === 'undefined') return;

    const savedMode = (localStorage.getItem('appearance_theme') || localStorage.getItem('theme') || 'system') as ThemeMode;
    const savedFontSize = (localStorage.getItem('appearance_font_size') || 'medium') as FontSize;

    const resolvedTheme = resolveEffectiveTheme(savedMode);
    applyThemeToDOM(resolvedTheme);
    applyFontSizeToDOM(savedFontSize);

    set({
      themeMode: savedMode,
      theme: resolvedTheme,
      fontSize: savedFontSize,
    });

    // Listen for system theme changes if mode is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (get().themeMode === 'system') {
        const nextTheme = e.matches ? 'dark' : 'light';
        applyThemeToDOM(nextTheme);
        set({ theme: nextTheme });
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }
  },
}));
