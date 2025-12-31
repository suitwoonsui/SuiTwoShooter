'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Game } from '@/components/Game';

export function GamePageClient() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'demo' or null (premium)
  const _isDemoMode = mode === 'demo';

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="container mx-auto px-4 py-8">
        {/* Back to home link */}
        <div className="mb-4">
          <Link 
            href="/"
            className="text-[var(--color-accent1)] hover:text-[var(--color-accent1)]/80 text-sm flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Game Component */}
        <div className="w-full max-w-md mx-auto">
          <Game />
        </div>
      </div>
    </main>
  );
}
