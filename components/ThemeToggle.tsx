'use client';
import { useEffect, useState } from 'react';

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.classList.toggle('dark', isDark);
  // Ensure native controls match
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light' | null);
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const t = prefersDark ? 'dark' : 'light';
      setTheme(t);
      applyTheme(t);
    }
  }, []);

  return (
    <button
      className="button"
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('theme', next);
        applyTheme(next);
      }}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

