import React, { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme, setTheme } = useThemeStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, [setTheme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200/70 dark:hover:bg-[#2d2f31] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
      title="Chuyển chế độ giao diện"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};
