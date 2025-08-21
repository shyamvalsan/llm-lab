import './globals.css'; import type { Metadata } from 'next'; import ThemeToggle from '@/components/ThemeToggle'; import KeyProvider from '@/components/KeyContext'; import OnboardingGate from '@/components/OnboardingGate'; import ToastProvider from '@/components/Toast';
export const metadata: Metadata = { title:'LLM Lab', description:'Simple, beautiful LLM experiments' };
export default function RootLayout({children}:{children:React.ReactNode}){
  return (<html lang="en" className="dark"><body><KeyProvider><OnboardingGate><ToastProvider>
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <a href="/" className="text-xl font-semibold">LLM Lab</a>
        <nav className="flex flex-wrap gap-3 small">
          <a href="/compare">Compare</a>
          <a href="/sampling">N-sampling</a>
          <a href="/debate">Debate</a>
          <a href="/sandbox">Sandbox</a>
          <a href="/leaderboard">Leaderboard</a>
          <a href="/usage">Usage</a>
          <a href="/settings">Settings</a>
        </nav>
        <div className="flex gap-2"><ThemeToggle/></div>
      </header>
      {children}
    </div>
  </ToastProvider></OnboardingGate></KeyProvider></body></html>);
}
