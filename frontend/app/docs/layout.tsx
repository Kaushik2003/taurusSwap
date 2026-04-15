import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import DocsSidebar from '@/components/docs/DocsSidebar';
import DocsToc from '@/components/docs/DocsToc';
import './globals.css';

export const metadata: Metadata = {
  title: 'Docs - TaurusSwap',
  description: 'Technical documentation for taurusSwap - Orbital AMM on Algorand',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-layout min-h-screen bg-background">
      {/* Header bar */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-dark-green px-4 py-3">
        <div className="max-w-[1500px] mx-auto flex items-center gap-4">
          <Link
            href="/trade"
            className="flex items-center gap-2 text-dark-green hover:underline font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to App</span>
          </Link>

          <div className="h-6 w-px bg-dark-green/30" />

          <Link href="/docs" className="flex items-center gap-2">
            <img
              src="/favicon.ico"
              alt="TaurusSwap"
              className="w-8 h-8 rounded-full border-2 border-dark-green"
            />
            <span className="font-black text-lg text-dark-green tracking-wider">
              DOCS
            </span>
          </Link>

          <div className="flex-1" />

          <button
            type="button"
            className="p-2 rounded-full border-2 border-dark-green hover:bg-dark-green/10 transition-colors"
            aria-label="Toggle dark mode"
          >
            <Sun className="w-4 h-4 text-dark-green" />
          </button>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="max-w-[1500px] mx-auto flex">
        {/* Left sidebar - desktop */}
        <div className="hidden lg:block">
          <DocsSidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="docs-content">
            {children}
          </div>
        </main>

        {/* Right rail - TOC */}
        <div className="hidden xl:block">
          <DocsToc />
        </div>
      </div>
    </div>
  );
}
